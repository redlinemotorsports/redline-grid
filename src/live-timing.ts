import { escapeHtml } from "./utils/html";

type LiveState = {
  timing: any;
  status: any;
  drivers: any[];
  weather: any;
  track: any;
  control: any;
  pits: any;
  selected: string | null;
  updatedAt: number;
  stale: boolean;
};

type LegacyBridge = {
  nowY: number;
  readStaticSeasonArchive: (year: number) => Promise<any>;
  jget: (path: string) => Promise<any>;
  get: (path: string) => Promise<any>;
  who: (by: Record<string, any>, number: number | string) => any;
  esc: (value: unknown) => string;
  fmtTime: (value: unknown) => string;
  teamIconColor: (team?: string, colour?: string) => string;
  driverNoBadge: (number: number | string, colour?: string) => string;
  isFavD: (driver: any) => boolean;
  getCurrentRace: () => any;
  getLapData: () => any;
};

declare global {
  interface Window {
    RedlineLegacy?: LegacyBridge;
    RedlineLiveTiming?: {
      start: () => Promise<void>;
      stop: () => void;
    };
    RedlineRadio?: {
      setContext: (context: { sessions: Array<{ session_key: number | string; session_name?: string; date_start?: string }>; meetingKey: string }) => void;
      load: () => Promise<void>;
      refresh: () => void;
    };
  }
}

const legacy = window.RedlineLegacy;
if (!legacy) {
  throw new Error("Redline Grid legacy compatibility bridge is unavailable.");
}

const { nowY, readStaticSeasonArchive, jget } = legacy;
const RT_API = "https://f1-live-api.onrender.com";
let rtTimer: ReturnType<typeof setInterval> | null = null;
let rtAuxTimer: ReturnType<typeof setInterval> | null = null;
let rtStream: EventSource | null = null;
const rtState: LiveState = {
  timing: null,
  status: null,
  drivers: [],
  weather: null,
  track: null,
  control: [],
  pits: null,
  selected: null,
  updatedAt: 0,
  stale: false,
};
const rt$ = (id: string): HTMLElement | null => document.getElementById(id);

