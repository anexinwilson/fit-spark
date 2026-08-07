import { pathToFileURL } from "node:url";
import pg from "pg";
import sharp from "sharp";
import { normalizeEquipment } from "./equipment-normalization.mjs";

const SOURCE_COMMIT = "b0eed061e1c832b3ed815fbaa4b45b3cdc14df49";
const SOURCE_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${SOURCE_COMMIT}/dist/exercises.json`;
const IMAGE_BASE_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${SOURCE_COMMIT}/exercises/`;
const PINECONE_API_VERSION = "2026-04";
const BATCH_SIZE = 50;
const { Pool } = pg;
const GCS_METADATA_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

function equipmentDetails(exercise) {
  const equipmentType =
    typeof exercise.equipment === "string" && exercise.equipment.trim()
      ? exercise.equipment.trim().toLowerCase()
      : "unspecified";
  const normalized = normalizeEquipment(exercise);
  const equipmentName = normalized?.name ?? "Unclassified equipment";
  const aliases = new Set(normalized?.aliases ?? [equipmentType]);

  return {
    equipmentType,
    equipmentSlug: normalized?.slug ?? null,
    equipmentName,
    equipmentAliases: [...aliases],
  };
}

export function parseRuntimeConfig(raw) {
  if (!raw) {
    throw new Error("FITSPARK_RUNTIME_CONFIG_JSON is required.");
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error("FITSPARK_RUNTIME_CONFIG_JSON must contain valid JSON.");
  }

  for (const key of [
    "PINECONE_API_KEY",
    "PINECONE_INDEX_HOST",
    "PINECONE_NAMESPACE",
    "RAG_IMAGE_BUCKET",
    "DATABASE_URL",
  ]) {
    if (typeof config[key] !== "string" || config[key].length === 0) {
      throw new Error(`${key} is required in FITSPARK_RUNTIME_CONFIG_JSON.`);
    }
  }

  return config;
}

function equipmentCatalog(records) {
  const bySourceValue = new Map();

  for (const record of records) {
    const sourceValue = record.equipment_slug;
    if (!sourceValue) continue;

    const category =
      sourceValue.includes("machine") ||
      sourceValue.includes("treadmill") ||
      sourceValue.includes("bike") ||
      sourceValue.includes("trainer") ||
      sourceValue.includes("row") ||
      sourceValue.includes("stair")
        ? "Machines"
        : sourceValue.includes("bar") ||
            sourceValue.includes("bell") ||
            sourceValue.includes("plate") ||
            sourceValue.includes("dumbbell") ||
            sourceValue.includes("kettlebell") ||
            sourceValue.includes("band")
          ? "Free Weights"
          : sourceValue === "bodyweight" ||
              sourceValue.includes("roller") ||
              sourceValue.includes("ball")
            ? "Bodyweight"
            : "Other";

    const existing = bySourceValue.get(sourceValue) ?? {
      slug: sourceValue,
      sourceValue,
      displayName: record.equipment_name,
      category,
      level: "beginner",
      aliases: new Set([sourceValue]),
      primaryMuscles: new Set(),
      secondaryMuscles: new Set(),
      imageUrls: new Set(),
      exerciseCount: 0,
      sourceCommit: SOURCE_COMMIT,
    };

    existing.aliases.add(existing.displayName.toLowerCase());
    existing.aliases.add(record.equipment);
    if (record.level === "intermediate" || record.level === "expert") {
      existing.level = "intermediate";
    }
    for (const muscle of record.primary_muscles
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)) {
      existing.primaryMuscles.add(muscle);
    }
    for (const muscle of record.secondary_muscles
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)) {
      existing.secondaryMuscles.add(muscle);
    }
    existing.exerciseCount += 1;
    for (const imageUrl of record.source_image_urls) existing.imageUrls.add(imageUrl);
    bySourceValue.set(sourceValue, existing);
  }

  return [...bySourceValue.values()].map((item) => ({
    ...item,
    aliases: [...item.aliases],
    primaryMuscles: [...item.primaryMuscles],
    secondaryMuscles: [...item.secondaryMuscles],
    imageUrls: [...item.imageUrls],
  }));
}

