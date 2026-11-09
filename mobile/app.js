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

const screens = {
  home: () => `
    <section>
      <p class="eyebrow">THE RACING SEASON, DECODED</p>
      <h1 class="page-title">Your race<br>weekend starts here.</h1>
      <p class="page-subtitle">The details behind every lap. One independent motorsport companion.</p>
      <article class="hero">
        <span class="hero-kicker">REDLINE GRID / 2026</span>
        <h2>Built for<br>the race.</h2>
        <p class="hero-copy">Race schedules, results, driver stories and the numbers that make the difference.</p>
        <div class="hero-foot"><span class="status-pill">SEASON HUB</span><a class="arrow-link" href="#schedule" data-go="schedule">Explore schedule <span>↗</span></a></div>
      </article>
      <div class="section-head"><h3>Explore the grid</h3><small>YOUR DASHBOARD</small></div>
      <div class="feature-grid">
        <button class="feature-card" data-go="schedule"><span class="feature-icon">${icons.calendar}</span><span><strong>Race schedule</strong><small>Every round, every session</small></span></button>
        <button class="feature-card" data-go="live"><span class="feature-icon">${icons.radio}</span><span><strong>Live centre</strong><small>Session status and timing</small></span></button>
        <button class="feature-card" data-go="results"><span class="feature-icon">${icons.trophy}</span><span><strong>Race results</strong><small>Results and championship</small></span></button>
        <button class="feature-card" data-go="more"><span class="feature-icon">${icons.chart}</span><span><strong>Driver insights</strong><small>Stats and telemetry</small></span></button>
      </div>
      <div class="section-head"><h3>Made for the details</h3><small>INDEPENDENT MOTORSPORT</small></div>
      <div class="info-card"><p><strong>One grid. Every angle.</strong><br>This mobile experience is being built around quick access, readable race data and a calmer, more focused way to follow the championship.</p></div>
    </section>`,
  schedule: () => `
    <section>
      <p class="eyebrow">THE ROAD AHEAD</p><h1 class="page-title">Race<br>schedule.</h1>
      <p class="page-subtitle">A race-weekend-first view of the season calendar.</p>
      <div class="empty-state"><div class="empty-mark">${icons.calendar}</div><h2>Calendar integration next</h2><p>The mobile schedule screen is ready for the existing season and session data. Live calendar content will be connected in the next integration pass.</p></div>
      <div class="section-head"><h3>What belongs here</h3><small>WEEKEND VIEW</small></div>
      <div class="list-stack">
        <div class="list-row"><span class="row-icon">${icons.flag}</span><span class="row-copy"><strong>Grand Prix weekends</strong><small>Round, circuit and local dates</small></span><span class="chevron">›</span></div>
        <div class="list-row"><span class="row-icon">${icons.calendar}</span><span class="row-copy"><strong>Session timetable</strong><small>Practice, qualifying and race</small></span><span class="chevron">›</span></div>
      </div>
    </section>`,
  live: () => `
    <section>
      <p class="eyebrow">TRACKSIDE, WITHOUT THE NOISE</p><h1 class="page-title">Live<br>centre.</h1>
      <p class="page-subtitle">Session status and timing, with a clear home when the lights go out.</p>
      <div class="empty-state"><div class="empty-mark">${icons.radio}</div><h2>No session connected</h2><p>Live timing will appear here when a supported session is available. We'll keep the screen useful and honest between race weekends.</p></div>
      <div class="section-head"><h3>Live centre</h3><small>COMING INTO FOCUS</small></div>
      <div class="info-card"><p>Planned modules include session status, track conditions, timing tower and a quick route into deeper telemetry.</p></div>
    </section>`,
  results: () => `
    <section>
      <p class="eyebrow">EVERY SESSION LEAVES A STORY</p><h1 class="page-title">Results &<br>championship.</h1>
      <p class="page-subtitle">Race classifications, driver performance and the championship picture.</p>
      <div class="empty-state"><div class="empty-mark">${icons.trophy}</div><h2>Results are up next</h2><p>The results experience will connect to Redline's existing race archive and championship data. No placeholder classifications or invented numbers.</p></div>
      <div class="section-head"><h3>Explore results</h3><small>RACE HISTORY</small></div>
      <div class="list-stack">
        <div class="list-row"><span class="row-icon">${icons.flag}</span><span class="row-copy"><strong>Grand Prix results</strong><small>Race and qualifying classifications</small></span><span class="chevron">›</span></div>
        <div class="list-row"><span class="row-icon">${icons.trophy}</span><span class="row-copy"><strong>Championship</strong><small>Drivers and constructors</small></span><span class="chevron">›</span></div>
      </div>
    </section>`,
  more: () => `
    <section>
      <p class="eyebrow">GO DEEPER</p><h1 class="page-title">The rest<br>of the grid.</h1>
      <p class="page-subtitle">The tools, people and details behind the racing.</p>
      <div class="list-stack">
        <button class="list-row"><span class="row-icon">${icons.users}</span><span class="row-copy"><strong>Driver statistics</strong><small>Season overview and head-to-head</small></span><span class="chevron">›</span></button>
        <button class="list-row"><span class="row-icon">${icons.chart}</span><span class="row-copy"><strong>Telemetry</strong><small>Lap pace and session analysis</small></span><span class="chevron">›</span></button>
        <button class="list-row"><span class="row-icon">${icons.circuit}</span><span class="row-copy"><strong>Circuit guide</strong><small>Track layouts and characteristics</small></span><span class="chevron">›</span></button>
        <button class="list-row"><span class="row-icon">${icons.book}</span><span class="row-copy"><strong>Newsroom</strong><small>Independent motorsport sources</small></span><span class="chevron">›</span></button>
        <button class="list-row" id="about-app"><span class="row-icon">${icons.settings}</span><span class="row-copy"><strong>About Redline Grid</strong><small>Independent. Unofficial. Built for fans.</small></span><span class="chevron">›</span></button>
      </div>
      <div class="divider"></div><p class="muted mono" style="font-size:9px;letter-spacing:.08em">REDLINE GRID MOBILE · BUILD 0.1.0</p>
    </section>`
};

const content = document.querySelector("#app-content");
const tabs = [...document.querySelectorAll(".tab")];
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
render(location.hash.slice(1) || "home", false);