async function rtGet(path: string): Promise<any> {
  const response = await fetch(RT_API + path, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Live timing service returned " + response.status);
  return response.json();
}

function stopLiveTiming(): void {
  if (rtTimer) clearInterval(rtTimer);
  if (rtAuxTimer) clearInterval(rtAuxTimer);
  rtTimer = rtAuxTimer = null;
  if (rtStream) {
    rtStream.close();
    rtStream = null;
  }
}

function rtText(id: string, value: unknown): void {
  const element = rt$(id);
  if (element) element.textContent = value == null || value === "" ? "—" : String(value);
}

function rtTime(value: unknown): string {
  return value == null || value === "" ? "—" : String(value);
}

function rtSector(sector: any): string {
  if (!sector) return "—";
  const className = sector.overall_best ? "rt-best" : sector.personal_best ? "rt-pb" : "";
  const segments = (sector.segments || [])
    .map((segment: any) => '<i class="' + (Number(segment.status) === 2064 ? "best" : Number(segment.status) === 2051 ? "pb" : Number(segment.status) === 2049 ? "slow" : "") + '"></i>')
    .join("");
  return '<span class="rt-sector ' + className + '">' + escapeHtml(sector.value ?? "—") +
    (segments ? '<span class="rt-mini">' + segments + "</span>" : "") + "</span>";
}

function rtTyre(value: unknown): string {
  const compound = String(value || "hard").toLowerCase();
  const className = ["soft", "medium", "hard", "intermediate", "wet"].includes(compound) ? compound : "hard";
  return '<span class="rt-tyre ' + className + '"><i></i>' + escapeHtml(value || "—") + "</span>";
}

function rtDriverMap(): Record<string, any> {
  return Object.fromEntries((rtState.drivers || []).map((driver: any) => [String(driver.driver_number), driver]));
}

function rtSelected(): void {
  const driver = (rtState.timing?.drivers || []).find((item: any) => String(item.driver_number) === String(rtState.selected));
  if (!driver) return;
  const info = rtDriverMap()[String(driver.driver_number)] || {};
  const telemetry = driver.telemetry || {};
  rtText("rtSelectedName", (driver.name || info.name || driver.acronym || "Driver") + " · " + (driver.acronym || info.acronym || driver.driver_number));
  rtText("rtSelectedTeam", driver.team || info.team || "");
  rtText("rtSpeed", telemetry.speed == null ? "—" : Math.round(Number(telemetry.speed)));
  rtText("rtRpm", telemetry.rpm == null ? "—" : Number(telemetry.rpm).toLocaleString());
  rtText("rtGear", telemetry.gear ?? "—");
  rtText("rtDrs", telemetry.drs_label || ({ 12: "ACTIVE", 10: "ARMED", 8: "ELIGIBLE", 0: "OFF" } as Record<number, string>)[Number(telemetry.drs)] || telemetry.drs || "—");
  const throttle = Math.max(0, Math.min(100, Number(telemetry.throttle) || 0));
  const brake = telemetry.brake ? 100 : 0;
  const throttleBar = rt$("rtThrottle");
  const brakeBar = rt$("rtBrake");
  if (throttleBar) throttleBar.style.width = throttle + "%";
  if (brakeBar) brakeBar.style.width = brake + "%";
  rtText("rtThrottleVal", telemetry.throttle == null ? "—" : Math.round(throttle) + "%");
  rtText("rtBrakeVal", telemetry.brake == null ? "—" : brake ? "ON" : "OFF");
  rtText("rtDriverFoot", (driver.in_pit ? "IN PIT LANE · " : "") + (driver.tyre_compound || "Tyre data unavailable") + " · " + (driver.tyre_laps ?? "—") + " laps · Stint " + (driver.stint_number ?? "—"));
}

function rtRows(): void {
  const rows = Array.isArray(rtState.timing?.drivers) ? rtState.timing.drivers.slice() : [];
  const driverMap = rtDriverMap();
  rows.sort((a: any, b: any) => (Number(a.position) || 99) - (Number(b.position) || 99));
  rtText("rtDriverCount", rows.length + " CARS");
  const body = rt$("rtRows");
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="11" class="timing-empty">No timing rows available. The feed may be between sessions or waking up.</td></tr>';
    return;
  }
  if (!rtState.selected || !rows.some((item: any) => String(item.driver_number) === String(rtState.selected))) {
    rtState.selected = String(rows[0].driver_number);
  }
  body.innerHTML = rows.map((driver: any) => {
    const number = String(driver.driver_number);
    const info = driverMap[number] || {};
    const team = driver.team || info.team || "";
    const colour = "#" + String(driver.team_colour || info.team_colour || "777777").replace("#", "");
    const sectors = driver.sectors || [];
    const flag = driver.in_pit ? "PIT" : driver.retired ? "OUT" : driver.stopped ? "STOP" : "";
    return '<tr data-rt-driver="' + escapeHtml(number) + '" class="' + (number === String(rtState.selected) ? "selected" : "") + '"><td class="rt-pos">' +
      escapeHtml(driver.position ?? "—") + (flag ? '<span class="rt-flag">' + flag + "</span>" : "") +
      '</td><td><div class="rt-driver"><i class="rt-team-line" style="background:' + escapeHtml(colour) + '"></i><span><b>' +
      escapeHtml(driver.acronym || info.acronym || ("#" + number)) + "</b><small>" + escapeHtml(driver.name || info.name || team) +
      '</small></span></div></td><td>' + escapeHtml(Number(driver.position) === 1 ? "LEADER" : rtTime(driver.gap_to_leader)) +
      "</td><td>" + escapeHtml(rtTime(driver.interval)) + "</td><td>" + escapeHtml(rtTime(driver.last_lap_time)) +
      (driver.last_lap_overall_best ? '<span class="rt-flag">FL</span>' : "") + "</td><td>" + escapeHtml(rtTime(driver.best_lap_time)) +
      "</td><td>" + rtSector(sectors[0]) + "</td><td>" + rtSector(sectors[1]) + "</td><td>" + rtSector(sectors[2]) +
      "</td><td>" + rtTyre(driver.tyre_compound) + "</td><td>" + escapeHtml(driver.tyre_laps ?? "—") + "</td></tr>";
  }).join("");
  body.querySelectorAll<HTMLTableRowElement>("tr[data-rt-driver]").forEach((row) => {
    row.addEventListener("click", () => {
      rtState.selected = row.dataset.rtDriver || null;
      rtRows();
    });
  });
  rtSelected();
}