async function syncEquipmentCatalog(config, items) {
  const pool = new Pool({ connectionString: config.DATABASE_URL });
  try {
    await pool.query("BEGIN");
    for (const item of items) {
      await pool.query(
        `INSERT INTO equipment
          (slug, source_value, display_name, category, level, aliases, primary_muscles, secondary_muscles, image_urls, exercise_count, source_commit, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (source_value) DO UPDATE SET
          slug = EXCLUDED.slug,
          display_name = EXCLUDED.display_name,
          category = EXCLUDED.category,
          level = EXCLUDED.level,
          aliases = EXCLUDED.aliases,
          primary_muscles = EXCLUDED.primary_muscles,
          secondary_muscles = EXCLUDED.secondary_muscles,
          image_urls = EXCLUDED.image_urls,
          exercise_count = EXCLUDED.exercise_count,
          source_commit = EXCLUDED.source_commit,
          updated_at = CURRENT_TIMESTAMP`,
        [
          item.slug,
          item.sourceValue,
          item.displayName,
          item.category,
          item.level,
          item.aliases,
          item.primaryMuscles,
          item.secondaryMuscles,
          item.imageUrls,
          item.exerciseCount,
          item.sourceCommit,
        ],
      );
    }
    if (items.length > 0) {
      await pool.query(
        "DELETE FROM equipment WHERE source_commit = $1 AND slug <> ALL($2::text[])",
        [SOURCE_COMMIT, items.map((item) => item.slug)],
      );
    }
    await pool.query("COMMIT");
    return items.length;
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

export function normalizeExercises(input) {
  if (!Array.isArray(input)) {
    throw new Error("The exercise source must be a JSON array.");
  }

  return input.map((exercise, index) => {
    if (
      !exercise ||
      typeof exercise.id !== "string" ||
      typeof exercise.name !== "string" ||
      !Array.isArray(exercise.instructions)
    ) {
      throw new Error(`Invalid exercise record at index ${index}.`);
    }

    const primaryMuscles = Array.isArray(exercise.primaryMuscles)
      ? exercise.primaryMuscles
      : [];
    const secondaryMuscles = Array.isArray(exercise.secondaryMuscles)
      ? exercise.secondaryMuscles
      : [];
    const instructions = exercise.instructions.filter(
      (instruction) => typeof instruction === "string" && instruction.trim(),
    );

    const equipment = equipmentDetails(exercise);
    const text = [
      `Exercise: ${exercise.name}`,
      `Level: ${exercise.level || "unspecified"}`,
      `Category: ${exercise.category || "unspecified"}`,
      `Equipment type: ${equipment.equipmentType}`,
      `Equipment name: ${equipment.equipmentName}`,
      `Equipment slug: ${equipment.equipmentSlug ?? "unclassified"}`,
      `Equipment aliases: ${equipment.equipmentAliases.join(", ")}`,
      `Primary muscles: ${primaryMuscles.join(", ") || "unspecified"}`,
      `Secondary muscles: ${secondaryMuscles.join(", ") || "none listed"}`,
      "Instructions:",
      ...instructions.map(
        (instruction, instructionIndex) =>
          `${instructionIndex + 1}. ${instruction}`,
      ),
    ].join("\n");

    return {
      _id: `exercise:${exercise.id}`,
      text,
      name: exercise.name,
      source_id: exercise.id,
      level: exercise.level || "unspecified",
      category: exercise.category || "unspecified",
      mechanic: exercise.mechanic || "unspecified",
      force: exercise.force || "unspecified",
      equipment: equipment.equipmentType,
      equipment_type: equipment.equipmentType,
      equipment_name: equipment.equipmentName,
      ...(equipment.equipmentSlug
        ? { equipment_slug: equipment.equipmentSlug }
        : {}),
      equipment_aliases: equipment.equipmentAliases,
      primary_muscles: primaryMuscles.join(", "),
      secondary_muscles: secondaryMuscles.join(", "),
      source: "yuhonas/free-exercise-db",
      source_url: SOURCE_URL,
      source_image_urls: Array.isArray(exercise.images)
        ? exercise.images.map((imagePath) => `${IMAGE_BASE_URL}${imagePath}`)
        : [],
      image_urls: Array.isArray(exercise.images)
        ? exercise.images.map((imagePath) => `${IMAGE_BASE_URL}${imagePath}`)
        : [],
    };
  });
}

function gcsObjectName(sourceUrl, exerciseName) {
  const relativePath = new URL(sourceUrl).pathname.split("/exercises/")[1];
  if (!relativePath) {
    throw new Error(
      `Exercise image path could not be determined: ${sourceUrl}`,
    );
  }
  const safeName = (exerciseName || "exercise").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cleanPath = relativePath.substring(0, relativePath.lastIndexOf('.')) || relativePath;
  return `exercise-images/${SOURCE_COMMIT}/${safeName}-${cleanPath.replace(/\//g, '-')}.avif`;
}

function gcsImageUrl(bucket, objectName) {
  return `https://storage.googleapis.com/${bucket}/${objectName.split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadImage(fetchImpl, token, bucket, sourceUrl, exerciseName) {
  const objectName = gcsObjectName(sourceUrl, exerciseName);
  const existingObjectUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`;
  const existingObject = await fetchImpl(existingObjectUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existingObject.ok) return gcsImageUrl(bucket, objectName);
  if (existingObject.status !== 404) {
    throw new Error(
      `GCS object check failed with HTTP ${existingObject.status}: ${sourceUrl}`,
    );
  }

  const response = await fetchImpl(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Exercise image request failed with HTTP ${response.status}: ${sourceUrl}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  // Compress raw image to AVIF using sharp
  const avifBuffer = await sharp(Buffer.from(arrayBuffer)).avif({ quality: 65 }).toBuffer();

  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const uploadResponse = await fetchImpl(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/avif",
    },
    body: avifBuffer,
  });
  if (!uploadResponse.ok) {
    const message = await uploadResponse.text();
    throw new Error(
      `GCS image upload failed with HTTP ${uploadResponse.status}: ${message}`,
    );
  }

  // PATCH metadata (GCS media upload ignores Cache-Control headers)
  const patchUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`;
  const patchResponse = await fetchImpl(patchUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        alt: exerciseName
      }
    })
  });
  if (!patchResponse.ok) {
     console.warn(`[WARNING] Failed to set metadata for ${objectName}`);
  }

  return gcsImageUrl(bucket, objectName);
}

// mirrorEquipmentImages removed, uploading inline instead

async function getGoogleAccessToken(fetchImpl) {
  const response = await fetchImpl(GCS_METADATA_URL, {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (!response.ok) {
    throw new Error(
      `Google metadata token request failed with HTTP ${response.status}.`,
    );
  }
  const payload = await response.json();
  if (
    typeof payload.access_token !== "string" ||
    payload.access_token.length === 0
  ) {
    throw new Error(
      "Google metadata token response did not contain an access token.",
    );
  }
  return payload.access_token;
}

async function fetchSource(fetchImpl) {
  const response = await fetchImpl(SOURCE_URL);
  if (!response.ok) {
    throw new Error(
      `Exercise source request failed with HTTP ${response.status}.`,
    );
  }
  return normalizeExercises(await response.json());
}

async function upsertBatch(fetchImpl, config, records) {
  const endpoint = `${config.PINECONE_INDEX_HOST.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(config.PINECONE_NAMESPACE)}/upsert`;
  const body = records.map((record) => JSON.stringify(record)).join("\n");
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Api-Key": config.PINECONE_API_KEY,
      "Content-Type": "application/x-ndjson",
      "X-Pinecone-Api-Version": PINECONE_API_VERSION,
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Pinecone upsert failed with HTTP ${response.status}: ${message}`,
    );
  }
}

