import { chromium } from "playwright";

const baseURL = "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];
page.on("pageerror", error => failures.push(error.message));

const fixture = {
  status: "ok",
  items: [
    {
      title: "McLaren confirms a major floor upgrade",
      description: "The team brings a revised floor package to the next race.",
      link: "https://example.com/technical-upgrade",
      thumbnail: "",
      pubDate: "2026-11-09 10:00:00"
    },
    {
      title: "Antonelli targets another strong weekend",
      description: "The Mercedes driver discusses his recent form.",
      link: "https://example.com/driver-interview",
      thumbnail: "",
      pubDate: "2026-11-09 09:00:00"
    }
  ]
};

try {
  await page.route("**/api.rss2json.com/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) })
  );

  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('#tabs button[data-v="drivers"]').click();
  await page.locator('#sub button[data-s="headlines"]').click();

  const content = page.locator("#newsroomContent");
  await content.locator(".newsroom-feature h3").waitFor({ state: "visible", timeout: 15000 });
  if (!(await content.getByText("McLaren confirms a major floor upgrade").count())) {
    throw new Error("Featured RSS headline was not rendered");
  }

  const techFilter = content.locator('[data-news-filter="TECH"]');
  await techFilter.click();
  if (!(await content.locator(".newsroom-feature h3").innerText()).includes("McLaren")) {
    throw new Error("Technical category filter did not retain the technical story");
  }

  await page.locator('#sub button[data-s="fia"]').click();
  await page.locator("#newsroomContent .newsroom-fia-panel").waitFor({ state: "visible" });
  if (!(await page.getByText("Latest event documents").count())) {
    throw new Error("FIA document panel did not render");
  }

  await page.locator('#sub button[data-s="headlines"]').click();
  await page.locator("#newsRefresh").click();
  await content.locator(".newsroom-feature h3").waitFor({ state: "visible" });

  await page.evaluate(() => {
    localStorage.setItem("redline-news-cache-v1", JSON.stringify({
      savedAt: Date.now(),
      items: [{
        title: "Cached paddock report",
        description: "Saved story for offline fallback.",
        link: "https://example.com/cached-story",
        image: "",
        source: "Smoke Test",
        published: "2026-11-08T10:00:00.000Z",
        dateLabel: "08 NOV",
        category: "RACE"
      }]
    }));
  });
  await page.route("**/api.rss2json.com/**", route => route.abort());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('#tabs button[data-v="drivers"]').click();
  await page.locator('#sub button[data-s="headlines"]').click();
  await content.getByText("Cached paddock report").waitFor({ state: "visible", timeout: 10000 });

  // The final classification must load from the bundled season archive even
  // when the live timing service is offline.
  await page.route("https://f1-live-api.onrender.com/**", route => route.abort());
  await page.locator('#tabs button[data-v="timing"]').click();
  await page.waitForFunction(() =>
    document.getElementById("rtLastRaceName")?.textContent?.includes("Brazilian GP"),
    { timeout: 15000 }
  );
  if (!(await page.locator("#rtLastPodium").getByText("Lando Norris").count())) {
    throw new Error("Latest Brazilian GP podium was not loaded from the season archive");
  }

  if (failures.length) throw new Error("Browser page errors: " + failures.join(" | "));

  // A failed archive + network fallback must not poison the cached task.
  // The next Refresh should retry the archive and recover without reloading.
  const retryPage = await browser.newPage();
  let archiveAttempts = 0;
  await retryPage.route("**/archive/2026.json", async route => {
    archiveAttempts += 1;
    if (archiveAttempts === 1) {
      await route.fulfill({ status: 503, body: "Temporary archive failure" });
    } else {
      await route.continue();
    }
  });
  await retryPage.route("https://f1-live-api.onrender.com/**", route => route.abort());
  await retryPage.route("https://api.jolpi.ca/ergast/f1/**", route => route.abort());
  await retryPage.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await retryPage.locator('#tabs button[data-v="timing"]').click();
  await retryPage.getByText("The last race result could not be retrieved right now.").waitFor({
    state: "visible",
    timeout: 15000
  });
  await retryPage.locator("#rtRefresh").click();
  await retryPage.waitForFunction(() =>
    document.getElementById("rtLastRaceName")?.textContent?.includes("Brazilian GP"),
    { timeout: 15000 }
  );
  if (!(await retryPage.locator("#rtLastPodium").getByText("Lando Norris").count()) || archiveAttempts < 2) {
    throw new Error("Final classification did not recover after Refresh retried the archive");
  }
  await retryPage.close();

  console.log("PASS: Newsroom, Live Timing archive fallback, and final-classification retry recovery");
} finally {
  await browser.close();
}
