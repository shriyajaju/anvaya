import { expect, test } from "@playwright/test";

const roof = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0054";

async function installFakeCamera(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    class FakeTrack extends EventTarget {
      kind = "video";
      enabled = true;
      muted = false;
      readyState = "live" as MediaStreamTrackState;
      id = "fake-video";
      label = "fake-camera";
      contentHint = "";
      onended = null;
      onmute = null;
      onunmute = null;
      stop() {
        this.readyState = "ended";
      }
      clone() {
        return this;
      }
      getCapabilities() {
        return {};
      }
      getConstraints() {
        return {};
      }
      getSettings() {
        return { facingMode: "environment", width: 640, height: 480 };
      }
      applyConstraints() {
        return Promise.resolve();
      }
      getCaptureHandle() {
        return null as never;
      }
    }

    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const wantsVideo = typeof constraints === "object" && Boolean(constraints?.video);
      if (!wantsVideo) return original(constraints);
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(80, 60, 480, 360);
      }
      const stream = canvas.captureStream(15);
      // Ensure at least one video track exists for browsers that omit it.
      if (stream.getVideoTracks().length === 0) {
        stream.addTrack(new FakeTrack() as unknown as MediaStreamTrack);
      }
      return stream;
    };
  });
}

test.describe("camera overlay", () => {
  test("opens camera mode with fake media stream on phone viewport", async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await installFakeCamera(page);
    await page.goto(`/ajanta-cave-1/ar/${roof}?camera=1`);
    await expect(page.getByRole("dialog", { name: "View through camera" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Stand at the marker and line up the outline with the structure.")).toBeVisible();
    await page.getByRole("button", { name: "Lined up" }).click();
    await expect(page.getByLabel("Reconstruction opacity")).toBeVisible();
    await page.getByLabel("Reconstruction opacity").fill("40");
    await expect(page.getByText("40%")).toBeVisible();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("70%")).toBeVisible();
    await expect(page.getByText(/imagined reconstruction/i)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog", { name: "View through camera" })).toHaveCount(0);
  });

  test("falls back when camera is denied", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
    });
    await page.goto(`/ajanta-cave-1/ar/${roof}`);
    await page.getByRole("button", { name: "View through camera" }).click();
    await expect(page.getByText(/Camera access is off|unavailable|Then \/ Now/i)).toBeVisible();
    await expect(page.getByRole("dialog", { name: "View through camera" })).toHaveCount(0);
  });

  test("android chrome size keeps overlay controls reachable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await installFakeCamera(page);
    await page.goto(`/ajanta-cave-1/ar/${roof}?camera=1`);
    await expect(page.getByRole("button", { name: "Lined up" })).toBeVisible();
    const box = await page.getByRole("button", { name: "Lined up" }).boundingBox();
    expect(box).toBeTruthy();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan(740);
  });
});
