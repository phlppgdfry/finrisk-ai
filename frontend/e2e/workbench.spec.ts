import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /See the risk/ }),
  ).toBeVisible();
});

test("filter, search and inspect a seeded invoice", async ({ page }) => {
  await page.getByRole("button", { name: "High 3", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "All 64", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search invoices" })
    .fill("no-such-customer");
  await expect(page.getByText("No matching invoices")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("button", { name: "Inspect INV-26034", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("INV-26034");
  await expect(
    page.getByRole("heading", { name: "What the model responds to" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("seeded decimal values submit and scenario comparison updates", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Inspect INV-26034", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore this invoice in the lab" })
    .click();
  expect(
    await page
      .locator("form")
      .evaluate((f: HTMLFormElement) => f.checkValidity()),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Run prediction", exact: true })
    .click();
  await expect(page.locator(".big-probability")).toBeVisible();
  const original = parseFloat(
    await page.locator(".big-probability").innerText(),
  );
  await page
    .getByRole("button", { name: "Reliable customer", exact: true })
    .click();
  await expect(
    page.getByText("Inputs changed — run again to update this result."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run prediction", exact: true })
    .click();
  await expect(page.getByText("Compared with your first run")).toBeVisible();
  expect(
    parseFloat(await page.locator(".big-probability").innerText()),
  ).toBeLessThan(original);
});

test("model trade-off changes counts and reset preserves deployed policy", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Model report", exact: true }).click();
  const before = await page.locator(".confusion strong").allTextContents();
  await page.locator("#threshold").fill("0.7");
  await expect(page.locator(".confusion strong")).not.toHaveText(before);
  await page
    .getByRole("button", { name: "Reset to deployed threshold" })
    .click();
  await expect(page.locator(".confusion strong")).toHaveText(before);
  await expect(
    page.getByText("The simpler model wins on ROC-AUC."),
  ).toBeVisible();
});

test("CSV scoring succeeds, exports, and rejects malformed input", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Invoices", exact: true }).click();
  await page.getByRole("button", { name: "Score CSV", exact: true }).click();
  const header =
    "amount,payment_terms,customer_tenure,prior_invoices,prior_late_rate,avg_days_late,credit_utilisation";
  await page.locator("input[type=file]").setInputFiles({
    name: "example.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      header + "\n4500,30,24,30,0.35,12,0.7\n2200,30,110,95,0.05,3,0.2",
    ),
  });
  await expect(
    page.getByRole("heading", { name: "2 invoices scored" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download scored CSV" }).click();
  expect((await download).suggestedFilename()).toBe(
    "finrisk-scored-invoices.csv",
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("amount,late\n500,1"),
  });
  await expect(page.getByRole("alert")).toContainText("seven exact columns");
});

test("sorting and portfolio download work", async ({ page }) => {
  await page.getByRole("button", { name: "Customer", exact: true }).click();
  const first = await page.locator("tbody tr").first().innerText();
  expect(first).toContain("Atelier Vermeer");
  await expect(page.locator("tbody .customer").nth(1)).toContainText(
    "Atelier Vermeer",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Export portfolio", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "finrisk-synthetic-portfolio.csv",
  );
});

test("all pages fit viewport and have one main heading", async ({ page }) => {
  for (const name of [
    "Overview",
    "Invoices",
    "Scenario lab",
    "How it works",
    "Model report",
    "Case study",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
});
