import { expect, test } from "@playwright/test";

test("opens the initial workspace", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Estudo IA Local" })).toBeVisible();
  await expect(page.getByText("MVP 0.1")).toBeVisible();
});
