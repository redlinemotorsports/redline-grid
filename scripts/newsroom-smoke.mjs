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

  // Engineering Lab replaces the former Live Timing navigation entry.
  const engineeringTab = page.locator('#tabs button[data-v="engineering"]');
  await engineeringTab.click();
  await page.locator("#v-engineering").waitFor({ state: "visible" });
  await page.locator('#v-engineering [data-eng-panel="anatomy"]').getByText("Monocoque").waitFor({ state: "visible" });
  await page.locator('#v-engineering [data-eng-topic="aero"]').click();
  await page.locator('#v-engineering [data-eng-panel="aero"]').getByRole("heading", { name: "Downforce" }).waitFor({ state: "visible" });
  await page.locator('#v-engineering [data-eng-topic="power"]').click();
  await page.locator('#v-engineering [data-eng-panel="power"]').getByText("MGU-K", { exact: true }).first().waitFor({ state: "visible" });
  await page.locator('#v-engineering [data-eng-topic="tyres"]').click();
  await page.locator('#v-engineering [data-eng-panel="tyres"]').getByRole("heading", { name: "Intermediate" }).waitFor({ state: "visible" });
  await page.locator('#v-engineering [data-eng-topic="evolution"]').click();
  await page.locator('#v-engineering [data-eng-panel="evolution"]').getByRole("heading", { name: "A new technical chapter" }).waitFor({ state: "visible" });
  if (await page.locator('#tabs button[data-v="timing"]').count()) {
    throw new Error("Legacy Live Timing navigation entry is still present");
  }

  if (failures.length) throw new Error("Browser page errors: " + failures.join(" | "));

  console.log("PASS: Newsroom and Engineering Lab topic navigation/content");
} finally {
  await browser.close();
}