function rtAuxRender(): void {
  const weather = rtState.weather || {};
  const track = rtState.track || {};
  const status = rtState.status || {};
  const value = (...keys: string[]): any => {
    for (const key of keys) if (weather[key] != null) return weather[key];
    return null;
  };
  const withUnit = (item: any, unit: string): string => item == null ? "—" : item + " " + unit;
  rtText("rtAir", withUnit(value("air_temperature", "air_temp"), "°C"));
  rtText("rtTrackTemp", withUnit(value("track_temperature", "track_temp"), "°C"));
  rtText("rtHumidity", withUnit(value("humidity"), "%"));
  rtText("rtWind", withUnit(value("wind_speed"), "m/s"));
  const rain = value("rainfall", "rain");
  rtText("rtRain", rain === true ? "YES" : rain === false ? "NO" : withUnit(rain, "mm"));
  const flag = track.flag || track.track_status || status.track_status || status.flag || "—";
  rtText("rtTrackStatus", typeof flag === "object" ? (flag.message || flag.status || "—") : flag);
  const pit = rt$("rtPits");
  const pitData = rtState.pits?.drivers || [];
  const timingRows = rtState.timing?.drivers || [];
  if (pit) {
    const rows = pitData.length ? pitData : timingRows;
    pit.innerHTML = rows.length ? rows.map((driver: any) => {
      const stops = driver.pit_stops || [];
      const last = stops.length ? stops[stops.length - 1] : null;
      const stint = driver.current_stint || {};
      const compound = stint.compound || driver.tyre_compound;
      const laps = stint.laps ?? driver.tyre_laps;
      return '<div class="rt-pit-row"><b>' + escapeHtml(driver.acronym || driver.name || ("#" + driver.driver_number)) +
        '</b><span>' + (driver.in_pit ? "IN PIT" : driver.pit_out ? "PIT EXIT" : (driver.total_stops ?? stops.length) + " STOPS") +
        (last && last.lap ? " · LAST L" + last.lap : "") + "</span>" + rtTyre(compound) +
        "<small>" + escapeHtml(laps ?? "—") + " LAPS</small></div>";
    }).join("") : '<div class="timing-empty">No tyre or pit-lane updates in the latest feed.</div>';
  }
  const messages = Array.isArray(rtState.control) ? rtState.control : (rtState.control?.messages || []);
  rtText("rtControlCount", messages.length + " MESSAGES");
  const box = rt$("rtControl");
  if (box) {
    box.innerHTML = messages.slice(0, 18).map((message: any) =>
      '<div class="rt-control-row"><span class="rt-control-tag">' + escapeHtml(String(message.category || message.flag || message.type || "NOTICE").toUpperCase()) +
      '</span><div><b>' + escapeHtml(message.message || message.text || message.category || "Race control update") +
      "</b><small>" + escapeHtml(message.scope || message.driver || "Official race-control message") +
      '</small></div><time class="rt-control-time">' + escapeHtml(message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "") +
      "</time></div>"
    ).join("") || '<div class="timing-empty">No race-control messages received yet.</div>';
  }
}

