import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEquipment } from "./equipment-normalization.mjs";

test("maps machine and other labels to stable equipment families", () => {
  const cases = [
    ["Band Assisted Pull-Up", "resistance-bands"],
    ["Decline Smith Press", "smith-machine"],
    ["Parallel Bar Dip", "parallel-bars"],
    ["Rope Climb", "climbing-rope"],
    ["Svend Press", "weight-plates"],
  ];

  for (const [name, expectedSlug] of cases) {
    const normalized = normalizeEquipment({ name, equipment: "other" });
    assert.equal(normalized?.slug, expectedSlug, name);
  }
});

test("leaves ambiguous other exercises unclassified", () => {
  assert.equal(
    normalizeEquipment({
      name: "Behind Head Chest Stretch",
      equipment: "other",
    }),
    null,
  );
});
