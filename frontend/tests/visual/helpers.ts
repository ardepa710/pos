import { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  username = "admin",
  password = "admin123",
): Promise<void> {
  await page.goto("/login");
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/(pos|catalog|settings)/);
}