function rtRender(): void {
  const timing = rtState.timing || {};
  const status = rtState.status || {};
  const stamp = Date.parse(timing.timestamp || status.timestamp || "");
  const fresh = Number.isFinite(stamp) && Date.now() - stamp < 90000;
  const sessionName = timing.session || status.session?.name || status.session_name || "";
  const activeSession = Boolean(sessionName && !/no active session|between sessions|offline|none/i.test(String(sessionName)));
  const live = fresh && status.connected !== false && activeSession;
  const workspace = rt$("rtLiveWorkspace");
  const between = rt$("rtBetweenSessions");
  if (workspace) workspace.hidden = !live;
  if (between) {
    between.hidden = false;
    const hero = between.querySelector<HTMLElement>(".timing-between-main");
    if (hero) hero.hidden = live;
  }
  rtLoadLastRace();
  const bar = rt$("rtStatus");
  if (bar) {
    bar.className = "timing-statusbar " + (live ? "live" : rtState.stale ? "stale" : "");
    bar.innerHTML = '<span class="timing-state-dot"></span><b>' + (live ? "LIVE TIMING" : rtState.stale ? "DELAYED" : "LATEST SNAPSHOT") +
      "</b><span>" + (live ? "Receiving updates from the F1 timing feed" : rtState.stale ? "Connection interrupted · last successful data shown" : "No active session feed · latest available snapshot") +
      "</span><time>" + (rtState.updatedAt ? new Date(rtState.updatedAt).toLocaleTimeString() : "—") + "</time>";
  }
  rtText("rtSession", timing.session || status.session?.name || status.session_name || "No active session");
  rtText("rtLap", status.lap_count ?? status.lap ?? status.current_lap ?? status.lap_number ?? "—");
  rtText("rtFlag", rtState.track?.flag || status.flag || status.track_status || "—");
  rtText("rtConditions", (rtState.weather?.rainfall || rtState.weather?.rain) ? "WET" : "TRACK DATA");
  rtRows();
  rtAuxRender();
}

let rtLastRaceTask: Promise<void> | null = null;