async function verifyIndex(fetchImpl, config) {
  const endpoint = `${config.PINECONE_INDEX_HOST.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(config.PINECONE_NAMESPACE)}/search`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": config.PINECONE_API_KEY,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": PINECONE_API_VERSION,
    },
    body: JSON.stringify({
      query: {
        inputs: { text: "beginner assisted pull-up machine" },
        top_k: 3,
      },
      fields: ["name", "equipment", "equipment_name", "image_urls", "text"],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Pinecone verification failed with HTTP ${response.status}: ${message}`,
    );
  }

  return response.json();
}

export async function ingestExercises({
  config = parseRuntimeConfig(process.env.FITSPARK_RUNTIME_CONFIG_JSON),
  fetchImpl = fetch,
  isImagesOnly = false,
} = {}) {
  const sourceRecords = await fetchSource(fetchImpl);

  // 1. Reuse existing equipmentCatalog logic to perfectly group everything
  const equipments = equipmentCatalog(sourceRecords);
  let uploadedCount = 0;

  // 2. Upload exactly 1 image per unique equipment category to GCS
  const token = await getGoogleAccessToken(fetchImpl);
  for (const equipment of equipments) {
    if (equipment.imageUrls.length > 0) {
      try {
        const firstImageUrl = equipment.imageUrls[0];
        const gcsUrl = await uploadImage(fetchImpl, token, config.RAG_IMAGE_BUCKET, firstImageUrl, equipment.displayName);
        equipment.imageUrls = [gcsUrl]; // Replace massive array with the single GCS URL
        uploadedCount++;
      } catch (e) {
        console.warn(`[WARNING] Failed to upload image for ${equipment.slug}: ${e.message}`);
        equipment.imageUrls = [];
      }
    }
  }

  if (isImagesOnly) {
    return { count: uploadedCount, isImagesOnly: true };
  }

  for (let offset = 0; offset < sourceRecords.length; offset += BATCH_SIZE) {
    const pineconeRecords = sourceRecords
      .slice(offset, offset + BATCH_SIZE)
      .map((record) => {
        const copy = { ...record };
        delete copy.image_urls;
        delete copy.source_image_urls;
        return copy;
      });
    await upsertBatch(fetchImpl, config, pineconeRecords);
    console.log(
      `  Upserted ${Math.min(offset + BATCH_SIZE, sourceRecords.length)}/${sourceRecords.length} records...`,
    );
  }

  // 4. Sync the fully processed equipments to Postgres
  const equipmentCount = await syncEquipmentCatalog(config, equipments);
  const verification = await verifyIndex(fetchImpl, config);
  return { count: sourceRecords.length, equipmentCount, verification };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const isImagesOnly = process.argv.includes("--images-only");
  const result = await ingestExercises({ isImagesOnly });
  
  if (result.isImagesOnly) {
    console.log(`\nProcessed and uploaded ${result.count} images to GCS in AVIF format.`);
    console.log(`Skipped Pinecone and PostgreSQL sync (--images-only flag active).`);
  } else {
    const hits = result.verification?.result?.hits ?? [];
    console.log(`\nIndexed ${result.count} exercise records into Pinecone.`);
    console.log(
      `Synced ${result.equipmentCount} equipment records to PostgreSQL.`,
    );
    console.log(`Verification query returned ${hits.length} matches.`);
    if (hits.length > 0) {
      console.log("Sample match:", hits[0]?.fields?.name);
    }
  }
}
