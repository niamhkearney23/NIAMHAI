import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, renderCard } from "./cards";

describe("carousel cards", () => {
  it("renders a 1080 x 1350 JPEG", async () => {
    const jpeg = await renderCard({ heading: "Deposits are not a penalty", body: "A landlord has to show actual loss." }, 0, 5, "Rahman & Co");
    expect(jpeg.subarray(0, 2).toString("hex")).toBe("ffd8");
    const meta = await sharp(jpeg).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([CARD_WIDTH, CARD_HEIGHT, "jpeg"]);
    expect(jpeg.length).toBeLessThan(8 * 1024 * 1024);
  }, 30_000);
});