function rtRenderLastRace(data: any): void {
  const race = data?.RaceTable?.Races?.[0];
  const rows = (race?.Results || []).slice().sort((a: any, b: any) => Number(a.position) - Number(b.position));
  const title = rt$("rtLastRaceName");
  const date = rt$("rtLastRaceDate");
  const podium = rt$("rtLastPodium");
  const list = rt$("rtLastList");
  const foot = rt$("rtLastFoot");
  if (!race || !rows.length) {
    if (title) title.textContent = "No completed race found";
    if (podium) podium.innerHTML = '<div class="timing-empty">The latest final classification is not available yet.</div>';
    return;
  }
  if (title) title.textContent = (race.raceName || "Grand Prix").replace(" Grand Prix", " GP");
  if (date) date.textContent = [
    race.Circuit?.circuitName,
    race.date ? new Date(race.date + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "",
  ].filter(Boolean).join(" · ");
  const name = (result: any): string => [result.Driver?.givenName, result.Driver?.familyName].filter(Boolean).join(" ") || result.Driver?.driverId || "Unknown driver";
  const team = (result: any): string => result.Constructor?.name || "—";
  const podiumRows = rows.slice(0, 3);
  if (podium) {
    podium.innerHTML = podiumRows.map((result: any, index: number) =>
      '<article class="timing-podium-place p' + (index + 1) + '"><span class="timing-podium-rank">0' + (index + 1) +
      '</span><div><b>' + escapeHtml(name(result)) + "</b><small>" + escapeHtml(team(result)) +
      "</small></div><strong>" + (result.Time?.time ? escapeHtml(result.Time.time) : result.status === "Finished" ? "FIN" : escapeHtml(result.status || "—")) +
      "</strong></article>"
    ).join("");
  }
  if (list) {
    list.innerHTML = '<div class="timing-last-list-head"><span>POSITION</span><span>DRIVER</span><span>CONSTRUCTOR</span><span>TIME / STATUS</span></div>' +
      rows.slice(3, 10).map((result: any) =>
        '<div class="timing-last-row"><b>' + String(result.position || "—").padStart(2, "0") + "</b><span>" +
        escapeHtml(name(result)) + "</span><small>" + escapeHtml(team(result)) + "</small><em>" +
        escapeHtml(result.Time?.time || result.status || "—") + "</em></div>"
      ).join("");
  }
  const fastest = rows.find((result: any) => result.FastestLap?.rank === "1" || result.FastestLap?.rank === 1);
  if (foot) foot.textContent = fastest
    ? "FASTEST LAP · " + name(fastest) + " · " + (fastest.FastestLap?.Time?.time || "time not published") + "  /  Official championship classification"
    : "Official championship classification · " + rows.length + " classified entries";
}

async function rtLoadLastRace(): Promise<void> {
  if (rtLastRaceTask) return rtLastRaceTask;
  rtLastRaceTask = (async () => {
    try {
      const now = Date.now();
      for (let year = nowY; year >= Math.max(1950, nowY - 3); year--) {
        const archive = await readStaticSeasonArchive(year);
        const races = archive.responses?.["/" + year + "/results/"]?.RaceTable?.Races || [];
        const completed = races.filter((race: any) =>
          race.date && new Date(race.date + "T23:59:59").getTime() <= now && (race.Results || []).length
        ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (completed.length) {
          rtRenderLastRace({ RaceTable: { Races: [completed[0]] } });
          return;
        }
      }
    } catch (error) {
      console.warn("Local Live Timing classification archive unavailable", error);
    }
    try {
      const data = await jget("/current/last/results/");
      rtRenderLastRace(data);
    } catch {
      const title = rt$("rtLastRaceName");
      const podium = rt$("rtLastPodium");
      const foot = rt$("rtLastFoot");
      if (title) title.textContent = "Final classification";
      if (podium) podium.innerHTML = '<div class="timing-empty">The last race result could not be retrieved right now.</div>';
      if (foot) foot.textContent = "Reconnect later to load the official finishing order.";
    }
  })();
  return rtLastRaceTask;
}

function rtApplyTiming(payload: any): void {
  if (!payload || typeof payload !== "object") return;
  const timing = Array.isArray(payload.drivers) ? payload : (payload.timing?.drivers ? payload.timing : null);
  if (!timing) return;
  rtState.timing = timing;
  rtState.updatedAt = Date.now();
  rtState.stale = false;
  rtRender();
}

async function rtLoadAux(): Promise<void> {
  const endpoints = [
    ["status", "/status"],
    ["weather", "/weather"],
    ["track", "/track"],
    ["control", "/race-control"],
    ["pits", "/pits"],
  ] as const;
  for (const [key, path] of endpoints) {
    try {
      rtState[key] = await rtGet(path);
    } catch {
      // Keep the last known value when an auxiliary endpoint is temporarily unavailable.
    }
  }
  rtState.updatedAt = Date.now();
  rtRender();
}

async function rtStartStream(): Promise<void> {
  try {
    const stream = new EventSource(RT_API + "/stream/timing");
    rtStream = stream;
    const receive = (event: Event): void => {
      try {
        rtApplyTiming(JSON.parse((event as MessageEvent).data));
      } catch {
        // Ignore malformed stream messages.
      }
    };
    stream.addEventListener("snapshot", receive);
    stream.addEventListener("data", receive);
    stream.onmessage = receive;
    stream.onerror = () => {
      if (rtStream === stream) {
        stream.close();
        rtStream = null;
        if (!rtTimer) {
          rtTimer = setInterval(async () => {
            try {
              rtApplyTiming(await rtGet("/timing"));
            } catch {
              rtState.stale = true;
              rtRender();
            }
          }, 9000);
        }
      }
    };
  } catch {
    rtTimer = setInterval(async () => {
      try {
        rtApplyTiming(await rtGet("/timing"));
      } catch {
        rtState.stale = true;
        rtRender();
      }
    }, 9000);
  }
}

async function startLiveTiming(): Promise<void> {
  if (!rt$("rtRows")) return;
  stopLiveTiming();
  rtState.stale = false;
  rtLoadLastRace();
  try {
    const [timing, drivers] = await Promise.all([rtGet("/timing"), rtGet("/drivers")]);
    rtState.drivers = Array.isArray(drivers) ? drivers : [];
    rtApplyTiming(timing);
    await rtLoadAux();
    await rtStartStream();
    rtAuxTimer = setInterval(rtLoadAux, 30000);
  } catch (error) {
    rtState.stale = true;
    const row = rt$("rtRows");
    if (row) {
      row.innerHTML = '<tr><td colspan="11" class="timing-empty">Live timing is temporarily unavailable. Refresh to try again.</td></tr>';
    }
    const bar = rt$("rtStatus");
    if (bar) {
      const message = error instanceof Error ? error.message : String(error);
      bar.className = "timing-statusbar stale";
      bar.innerHTML = '<span class="timing-state-dot"></span><b>FEED UNAVAILABLE</b><span>' + escapeHtml(message) + "</span>";
    }
  }
}

window.RedlineLiveTiming = {
  start: startLiveTiming,
  stop: stopLiveTiming,
};

rt$("rtRefresh")?.addEventListener("click", () => void startLiveTiming());
