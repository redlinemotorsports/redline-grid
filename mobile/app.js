const icons = {
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0"/></svg>',
  radio: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0Zm0 2H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h17M8 15l3-4 3 2 5-7"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m2-9a3 3 0 1 0 0-6m1 9a5 5 0 0 1 3 5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7.2 7.2 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7.2 7.2 0 0 1 0 1.8Z" transform="translate(-1 -1)"/></svg>',
  circuit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h6l3 4-2 4 5 2-2 6H8l-3-4 3-4-3-4Z"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Zm0 0V22"/></svg>'
};

let seasonData = null;
let dataError = false;
const content = document.querySelector("#app-content");
const tabs = [...document.querySelectorAll(".tab")];

const fmtDate = (value, options = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat(undefined, options).format(new Date(value + "T12:00:00"));
const fmtSession = (session) => {
  if (!session?.date) return "";
  const date = new Date(session.date + "T" + (session.time || "00:00:00Z"));
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};
const raceList = () => seasonData?.responses?.["/2026/races/"]?.RaceTable?.Races || [];
const resultList = () => seasonData?.responses?.["/2026/results/"]?.RaceTable?.Races || [];
const driverStandings = () => seasonData?.responses?.["/2026/driverstandings/"]?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
const constructorStandings = () => seasonData?.responses?.["/2026/constructorstandings/"]?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
const upcomingRaces = () => raceList().filter(r => new Date(r.date + "T23:59:59") >= new Date());
const latestRace = () => resultList().slice().sort((a,b) => b.date.localeCompare(a.date))[0];
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const sessionRows = race => ["FirstPractice","SecondPractice","ThirdPractice","SprintQualifying","Sprint","Qualifying"].filter(k => race[k]).map(k => {
  const names = { FirstPractice:"Practice 1", SecondPractice:"Practice 2", ThirdPractice:"Practice 3", SprintQualifying:"Sprint qualifying", Sprint:"Sprint", Qualifying:"Qualifying" };
  return { name:names[k], date:fmtSession(race[k]) };
});

function homeScreen() {
  const next = upcomingRaces()[0];
  const latest = latestRace();
  const winner = latest?.Results?.[0];
  const leader = driverStandings()[0];
  return `
    <section>
      <p class="eyebrow">THE RACING SEASON, DECODED</p>
      <h1 class="page-title">Your race<br>weekend starts here.</h1>
      <p class="page-subtitle">The details behind every lap. One independent motorsport companion.</p>
      <article class="hero">
        <span class="hero-kicker">REDLINE GRID / 2026 · ROUND ${next?.round || "—"}</span>
        <h2>${next ? safe(next.raceName.replace(" Grand Prix","")) : "Season complete"}<br>${next ? "Grand Prix" : "2026"}</h2>
        <p class="hero-copy">${next ? safe(next.Circuit.circuitName) + " · " + safe(next.Circuit.Location.locality) : "All 23 rounds of the 2026 season."}</p>
        <div class="hero-foot"><span class="status-pill">${next ? "NEXT ROUND · " + fmtDate(next.date, {day:"numeric",month:"short"}) : "SEASON HUB"}</span><a class="arrow-link" href="#schedule" data-go="schedule">Weekend guide <span>↗</span></a></div>
      </article>
      <div class="section-head"><h3>Latest on track</h3><small>${latest ? "ROUND " + latest.round + " · " + fmtDate(latest.date) : "2026 SEASON"}</small></div>
      ${winner ? `<article class="result-feature"><div class="result-feature-top"><span class="result-label">LATEST RACE WINNER</span><span class="result-round">R${latest.round}</span></div><div class="winner-name">${safe(winner.Driver.givenName)} <b>${safe(winner.Driver.familyName)}</b></div><div class="winner-team">${safe(winner.Constructor.name)} · ${safe(latest.raceName)}</div><div class="podium-strip">${latest.Results.slice(0,3).map((r,i)=>`<div><small>P${i+1}</small><strong>${safe(r.Driver.code)}</strong><span>${safe(r.Constructor.name)}</span></div>`).join("")}</div><button class="text-action" data-go="results">Full classification <span>↗</span></button></article>` : `<div class="info-card"><p>Race results will appear here once the season archive is available.</p></div>`}
      <div class="section-head"><h3>Championship pulse</h3><small>AFTER ROUND ${seasonData?.responses?.["/2026/driverstandings/"]?.StandingsTable?.round || "—"}</small></div>
      ${leader ? `<div class="leader-card"><div><small>DRIVER LEADER</small><strong>${safe(leader.Driver.givenName)} ${safe(leader.Driver.familyName)}</strong><span>${safe(leader.Constructors?.[0]?.name || "")} · ${leader.wins} wins</span></div><b>${leader.points}<small>PTS</small></b></div>` : ""}
      <div class="section-head"><h3>Explore the grid</h3><small>YOUR DASHBOARD</small></div>
      <div class="feature-grid">
        <button class="feature-card" data-go="schedule"><span class="feature-icon">${icons.calendar}</span><span><strong>Race schedule</strong><small>Every round, every session</small></span></button>
        <button class="feature-card" data-go="live"><span class="feature-icon">${icons.radio}</span><span><strong>Live centre</strong><small>Session status and timing</small></span></button>
        <button class="feature-card" data-go="results"><span class="feature-icon">${icons.trophy}</span><span><strong>Race results</strong><small>Results and championship</small></span></button>
        <button class="feature-card" data-go="more"><span class="feature-icon">${icons.chart}</span><span><strong>Driver insights</strong><small>Stats and telemetry</small></span></button>
      </div>
      <p class="data-note">SEASON DATA · ${dataError ? "OFFLINE / UNAVAILABLE" : "2026 ARCHIVE CONNECTED"}</p>
    </section>`;
}

function scheduleScreen() {
  const next = upcomingRaces();
  const previous = resultList().slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
  return `<section>
    <p class="eyebrow">THE ROAD AHEAD</p><h1 class="page-title">Race<br>schedule.</h1>
    <p class="page-subtitle">Every round and session, shown in your device's local time.</p>
    ${next[0] ? `<div class="section-head"><h3>Next up</h3><small>ROUND ${next[0].round} OF 23</small></div><article class="next-race-card"><span class="result-label">UPCOMING GRAND PRIX</span><h2>${safe(next[0].raceName)}</h2><p>${safe(next[0].Circuit.circuitName)} · ${safe(next[0].Circuit.Location.locality)}, ${safe(next[0].Circuit.Location.country)}</p><div class="next-race-date">${fmtDate(next[0].date,{weekday:"long",day:"numeric",month:"long"})}</div><div class="session-list">${sessionRows(next[0]).map(s=>`<div><span>${s.name}</span><b>${s.date}</b></div>`).join("")}<div><span>Race</span><b>${fmtSession({date:next[0].date,time:next[0].time})}</b></div></div></article>` : `<div class="empty-state"><div class="empty-mark">${icons.flag}</div><h2>That's the season</h2><p>All scheduled 2026 rounds have been completed.</p></div>`}
    <div class="section-head"><h3>Remaining rounds</h3><small>${next.length} TO GO</small></div>
    <div class="race-list">${next.map(r=>`<article class="race-row"><div class="race-round">R${r.round}</div><div class="race-info"><strong>${safe(r.raceName)}</strong><small>${safe(r.Circuit.Location.locality)} · ${safe(r.Circuit.circuitName)}</small></div><time>${fmtDate(r.date)}</time></article>`).join("") || '<p class="muted">No upcoming rounds in the current calendar.</p>'}</div>
    ${previous ? `<div class="section-head"><h3>Last completed</h3><small>ROUND ${previous.round}</small></div><div class="info-card"><p><strong>${safe(previous.raceName)}</strong><br>${fmtDate(previous.date,{day:"numeric",month:"long",year:"numeric"})} · Winner: ${safe(previous.Results?.[0]?.Driver?.givenName)} ${safe(previous.Results?.[0]?.Driver?.familyName)}</p></div>` : ""}
  </section>`;
}

function resultsScreen() {
  const latest = latestRace();
  const drivers = driverStandings();
  const teams = constructorStandings();
  return `<section>
    <p class="eyebrow">EVERY SESSION LEAVES A STORY</p><h1 class="page-title">Results &<br>championship.</h1>
    <p class="page-subtitle">The latest classification and championship standings from the 2026 archive.</p>
    ${latest ? `<div class="section-head"><h3>${safe(latest.raceName)}</h3><small>ROUND ${latest.round} · ${fmtDate(latest.date)}</small></div><div class="classification">${latest.Results.slice(0,10).map(r=>`<div class="classification-row"><b class="class-pos">${r.position}</b><div class="class-driver"><strong>${safe(r.Driver.givenName)} ${safe(r.Driver.familyName)}</strong><small>${safe(r.Constructor.name)}</small></div><b class="class-points">${r.points}<small>PTS</small></b></div>`).join("")}</div>` : '<div class="empty-state"><h2>No results available</h2><p>Race classifications will appear here when available in the archive.</p></div>'}
    <div class="section-head"><h3>Drivers' championship</h3><small>AFTER ROUND ${seasonData?.responses?.["/2026/driverstandings/"]?.StandingsTable?.round || "—"}</small></div>
    <div class="standings-list">${drivers.slice(0,10).map(d=>`<div class="standing-row"><b>${d.position}</b><span><strong>${safe(d.Driver.givenName)} ${safe(d.Driver.familyName)}</strong><small>${safe(d.Constructors?.[0]?.name || "")}</small></span><em>${d.points} <small>PTS</small></em></div>`).join("")}</div>
    <div class="section-head"><h3>Constructors</h3><small>TEAM STANDINGS</small></div>
    <div class="standings-list">${teams.map(t=>`<div class="standing-row"><b>${t.position}</b><span><strong>${safe(t.Constructor.name)}</strong><small>${t.wins} wins</small></span><em>${t.points} <small>PTS</small></em></div>`).join("")}</div>
  </section>`;
}

const screens = {
  home: homeScreen,
  schedule: scheduleScreen,
  live: () => `<section><p class="eyebrow">TRACKSIDE, WITHOUT THE NOISE</p><h1 class="page-title">Live<br>centre.</h1><p class="page-subtitle">Session status and timing, with a clear home when the lights go out.</p><div class="empty-state"><div class="empty-mark">${icons.radio}</div><h2>No session connected</h2><p>There is no live session right now. The live centre will switch to session mode when supported timing data is available.</p></div><div class="section-head"><h3>Between race weekends</h3><small>LAST UPDATE</small></div><div class="info-card"><p>Latest completed round: <strong>${safe(latestRace()?.raceName || "No result available")}</strong>. Browse the classification and championship from Results.</p></div></section>`,
  results: resultsScreen,
  more: () => `<section><p class="eyebrow">GO DEEPER</p><h1 class="page-title">The rest<br>of the grid.</h1><p class="page-subtitle">The tools, people and details behind the racing.</p><div class="list-stack"><button class="list-row"><span class="row-icon">${icons.users}</span><span class="row-copy"><strong>Driver statistics</strong><small>Season overview and head-to-head</small></span><span class="chevron">›</span></button><button class="list-row"><span class="row-icon">${icons.chart}</span><span class="row-copy"><strong>Telemetry</strong><small>Lap pace and session analysis</small></span><span class="chevron">›</span></button><button class="list-row"><span class="row-icon">${icons.circuit}</span><span class="row-copy"><strong>Circuit guide</strong><small>Track layouts and characteristics</small></span><span class="chevron">›</span></button><button class="list-row"><span class="row-icon">${icons.book}</span><span class="row-copy"><strong>Newsroom</strong><small>Independent motorsport sources</small></span><span class="chevron">›</span></button><div class="divider"></div><p class="muted mono" style="font-size:9px;letter-spacing:.08em">REDLINE GRID MOBILE · BUILD 0.2.0</p></div></section>`
};

let activeTab = "home";
function render(tab, push = true) {
  if (!screens[tab]) tab = "home";
  activeTab = tab;
  content.innerHTML = screens[tab]();
  tabs.forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (push) history.pushState({ tab }, "", `#${tab}`);
  window.scrollTo({ top: 0, behavior: "instant" });
  content.focus({ preventScroll: true });
}
tabs.forEach(button => button.addEventListener("click", () => render(button.dataset.tab)));
document.addEventListener("click", event => {
  const target = event.target.closest("[data-go]");
  if (target) render(target.dataset.go);
});
document.querySelector("#settings-shortcut").addEventListener("click", () => render("more"));
window.addEventListener("popstate", () => render(location.hash.slice(1) || "home", false));

async function start() {
  try {
    const response = await fetch("./data/2026.json");
    if (!response.ok) throw new Error("Season archive unavailable");
    seasonData = await response.json();
  } catch (error) {
    dataError = true;
  }
  render(location.hash.slice(1) || "home", false);
}
render(location.hash.slice(1) || "home", false);
start();
