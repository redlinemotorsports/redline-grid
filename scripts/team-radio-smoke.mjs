import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

const race = {
  session_key: 100,
  meeting_key: 200,
  session_name: "Race",
  date_start: "2026-04-12T15:00:00+00:00",
  date_end: "2026-04-12T17:00:00+00:00",
  country_name: "Bahrain",
  meeting_name: "Bahrain Grand Prix",
  location: "Sakhir",
};
const session = {
  session_key: 100,
  meeting_key: 200,
  session_name: "Race",
  date_start: "2026-04-12T15:00:00+00:00",
};
const clip = {
  session_key: 100,
  driver_number: 4,
  date: "2026-04-12T15:32:10+00:00",
  recording_url: "https://example.test/team-radio.mp3",
};
const driver = {
  driver_number: 4,
  full_name: "Lando Norris",
  team_name: "McLaren",
  team_colour: "FF8000",
};
await page.route("https://api.openf1.org/v1/**", async route => {
  const url = new URL(route.request().url());
  const path = url.pathname.split("/").pop();
  let data = [];
  if (path === "sessions" && url.searchParams.has("year")) data = [race];
  else if (path === "sessions" && url.searchParams.has("meeting_key")) data = [session];
  else if (path === "team_radio") data = [clip];
  else if (path === "drivers") data = [driver];
  else if (path === "laps") data = [{ driver_number: 4, lap_number: 18, date_start: "2026-04-12T15:31:00+00:00", lap_duration: 91.234 }];
  else if (path === "position") data = [{ driver_number: 4, date: "2026-04-12T15:32:00+00:00", position: 2 }];
  else if (path === "intervals") data = [{ driver_number: 4, date: "2026-04-12T15:32:00+00:00", interval: 0.842 }];
  else if (path === "stints") data = [{ driver_number: 4, stint_number: 2, lap_start: 12, lap_end: 25, compound: "MEDIUM", tyre_age_at_start: 3 }];
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
});

try {
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.RedlineRadio, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.locator('#tabs button[data-v="data"]').click();
  await page.locator('#sub button[data-s="radio"]').click();
  await page.locator("#radioList article.radio").first().waitFor({ timeout: 20000 });
  const article = page.locator("#radioList article.radio").first();
  if (!(await article.locator("audio").getAttribute("src"))?.includes("team-radio.mp3")) throw new Error("Radio audio source was not rendered");
  if (!(await article.locator(".radio-id b").textContent())?.includes("Lando Norris")) throw new Error("Driver identity was not rendered");
  if (!(await article.locator(".context-card").count())) throw new Error("Timing context cards were not rendered");
  await page.waitForFunction(() => {
    const text = document.querySelector("#radioList")?.textContent || "";
    return text.includes("1:31.234") && text.includes("MEDIUM") && text.includes("9 laps into stint");
  }, null, { timeout: 10000 });
  const contextText = await article.locator(".radio-context").textContent();
  if (!contextText?.includes("1:31.234")) throw new Error("Previous completed lap context was not refreshed after lap data loaded");
  if (!contextText?.includes("MEDIUM")) throw new Error("Tyre compound context was not rendered");
  if (!contextText?.includes("9 laps into stint")) throw new Error("Tyre age context was not rendered");
  if (!(await article.locator(".radio-wave i").count())) throw new Error("Minimal waveform was not rendered");
  await page.locator("#rsess").selectOption("100");
  await page.locator("#radioList article.radio").first().waitFor({ timeout: 10000 });
  if (errors.length) throw new Error("Uncaught page errors: " + errors.join(" | "));
  console.log("PASS: Team Radio module mounts, loads meeting clips, renders team colour, audio, waveform and timing context");
} finally {
  await browser.close();
}
