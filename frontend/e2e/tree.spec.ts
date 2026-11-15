import { test, expect } from "@playwright/test";
test("a real tree can be stepped through and responds to the invoice", async ({
  page,
}) => {
  await page.goto("./#learn");
  await expect(
    page.getByRole("heading", { name: "Zo denkt het bos." }),
  ).toBeVisible();
  const initial = await page.locator(".tree-narration").innerText();
  await page
    .getByRole("button", { name: "Volgende splitsing", exact: true })
    .click();
  await expect(page.locator(".tree-narration")).not.toHaveText(initial, {
    useInnerText: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "How the forest thinks." }),
  ).toBeVisible();
  await expect(page.locator(".forest-bars button")).toHaveCount(220);
  const score = await page.locator(".forest-score strong").innerText();
  await page.getByLabel("Historical late rate", { exact: true }).fill("0.8");
  await expect(page.locator(".forest-score strong")).not.toHaveText(score);
  await page.getByLabel("Tree", { exact: true }).selectOption("7");
  await expect(page.locator(".single-tree-score")).toContainText("#8");
  await page.getByRole("button", { name: "Play path", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const next = page.getByRole("button", { name: "Next split", exact: true });
  for (let i = 0; i < 13 && (await next.isEnabled()); i++) await next.click();
  await expect
    .poll(async () =>
      page.locator(".tree-canvas").evaluate((canvas) => {
        const active = canvas.querySelector("circle");
        if (!active) return false;
        const a = active.getBoundingClientRect(),
          c = canvas.getBoundingClientRect();
        return (
          a.top >= c.top &&
          a.bottom <= c.bottom &&
          a.left >= c.left &&
          a.right <= c.right
        );
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
