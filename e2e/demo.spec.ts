import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

test.describe.configure({ mode: "serial" });

const cistern = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0056";

async function signIn(page: Page, name: string) {
  await page.goto("/login");
  if (await page.getByRole("button", { name: "Account" }).count()) {
    await page.getByRole("button", { name: "Account" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/login");
  }
  await page.getByRole("button", { name: `Sign in as ${name}` }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("demo script", async ({ page }) => {
  test.setTimeout(240000);
  const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", { max: 1 });

  await signIn(page, "A. Iyer");
  await page.goto("/s/ajanta-cave-1/reconstruct");
  await page.getByRole("button", { name: "Water cistern", exact: true }).click();
  await page.getByRole("radio", { name: "High" }).click();
  await expect(page.getByText("High confidence needs at least one linked source.")).toBeVisible();
  const [{ confidence }] = await sql<{ confidence: string }[]>`select confidence from public.elements where id = ${cistern}::uuid`;
  expect(confidence).toBe("low");

  await page.getByRole("button", { name: "Link evidence" }).click();
  await page.getByRole("button", { name: "Nagaraju 1981" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "High" }).click();
  await expect(page.getByText("Confidence updated")).toBeVisible();
  await page.getByRole("radio", { name: "Medium" }).click();
  await expect(page.getByText("Confidence updated")).toBeVisible();

  await page.goto("/s/ajanta-cave-1/review");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("In review")).toBeVisible();

  await signIn(page, "R. Mehta");
  await page.goto("/review-queue");
  await page.getByPlaceholder("Be specific: which claim, which source is missing.").pressSequentially("Please note the cistern source is a placeholder.");
  await page.getByRole("button", { name: "Request changes", exact: true }).click();
  await expect(page.getByText("Please note the cistern source is a placeholder.")).toBeVisible();

  await signIn(page, "A. Iyer");
  await page.goto("/s/ajanta-cave-1/review");
  await page.getByPlaceholder("Reply...").pressSequentially("Noted. The source stays labelled as a placeholder.");
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(page.getByText("Noted. The source stays labelled as a placeholder.")).toBeVisible();
  const resubmit = page.getByRole("button", { name: "Resubmit for review" });
  for (let attempt = 0; attempt < 6 && !(await resubmit.isEnabled()); attempt += 1) {
    const resolve = page.getByRole("button", { name: "Resolve" });
    if (await resolve.count()) await resolve.first().click();
    await page.waitForTimeout(400);
  }
  await resubmit.click();
  await expect(page.getByText("In review")).toBeVisible();

  await signIn(page, "R. Mehta");
  await page.goto("/review-queue");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText(/Approved|Nothing is waiting/)).toBeVisible();

  await signIn(page, "S. Rao");
  await page.goto("/s/ajanta-cave-1/publish");
  const version = page.getByLabel("Version name");
  await version.click();
  await page.keyboard.press("Meta+A");
  await version.pressSequentially("1.1");
  await page.getByRole("button", { name: "Publish →" }).click();
  await expect(page.getByRole("img", { name: /QR/i })).toBeVisible({ timeout: 30000 });
  const versions = await sql<{ number: string }[]>`select number from public.versions where site_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0020' and number = '1.1'`;
  expect(versions).toHaveLength(1);

  await page.goto("/s/ajanta-cave-1/archive");
  await page.getByRole("link", { name: "Compare" }).first().click();
  await expect(page.getByText("Water cistern")).toBeVisible();
  await expect(page.getByText("Nagaraju 1981")).toBeVisible();

  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ajanta-cave-1?l=L2");
  await page.getByRole("link", { name: "Begin exploring" }).click();
  await page.getByRole("link", { name: "Roof" }).click();
  await expect(page.getByText("Likely")).toBeVisible();
  await expect(page.getByRole("button", { name: "See the reconstruction" })).toBeVisible();
  await expect(page.getByText(/imagined reconstruction/i)).toBeVisible();
  const how = await page.getByRole("link", { name: "How do we know?" }).first().getAttribute("href");
  await page.goto(how ?? "/ajanta-cave-1");
  await expect(page.getByText("Beam socket survey 2026").first()).toBeVisible();
  await expect(page.getByText("Ridge height estimated for demo only")).toBeVisible();
  await page.goto("/ajanta-cave-1/about");
  const radios = page.locator("input[type=radio]");
  await radios.nth(3).check({ force: true });
  await radios.nth(8).check({ force: true });
  await page.getByPlaceholder("Optional comment").fill("The confidence label was clear.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText("Thank you. Your response was saved.")).toBeVisible();

  await signIn(page, "S. Rao");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/analytics?range=all");
  await page.getByRole("button", { name: "Feedback" }).click();
  await expect(page.getByText("The confidence label was clear.").first()).toBeVisible();

  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ajanta-cave-1");
  await page.waitForTimeout(500);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ajanta Cave 1" })).toBeVisible();
  await page.context().setOffline(false);
  await sql.end();
});
