type RadioDriver = { driver_number: number | string; full_name?: string; team_name?: string; team_colour?: string; [key: string]: any };
type RadioClip = { driver_number: number | string; date: string; recording_url: string };
type RadioSession = { session_key: number | string; session_name?: string; date_start?: string };
type RadioContext = { sessions: RadioSession[]; meetingKey: string };
type LegacyBridge = {
  get: (path: string) => Promise<any>;
  who: (by: Record<string, RadioDriver>, number: number | string) => RadioDriver;
  esc: (value: unknown) => string;
  fmtTime: (value: unknown) => string;
  teamIconColor: (team?: string, colour?: string) => string;
  driverNoBadge: (number: number | string, colour?: string) => string;
  isFavD: (driver: RadioDriver) => boolean;
  getCurrentRace: () => any;
  getLapData: () => any;
};
const legacy = window.RedlineLegacy as unknown as LegacyBridge | undefined;
if (!legacy) throw new Error("Redline Grid legacy compatibility bridge is unavailable.");
const $ = (id: string): HTMLElement | null => document.getElementById(id);
const value = (id: string): HTMLSelectElement | null => document.getElementById(id) as HTMLSelectElement | null;
let sessions: RadioSession[] = [];
let meetingKey: string | null = null;
let requestKey = "";
let allClips: RadioClip[] | null = null;
let clips: RadioClip[] = [];
let drivers: Record<string, RadioDriver> = {};
let context = { key: "", control: [] as any[], positions: [] as any[], intervals: [] as any[], stints: [] as any[] };
function setContext(next: RadioContext): void {
  sessions = next.sessions.slice();
  meetingKey = next.meetingKey;
  allClips = null;
}
function nearest(rows: any[], field: string, driver: string, timestamp: number, maxMs = 180000): any | null {
  return rows.filter((item) => String(item.driver_number) === driver && item[field] &&
    Math.abs(new Date(item[field]).getTime() - timestamp) <= maxMs)
    .sort((a, b) => Math.abs(new Date(a[field]).getTime() - timestamp) - Math.abs(new Date(b[field]).getTime() - timestamp))[0] || null;
}
async function load(): Promise<void> {
  const select = value("rsess");
  const requested = String(select?.value || "");
  if (!requested) return;
  requestKey = requested;
  const root = $("radioList");
  if (root) root.innerHTML = '<div class="state">Loading team radio for this race weekend…</div>';
  try {
    if (!Array.isArray(allClips)) {
      if (!meetingKey) throw new Error("The selected race weekend has no OpenF1 meeting key.");
      allClips = await legacy.get("/team_radio?meeting_key=" + meetingKey);
    }
    if (requestKey !== requested) return;
    const bySession = new Map<string, RadioClip[]>();
    allClips.forEach((clip) => {
      const key = String((clip as any).session_key ?? "");
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key)!.push(clip);
    });
    let session = sessions.find((item) => String(item.session_key) === requested) || { session_key: requested, session_name: "Selected session" };
    let selectedClips = bySession.get(requested) || [];
    if (!selectedClips.length) {
      const alternatives = sessions.filter((item) => (bySession.get(String(item.session_key)) || []).length)
        .sort((a, b) => new Date(b.date_start || 0).getTime() - new Date(a.date_start || 0).getTime());
      if (alternatives.length) {
        session = alternatives[0];
        selectedClips = bySession.get(String(session.session_key)) || [];
        if (select) select.value = String(session.session_key);
      }
    }
    const activeKey = String(session.session_key);
    requestKey = activeKey;
    if (!selectedClips.length) {
      clips = [];
      drivers = {};
      context = { key: activeKey, control: [], positions: [], intervals: [], stints: [] };
      draw();
      return;
    }
    const [driverRows, control, positions, intervals, stints] = await Promise.all([
      legacy.get("/drivers?session_key=" + activeKey).catch(() => []),
      legacy.get("/race_control?session_key=" + activeKey).catch(() => []),
      legacy.get("/position?session_key=" + activeKey).catch(() => []),
      legacy.get("/intervals?session_key=" + activeKey).catch(() => []),
      legacy.get("/stints?session_key=" + activeKey).catch(() => []),
    ]);
    if (requestKey !== activeKey) return;
    drivers = Object.fromEntries(driverRows.map((driver: RadioDriver) => [driver.driver_number, driver]));
    clips = selectedClips.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    context = { key: activeKey, control, positions, intervals, stints };
    draw();
  } catch (error) {
    if (requestKey === requested && root) {
      const message = error instanceof Error ? error.message : "OpenF1 is temporarily unavailable.";
      root.innerHTML = '<div class="state">Team radio could not be loaded. ' + legacy.esc(message) + ' Try changing session or refreshing.</div>';
    }
  }
}
function draw(): void {
  const root = $("radioList");
  if (!root) return;
  const race = legacy.getCurrentRace();
  const lapData = legacy.getLapData() || {};
  const list = clips.slice(0, 40);
  root.innerHTML = list.map((clip) => {
    const driver = legacy.who(drivers, clip.driver_number);
    const date = new Date(clip.date);
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const sessionLabel = (value("rsess")?.selectedOptions[0]?.textContent || "Selected session").split(" · ").pop() || "Selected session";
    const ctx = context.key === requestKey ? context : { control: [], positions: [], intervals: [], stints: [] };
    const timestamp = date.getTime();
    const driverKey = String(clip.driver_number);
    const position = nearest(ctx.positions, "date", driverKey, timestamp);
    const interval = nearest(ctx.intervals, "date", driverKey, timestamp);
    const nearby = ctx.control.filter((item: any) => Math.abs(new Date(item.date).getTime() - timestamp) <= 120000)
      .sort((a: any, b: any) => Math.abs(new Date(a.date).getTime() - timestamp) - Math.abs(new Date(b.date).getTime() - timestamp))[0];
    const driverLaps = (lapData.g?.[driverKey] || []).filter((item: any) => item.date_start && new Date(item.date_start).getTime() <= timestamp)
      .sort((a: any, b: any) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());
    const previousLap = driverLaps[0] || null;
    const lapNumber = previousLap?.lap_number;
    const stint = ctx.stints.filter((item: any) => String(item.driver_number) === driverKey && lapNumber != null &&
      Number(item.lap_start) <= lapNumber && Number(item.lap_end) >= lapNumber)
      .sort((a: any, b: any) => Number(b.stint_number) - Number(a.stint_number))[0];
    const gapValue = interval && (interval.interval != null ? interval.interval : interval.gap_to_leader);
    const gapText = gapValue == null || gapValue === "" ? "Not recorded" :
      (String(gapValue).toLowerCase().includes("lap") ? gapValue : (Number.isFinite(Number(gapValue)) ? Number(gapValue).toFixed(3) + "s" : gapValue));
    const positionText = position?.position != null ? "P" + position.position : "Not recorded";
    const lapText = typeof previousLap?.lap_duration === "number" ? legacy.fmtTime(previousLap.lap_duration) : "Not recorded";
    const tyre = stint?.compound ? String(stint.compound).replace(/_/g, " ") : "Not recorded";
    const tyreAge = stint && lapNumber != null && stint.lap_start != null ?
      (Number(stint.tyre_age_at_start || 0) + Math.max(0, lapNumber - Number(stint.lap_start))) + " laps into stint" : "";
    const raceText = nearby ? (nearby.flag ? nearby.flag + " · " : "") + String(nearby.message || "Race-control message recorded") : "No nearby message recorded";
    const summary: string[] = [];
    if (position?.position != null) summary.push("running P" + position.position);
    if (gapValue != null && gapValue !== "") summary.push("recorded gap " + gapText);
    if (previousLap && typeof previousLap.lap_duration === "number") summary.push("previous completed lap " + lapText);
    if (stint?.compound) summary.push(tyre + " tyres" + (tyreAge ? " (" + tyreAge + ")" : ""));
    const what = summary.length ? "At " + time + ", " + (driver.full_name || "this driver") + " was " + summary.join("; ") + "." :
      "There isn't enough nearby timing data to describe this moment reliably.";
    const colour = String(legacy.teamIconColor(driver.team_name, driver.team_colour) || "8B8B98").replace(/[^0-9a-f]/gi, "").slice(0, 6) || "8B8B98";
    const esc = legacy.esc;
    return '<article class="radio' + (legacy.isFavD(driver) ? " hot" : "") + '" style="--radio-team:#' + colour + '">' +
      '<div class="radio-head">' + legacy.driverNoBadge(clip.driver_number, colour) + '<div class="radio-id"><div class="radio-kicker">Original team radio</div><b>' +
      esc(driver.full_name || "Driver #" + clip.driver_number) + '</b><small>' + esc(driver.team_name || "") + ' · Driver #' + esc(clip.driver_number) +
      '</small></div><div class="radio-time">' + esc(time) + '<br><span>' + esc(date.toLocaleDateString([], { day: "numeric", month: "short" })) + '</span></div></div>' +
      '<div class="radio-audio"><div class="radio-wave" aria-hidden="true">' + Array.from({ length: 64 }, (_, index) => {
        const envelope = 0.3 + 0.7 * Math.abs(Math.sin(index * 0.17) + 0.34 * Math.sin(index * 0.053));
        const height = Math.max(3, Math.min(15, Math.round(3 + envelope * (3 + ((index * 7 + index * index) % 7)))));
        return '<i style="height:' + height + 'px"></i>';
      }).join("") + '</div><audio controls preload="none" src="' + esc(clip.recording_url) + '">Your browser does not support audio playback.</audio></div>' +
      '<section class="radio-context"><div class="context-head"><b>REDLINE TEAM RADIO CONTEXT</b><small>' +
      esc(race?.country_name ? race.country_name + " Grand Prix" : "Race weekend") + " · " + esc(sessionLabel) + " · " + (lapNumber != null ? "Lap " + lapNumber : "Lap not available") +
      '</small></div><div class="context-grid">' +
      '<div class="context-card"><small>Race Control</small><b>' + esc(nearby?.flag || "Session notes") + '</b><p>' + esc(raceText) + '</p></div>' +
      '<div class="context-card"><small>Driver Performance</small><b>' + esc(positionText) + '</b><p>' +
      esc(interval?.interval != null ? "Interval to car ahead: " + gapText : interval?.gap_to_leader != null ? "Gap to leader: " + gapText : "Position gap not recorded nearby") + '</p></div>' +
      '<div class="context-card"><small>Previous Lap</small><b>' + esc(lapText) + '</b><p>' +
      (previousLap && lapNumber != null ? "Lap " + lapNumber + (previousLap.is_pit_out_lap ? " · pit-out lap" : "") : "No completed lap time found before this clip") + '</p></div>' +
      '<div class="context-card"><small>Tyre Stint</small><b>' + esc(tyre) + '</b><p>' + esc(tyreAge || "Stint detail not recorded for this lap") + '</p></div>' +
      '</div><div class="context-summary"><b>What was happening?</b><p>' + esc(what) + " " +
      (nearby ? "Race control: " + esc(String(nearby.message || "message recorded")) + "." : "") + '</p></div>' +
      '<small class="context-foot">Original audio from the session. Context is based on recorded timing and race-control data near this timestamp; no AI transcript or invented quotes.</small></section></article>';
  }).join("") || '<div class="state">No original team-radio recordings were returned for any completed session in this race weekend.</div>';
}
window.RedlineRadio = { setContext, load };
