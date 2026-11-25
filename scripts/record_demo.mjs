/** Real browser capture; captions are rendered separately, never inside the UI. */
import { chromium } from "../frontend/node_modules/playwright/index.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const out = path.resolve(
  process.env.FINRISK_DEMO_DIR || "/private/tmp/finrisk-demo",
);
await mkdir(out, { recursive: true });
const invoice = JSON.parse(
  await readFile("frontend/public/data/portfolio.json", "utf8"),
).invoices.find((r) => r.invoice_id === "INV-26034");
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 720 },
  recordVideo: { dir: out, size: { width: 1440, height: 720 } },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const video = page.video();
const clock = Date.now();
await page.goto(
  process.env.FINRISK_DEMO_URL || "https://phlppgdfry.github.io/finrisk-ai/",
);
await page.getByRole("heading", { name: /See the risk/ }).waitFor();
await page.locator("tbody tr").first().waitFor();
const trim = (Date.now() - clock) / 1000;
const chapters = [];
const mark = (title, text) =>
  chapters.push({ start: (Date.now() - clock) / 1000 - trim, title, text });
const hold = (ms) => page.waitForTimeout(ms);
mark("01 / FinRisk AI", "Eén factuur. Eén boom. Een dagelijkse werklijst.");
await hold(5000);
await page
  .getByRole("button", { name: "Inspect INV-26034", exact: true })
  .click();
mark(
  "02 / Een factuur",
  "INV-26034 · € 1.205,08 · circa 74,7% modelscore. Geen zekerheid over betaling.",
);
await hold(9000);
await page.keyboard.press("Escape");
await page.getByRole("link", { name: "How it works", exact: true }).click();
await page.getByRole("heading", { name: "Zo denkt het bos." }).waitFor();
const names = [
  "Factuurbedrag (€)",
  "Betaaltermijn (dagen)",
  "Klantrelatie (maanden)",
  "Eerdere facturen",
  "Historisch aandeel te laat",
  "Historische vertraging (dagen)",
  "Benutting kredietlimiet",
];
const keys = [
  "amount",
  "payment_terms",
  "customer_tenure",
  "prior_invoices",
  "prior_late_rate",
  "avg_days_late",
  "credit_utilisation",
];
for (let i = 0; i < keys.length; i++)
  await page
    .getByLabel(names[i], { exact: true })
    .fill(String(invoice[keys[i]]));
await page
  .locator(".tree-toolbar")
  .evaluate((e) => e.scrollIntoView({ block: "start" }));
mark(
  "03 / Dezelfde factuur in boom 1",
  "Elke splitsing stelt één vraag. Links of rechts volgt uit de ingevulde waarde.",
);
await hold(4000);
for (let i = 0; i < 4; i++) {
  const next = page.getByRole("button", {
    name: "Volgende splitsing",
    exact: true,
  });
  if (await next.isEnabled()) await next.evaluate((e) => e.click());
  await hold(2800);
}
mark(
  "04 / 220 bomen middelen",
  "Elke boom gebruikt andere steekproeven en splitsingen. Het bos middelt hun kansen.",
);
await page.getByLabel("Boom", { exact: true }).selectOption("7");
await hold(4500);
await page.locator(".forest-summary").scrollIntoViewIfNeeded();
await hold(4500);
await page.getByRole("link", { name: "Daily workflow", exact: true }).click();
await page
  .getByRole("heading", { name: "Een werkdag, tien dossiers." })
  .waitFor();
mark(
  "05 / Dagelijkse opvolging",
  "Maximaal tien dossiers. Eén per klant. Zeven dagen rust na een beoordeling.",
);
await hold(6500);
await page.getByLabel("Werkdag", { exact: true }).selectOption("1");
await hold(4000);
await page.getByLabel("Werkdag", { exact: true }).selectOption("14");
await page
  .getByLabel("Opvolgstrategie", { exact: true })
  .selectOption("history");
mark(
  "06 / Vergelijk met een eenvoudige regel",
  "Andere strategie, eigen opvolghistoriek. Nieuwe klanten krijgen handmatige beoordeling.",
);
await hold(6500);
await page.getByRole("link", { name: "Model report", exact: true }).click();
await page
  .getByRole("heading", { name: "Welke tien facturen eerst?" })
  .waitFor();
await page
  .getByRole("heading", { name: "Welke tien facturen eerst?" })
  .scrollIntoViewIfNeeded();
mark(
  "07 / Bewijs boven complexiteit",
  "Synthetische evaluatie: een eenvoudige regel kan winnen. Nog geen bewezen incassowinst.",
);
await hold(7000);
await page.getByRole("link", { name: "Overview", exact: true }).click();
mark(
  "08 / Philippe Godfroy · portfolio",
  "Met AI-ondersteuning gebouwd. Echte modelberekeningen, volledig synthetische demo.",
);
await hold(6000);
const duration = (Date.now() - clock) / 1000 - trim;
await context.close();
await video.saveAs(path.join(out, "capture.webm"));
// Render original caption graphics using the open-licensed Inter font.
const captions = await browser.newContext({
  viewport: { width: 1440, height: 90 },
  deviceScaleFactor: 1,
});
const cp = await captions.newPage();
const font = (await readFile("scripts/assets/Inter-Regular.ttf")).toString(
  "base64",
);
let concat = "";
const stamp = (t) => new Date(Math.round(t * 1000)).toISOString().slice(11, 23);
let vtt = "WEBVTT\n\n";
for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i],
    end = chapters[i + 1]?.start ?? duration;
  await cp.setContent(
    `<style>@font-face{font-family:Inter;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#123e2f;color:white;font-family:Inter; padding:14px 30px}.label{color:#d7ee9c;font-size:13px;margin-bottom:7px}p{font-size:23px;margin:0}</style><div class="label"></div><p></p>`,
  );
  await cp.locator(".label").evaluate((e, t) => (e.textContent = t), c.title);
  await cp.locator("p").evaluate((e, t) => (e.textContent = t), c.text);
  await cp.evaluate(() => document.fonts.ready);
  const file = path.join(out, `caption-${i}.png`);
  await cp.screenshot({ path: file });
  concat += `file '${file}'\nduration ${(end - c.start).toFixed(3)}\n`;
  vtt += `${stamp(c.start)} --> ${stamp(end)}\n${c.text}\n\n`;
}
concat += `file '${path.join(out, `caption-${chapters.length - 1}.png`)}'\n`;
await writeFile(path.join(out, "captions.txt"), concat);
await writeFile("frontend/public/media/finrisk-demo-nl.vtt", vtt);
await writeFile(
  path.join(out, "capture.json"),
  JSON.stringify(
    {
      trim,
      duration,
      chapters,
      invoice_id: invoice.invoice_id,
      source: "actual public application; source model release v1.2.0",
      captions:
        "separate editorial layer below the captured viewport; no fabricated UI",
    },
    null,
    2,
  ),
);
await browser.close();
console.log(JSON.stringify({ out, trim, duration }));
