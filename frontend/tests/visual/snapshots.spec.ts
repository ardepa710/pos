import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

// ── Public pages ──────────────────────────────────────────────────────────

test("login page matches snapshot", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login.png", { maxDiffPixels: 50 });
});

test("setup wizard step 1 matches snapshot", async ({ page }) => {
  await page.goto("/setup");
  await expect(page).toHaveScreenshot("setup.png", { maxDiffPixels: 50 });
});

// ── Authenticated pages ───────────────────────────────────────────────────

test("catalog page — empty state matches snapshot", async ({ page }) => {
  await loginAs(page);
  await page.goto("/catalog");
  await expect(page).toHaveScreenshot("catalog-empty.png", {
    maxDiffPixels: 50,
  });
});

test("POS terminal — empty cart matches snapshot", async ({ page }) => {
  await loginAs(page);
  await page.goto("/pos");
  await expect(page).toHaveScreenshot("pos-empty-cart.png", {
    maxDiffPixels: 50,
  });
});

test("settings page matches snapshot", async ({ page }) => {
  await loginAs(page);
  await page.goto("/settings");
  await expect(page).toHaveScreenshot("settings.png", { maxDiffPixels: 50 });
});
