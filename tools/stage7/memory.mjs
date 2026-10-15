// Conservative source-RGBA inventory, NOT a measured WebGL/device result.
import { readFileSync } from "node:fs";
import { dimensions } from "../audit-stage1.mjs";
import "../../tests/helpers/install-location.mjs";
import { STAGE7_CANVASES } from "../../src/stage7-paint.js";
import { STREAMS, residentKeys } from "../../src/zone-stream.js";
export function memory7() {
  const pages = [];
  for (const name of ["riley", "grunt", "spear"])
    for (const page of JSON.parse(
      readFileSync(`assets/chars/${name}.anims.json`),
    ).pages) {
      for (const path of [
        `assets/chars/${page}.webp`,
        `assets/stage5/normals/${page}_n.webp`,
        `assets/stage5/normals/${page}_nl.webp`,
      ]) {
        const [w, h] = dimensions(readFileSync(path));
        pages.push({ path, w, h, bytes: w * h * 4 });
      }
    }
  const [fw, fh] = dimensions(readFileSync("assets/stage6/chars/s6fade.webp"));
  const atlasBytes = pages.reduce((n, p) => n + p.bytes, 0);
  const fallbackBytes = STAGE7_CANVASES.filter(([k]) => k !== "s6fade").reduce(
    (n, [, w, h]) => n + w * h * 4,
    0,
  );
  const caps = JSON.parse(
    readFileSync("assets/stage7/ART_STATUS.json"),
  ).entries;
  const bytes = (row) =>
    row.decodedCapBytes || (row.key === "s6fade" ? fw * fh * 4 : 0);
  const paintedBytes = caps
    .filter((r) => !r.key.startsWith("bg7") && !r.key.startsWith("story7"))
    .reduce((n, r) => n + bytes(r), 0);
  const plateCaps = [0, 1, 2, 3].map((zoneI) => {
    const keep = residentKeys({ zoneI }, STREAMS[7]);
    return caps
      .filter((r) => keep.has(r.key))
      .reduce((n, r) => n + bytes(r), 0);
  });
  const storyBytes = caps
    .filter((r) => r.key.startsWith("story7"))
    .reduce((n, r) => n + bytes(r), 0);
  const sharedAllowance = 8 * 1024 * 1024;
  return {
    kind: "static source RGBA upper bound; includes every fallback plate and story panel concurrently",
    atlasBytes,
    fallbackBytes,
    reusedFadeBytes: fw * fh * 4,
    sharedAllowance,
    paintedBytes,
    paintedPlatePeakBytes: Math.max(...plateCaps),
    paintedStoryBytes: storyBytes,
    projectedPaintedPeakBytes:
      atlasBytes +
      sharedAllowance +
      Math.max(
        paintedBytes + Math.max(...plateCaps),
        paintedBytes + plateCaps[0] + storyBytes,
      ),
    totalBytes: atlasBytes + fallbackBytes + fw * fh * 4 + sharedAllowance,
    sourceGateBytes: 105 * 1024 * 1024,
    paintedGateBytes: 12 * 1024 * 1024,
    physicalDevice: "UNMEASURED",
    pages,
  };
}
if (process.argv[1]?.endsWith("/memory.mjs"))
  console.log(JSON.stringify(memory7(), null, 2));
