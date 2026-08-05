import assert from "node:assert/strict";
import test from "node:test";

import { normalizeExercises, parseRuntimeConfig } from "./ingest-exercises.mjs";

test("normalizes an exercise into a searchable record", () => {
  const [record] = normalizeExercises([
    {
      id: "assisted-pull-up",
      name: "Assisted Pull-Up",
      level: "beginner",
      category: "strength",
      equipment: "machine",
      primaryMuscles: ["lats"],
      secondaryMuscles: ["biceps"],
      instructions: ["Set the assistance before starting."],
      images: ["Assisted_Pull-Up/0.jpg"],
    },
  ]);

  assert.equal(record._id, "exercise:assisted-pull-up");
  assert.match(record.text, /Set the assistance before starting/);
  assert.equal(record.equipment, "machine");
  assert.equal(record.equipment_type, "machine");
  assert.equal(record.equipment_name, "Assisted Pull-Up Machine");
  assert.equal(record.equipment_slug, "assisted-pull-up-machine");
  assert.deepEqual(record.equipment_aliases, ["machine", "assisted pull-up"]);
  assert.deepEqual(record.image_urls, [
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/exercises/Assisted_Pull-Up/0.jpg",
  ]);
});

test("uses the canonical machine exercise name for equipment search", () => {
  const [record] = normalizeExercises([
    {
      id: "Ab_Crunch_Machine",
      name: "Ab Crunch Machine",
      equipment: "machine",
      instructions: ["Sit down."],
      images: [],
    },
  ]);

  assert.equal(record.equipment_name, "Ab Crunch Machine");
  assert.deepEqual(record.equipment_aliases, ["machine", "ab crunch machine"]);
});

test("omits optional equipment metadata when the source is ambiguous", () => {
  const [record] = normalizeExercises([
    {
      id: "ambiguous-other",
      name: "Behind Head Chest Stretch",
      equipment: "other",
      instructions: ["Stretch gently."],
      images: [],
    },
  ]);

  assert.equal(Object.hasOwn(record, "equipment_slug"), false);
  assert.match(record.text, /Equipment slug: unclassified/);
});

test("rejects missing Pinecone configuration", () => {
  assert.throws(
    () => parseRuntimeConfig(JSON.stringify({ PINECONE_API_KEY: "key" })),
    /PINECONE_INDEX_HOST is required/,
  );
});
