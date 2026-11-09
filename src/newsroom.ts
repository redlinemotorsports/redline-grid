import { escapeHtml } from "./utils/html";

type NewsItem = {
  title: string;
  description: string;
  link: string;
  image: string;
  source: string;
  published: string;
  dateLabel?: string;
  category?: string;
};
type NewsFeed = { name: string; url: string };
type NewsFilter = "ALL" | "RACE" | "DRIVERS" | "TEAMS" | "TECH";

declare global {
  interface Window {
    newsroomView?: string;
    RedlineNewsroom?: {
      load: (force?: boolean) => Promise<void>;
      render: () => void;
      setView: (view: string) => void;
    };
  }
}

const $ = (id: string): HTMLElement | null => document.getElementById(id);
const NEWS_FEEDS: NewsFeed[] = [
  { name: "Motorsport.com", url: "https://www.motorsport.com/rss/f1/news/" },
  { name: "Autosport", url: "https://www.autosport.com/rss/feed/f1" },
];
let newsroomItems: NewsItem[] = [];
let newsroomFilter: NewsFilter = "ALL";
let newsroomLoading = false;
const newsText = (value: unknown): string => {
  const doc = new DOMParser().parseFromString(String(value || ""), "text/html");
  return (doc.body.textContent || "").replace(/\\s+/g, " ").trim();
};
const newsSafeUrl = (value: unknown): string => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};
const newsCategory = (item: NewsItem): NewsFilter => {
  const text = (item.title + " " + item.description).toLowerCase();
  if (/upgrade|technical|floor|wing|power unit|engine|regulation|chassis|aero/.test(text)) return "TECH";
  if (/driver|verstappen|hamilton|leclerc|norris|piastri|russell|alonso|sainz|antonelli|hadjar|bearman|bottas|lawson|gasly|ocon|hulkenberg|tsunoda|albon/.test(text)) return "DRIVERS";
  if (/team|ferrari|mercedes|mclaren|red bull|williams|haas|alpine|audi|cadillac|racing bulls/.test(text)) return "TEAMS";
  return "RACE";
};
const newsFetchTimed = async (url: string, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    window.clearTimeout(timer);
  }
};
function newsCard(item: NewsItem, featured = false): string {
  const image = newsSafeUrl(item.image);
  const url = newsSafeUrl(item.link);
  const media = image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy">' : "";
  const meta = '<div class="newsroom-meta"><span>' + escapeHtml(item.source) + '</span><span>·</span><span>' + escapeHtml(item.dateLabel || "LATEST") + "</span></div>";
  if (featured) {
    const summary = newsText(item.description) || item.title;
    const excerpt = summary.length > 190 ? summary.slice(0, 187).replace(/\\s+\\S*$/, "") + "…" : summary;
    return '<a class="newsroom-feature" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer"><div class="newsroom-feature-media">' + media + '</div><div class="newsroom-feature-copy"><span class="newsroom-kicker">LEAD STORY · ' + escapeHtml(item.category || "RACE") + '</span><h3>' + escapeHtml(item.title) + '</h3><p class="newsroom-excerpt newsroom-feature-excerpt">' + escapeHtml(excerpt) + '</p>' + meta + '<span class="newsroom-open">READ ORIGINAL STORY ↗</span></div></a>';
  }
  const summary = newsText(item.description) || item.title;
  const excerpt = summary.length > 145 ? summary.slice(0, 142).replace(/\\s+\\S*$/, "") + "…" : summary;
  return '<a class="newsroom-card" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer"><div class="newsroom-card-media">' + media + '</div><div class="newsroom-card-copy"><span class="newsroom-kicker">' + escapeHtml(item.category || "RACE") + '</span><h3>' + escapeHtml(item.title) + '</h3><p class="newsroom-excerpt">' + escapeHtml(excerpt) + '</p>' + meta + "</div></a>";
}
function newsroomBriefing(items: NewsItem[]): string {
  const picks = items.slice(0, 3);
  if (!picks.length) return "";
  const rows = picks.map((item, index) => {
    const url = newsSafeUrl(item.link);
    const summary = newsText(item.description) || item.title;
    const excerpt = summary.length > 172 ? summary.slice(0, 169).replace(/\\s+\\S*$/, "") + "…" : summary;
    return '<a class="newsroom-briefing-row" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer"><span class="newsroom-briefing-index">0' + (index + 1) + '</span><span class="newsroom-briefing-copy"><span class="newsroom-kicker">' + escapeHtml(item.category || "RACE") + " / " + escapeHtml(item.source) + '</span><b>' + escapeHtml(item.title) + '</b><small>' + escapeHtml(excerpt) + '</small></span><span class="newsroom-briefing-arrow" aria-hidden="true">↗</span></a>';
  }).join("");
  return '<section class="newsroom-briefing" aria-label="Paddock briefing"><div class="newsroom-briefing-head"><div><span class="newsroom-kicker">DAILY READOUT</span><h3>Paddock briefing</h3></div><span class="newsroom-briefing-count">03 / KEY DEVELOPMENTS</span></div><div class="newsroom-briefing-list">' + rows + "</div></section>";
}
function newroomCounts(): Record<string, number> {
  return newsroomItems.reduce<Record<string, number>>((counts, item) => {
    const category = item.category || "RACE";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
}
function renderNewsroom(): void {
  const root = $("newsroomContent");
  if (!root) return;
  const labels: Record<NewsFilter, string> = { ALL: "ALL", RACE: "RACE WEEKEND", DRIVERS: "DRIVERS", TEAMS: "TEAMS", TECH: "TECHNICAL" };
  const counts = newroomCounts();
  if (newsroomFilter !== "ALL" && !counts[newsroomFilter]) newsroomFilter = "ALL";
  const filters = (["ALL", "RACE", "DRIVERS", "TEAMS", "TECH"] as NewsFilter[]).filter(filter => filter === "ALL" || counts[filter] > 0);
  const visible = newsroomFilter === "ALL" ? newsroomItems : newsroomItems.filter(item => item.category === newsroomFilter);
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const filterHtml = filters.map(filter => '<button type="button" class="newsroom-filter" data-news-filter="' + filter + '" aria-pressed="' + (filter === newsroomFilter) + '">' + labels[filter] + '<span class="newsroom-filter-count">' + (filter === "ALL" ? newsroomItems.length : counts[filter]) + "</span></button>").join("");
  const featured = visible[0];
  const cards = visible.slice(1, 36);
  const active = window.newsroomView || "headlines";
  const headlines = '<div class="newsroom-body" data-newsroom-panel="headlines"' + (active === "headlines" ? "" : " hidden") + '><div class="newsroom-toolbar"><div class="newsroom-filters" role="group" aria-label="Filter news">' + filterHtml + '</div><span class="newsroom-updated">SHOWING ' + visible.length + " STORIES · UPDATED " + stamp + "</span></div>" +
    (featured ? newsCard(featured, true) + (cards.length ? '<div class="newsroom-list-label"><span>MORE FROM THE PADDOCK</span><small>' + cards.length + ' STORIES</small></div><div class="newsroom-grid">' + cards.map(item => newsCard(item)).join("") + "</div>" : "") : '<div class="newsroom-empty">No stories are available in this category yet.</div>') +
    '<div class="newsroom-sources"><span>HEADLINES VIA PUBLISHER RSS · OPEN ORIGINAL ARTICLES</span><span><a href="https://www.motorsport.com/rss/f1/news/" target="_blank" rel="noopener">MOTORSPORT.COM</a> · <a href="https://www.autosport.com/rss/feed/f1" target="_blank" rel="noopener">AUTOSPORT</a></span></div></div>';
  const fia = '<section class="newsroom-fia-panel" data-newsroom-panel="fia"' + (active === "fia" ? "" : " hidden") + '><div class="newsroom-fia-heading"><div><span class="newsroom-kicker">FIA / OFFICIAL DOCUMENT ROOM</span><h3>Latest event documents</h3><p>Primary-source PDFs from the 2026 São Paulo Grand Prix. Open a document directly from the FIA archive.</p></div><span class="newsroom-fia-index">2026 SEASON<br>ROUND 21 / SÃO PAULO</span></div><div class="newsroom-fia-list"><a class="newsroom-fia-doc" href="https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_final_race_classification.pdf" target="_blank" rel="noopener noreferrer"><div class="newsroom-fia-doc-top"><span>DOC 81</span><span>CLASSIFICATION</span></div><div class="newsroom-fia-doc-copy"><b>Final Race Classification</b><small>Official finishing order, race times, gaps, fastest lap and points.</small></div><div class="newsroom-fia-doc-foot"><span>08 NOV 2026</span><strong>VIEW FIA PDF ↗</strong></div></a><a class="newsroom-fia-doc" href="https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_infringement_-_car_16_-_causing_a_collision.pdf" target="_blank" rel="noopener noreferrer"><div class="newsroom-fia-doc-top"><span>DOC 79</span><span>STEWARDS / DECISION</span></div><div class="newsroom-fia-doc-copy"><b>Car 16 — Causing a Collision</b><small>Stewards’ decision following the contact involving Charles Leclerc and Liam Lawson.</small></div><div class="newsroom-fia-doc-foot"><span>08 NOV 2026</span><strong>VIEW FIA PDF ↗</strong></div></a><a class="newsroom-fia-doc" href="https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_infringement_-_car_87_-_unsafe_release.pdf" target="_blank" rel="noopener noreferrer"><div class="newsroom-fia-doc-top"><span>DOC 78</span><span>STEWARDS / DECISION</span></div><div class="newsroom-fia-doc-copy"><b>Car 87 — Unsafe Release</b><small>Stewards’ ruling and five-second penalty for the pit-lane release incident.</small></div><div class="newsroom-fia-doc-foot"><span>08 NOV 2026</span><strong>VIEW FIA PDF ↗</strong></div></a><a class="newsroom-fia-doc" href="https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_race_scrutineering.pdf" target="_blank" rel="noopener noreferrer"><div class="newsroom-fia-doc-top"><span>DOC 77</span><span>TECHNICAL / SCRUTINEERING</span></div><div class="newsroom-fia-doc-copy"><b>Race Scrutineering Report</b><small>Technical Delegate’s report covering inspections and regulatory compliance checks.</small></div><div class="newsroom-fia-doc-foot"><span>08 NOV 2026</span><strong>VIEW FIA PDF ↗</strong></div></a></div><div class="newsroom-fia-archive"><div><span>FIA DOCUMENT ARCHIVE</span><b>Looking for an earlier Grand Prix?</b><small>Browse the full Formula One document archive, organised by event and publication.</small></div><a href="https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season" target="_blank" rel="noopener noreferrer">BROWSE PREVIOUS RACE DOCUMENTS <span aria-hidden="true">↗</span></a></div><p class="newsroom-fia-note">DIRECT FIA PDF LINKS · Additional event documents and previous rounds are hosted by the FIA.</p></section>';
  root.innerHTML = headlines + fia;
  root.querySelectorAll<HTMLButtonElement>("[data-news-filter]").forEach(button => button.addEventListener("click", () => {
    newsroomFilter = button.dataset.newsFilter as NewsFilter;
    renderNewsroom();
  }));
}
async function loadNewsroom(force = false): Promise<void> {
  const root = $("newsroomContent");
  if (!root || newsroomLoading) return;
  newsroomLoading = true;
  if (!force && !newsroomItems.length) {
    try {
      const cached = JSON.parse(localStorage.getItem("redline-news-cache-v1") || "null") as { items?: NewsItem[] } | null;
      if (cached?.items?.length) {
        newsroomItems = cached.items;
        renderNewsroom();
      }
    } catch { /* Ignore malformed or unavailable local cache. */ }
  }
  if (newsroomItems.length && !force) renderNewsroom();
  else root.innerHTML = '<div class="state">Loading the latest paddock stories…</div>';
  try {
    const results = await Promise.allSettled(NEWS_FEEDS.map(async feed => {
      const endpoint = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
      const response = await newsFetchTimed(endpoint, 10000);
      if (!response.ok) throw new Error(feed.name + " feed unavailable");
      const payload = await response.json() as { status?: string; items?: Array<Record<string, any>> };
      if (payload.status !== "ok" || !Array.isArray(payload.items)) throw new Error(feed.name + " feed returned no stories");
      return payload.items.map(item => ({
        title: newsText(item.title),
        description: newsText(item.description),
        link: newsSafeUrl(item.link),
        image: newsSafeUrl(item.thumbnail || item.enclosure?.link || ""),
        source: feed.name,
        published: item.pubDate || "",
      })).filter(item => item.title && item.link);
    }));
    const all: NewsItem[] = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
    all.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    const unique = new Map<string, NewsItem>();
    all.forEach(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!unique.has(key)) {
        const date = new Date(item.published);
        item.dateLabel = Number.isNaN(date.getTime()) ? "LATEST" : date.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        item.category = newsCategory(item);
        unique.set(key, item);
      }
    });
    const fresh = [...unique.values()].slice(0, 36);
    if (fresh.length) {
      newsroomItems = fresh;
      try { localStorage.setItem("redline-news-cache-v1", JSON.stringify({ savedAt: Date.now(), items: fresh })); } catch { /* Cache is optional. */ }
      renderNewsroom();
    } else if (!newsroomItems.length) {
      root.innerHTML = '<div class="newsroom-empty">Live news feeds could not be reached. You can still open a publisher feed directly below.</div><div class="newsroom-sources"><span>NEWS SOURCES</span><span><a href="https://www.motorsport.com/rss/f1/news/" target="_blank" rel="noopener">MOTORSPORT.COM</a> · <a href="https://www.autosport.com/rss/feed/f1" target="_blank" rel="noopener">AUTOSPORT</a></span></div>';
    }
  } catch {
    if (!newsroomItems.length) root.innerHTML = '<div class="newsroom-empty">The live news feed is temporarily unavailable. Please try again shortly.</div>';
  } finally {
    newsroomLoading = false;
  }
}
function initNewsroom(): void {
  const refresh = $("newsRefresh") as HTMLButtonElement | null;
  if (refresh) refresh.onclick = () => { void loadNewsroom(true); };
}
window.RedlineNewsroom = {
  load: loadNewsroom,
  render: renderNewsroom,
  setView: view => { window.newsroomView = view; renderNewsroom(); },
};
initNewsroom();
if (window.newsroomView === "headlines" || window.newsroomView === "fia") void loadNewsroom();
