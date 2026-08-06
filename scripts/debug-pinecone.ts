/**
 * Diagnostic: Query Pinecone and print a sample of equipment_name values
 * to understand what's actually stored vs what we're sending.
 * Run with: npx tsx scripts/debug-pinecone.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const runtimeConfig = JSON.parse(
  process.env.FITSPARK_RUNTIME_CONFIG_JSON ?? "{}",
);
const PINECONE_API_KEY: string = runtimeConfig.PINECONE_API_KEY ?? "";
const PINECONE_INDEX_HOST: string = runtimeConfig.PINECONE_INDEX_HOST ?? "";
const PINECONE_NAMESPACE: string =
  runtimeConfig.PINECONE_NAMESPACE ?? "exercises-v1";

const endpoint = `${PINECONE_INDEX_HOST.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(PINECONE_NAMESPACE)}/search`;

async function queryWith(queryText: string) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: { inputs: { text: queryText }, top_k: 20 },
      fields: ["name", "equipment_name", "category"],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Pinecone error ${res.status}: ${t}`);
  }

  const data = await res.json();
  return data.result?.hits ?? [];
}

async function main() {
  console.log("=== Querying Pinecone with broad 'machine exercises' query ===\n");
  const machineHits = await queryWith("machine exercises ab crunch butterfly calf press chest press");
  console.log(`Total hits: ${machineHits.length}`);
  console.log("\nSample equipment_name values in Pinecone:");
  const seen = new Set<string>();
  for (const h of machineHits) {
    const eq = h.fields?.equipment_name;
    if (eq && !seen.has(eq)) {
      seen.add(eq);
      console.log(`  - equipment_name: "${eq}"  |  name: "${h.fields?.name}"`);
    }
  }

  console.log("\n=== Querying with 'ab roller circus bell climbing rope' ===\n");
  const otherHits = await queryWith("ab roller circus bell climbing rope exercises");
  const seen2 = new Set<string>();
  for (const h of otherHits) {
    const eq = h.fields?.equipment_name;
    if (eq && !seen2.has(eq)) {
      seen2.add(eq);
      console.log(`  - equipment_name: "${eq}"  |  name: "${h.fields?.name}"`);
    }
  }

  // Now simulate what graph.ts sends
  const userSlugs = [
    "ab-crunch-machine",
    "ab-roller",
    "butterfly-machine",
    "calf-press-machine",
    "chest-press-machine",
    "climbing-rope",
    "circus-bell",
  ];
  const allowedSet = new Set(userSlugs.map((s) => s.toLowerCase()));

  console.log("\n=== Checking if any returned exercises would PASS our current filter ===");
  const allHits = [...machineHits, ...otherHits];
  let passed = 0;
  for (const h of allHits) {
    const eqLower = (h.fields?.equipment_name ?? "").toLowerCase();
    const passes =
      allowedSet.has(eqLower) ||
      Array.from(allowedSet).some(
        (a) => eqLower.includes(a) || a.includes(eqLower),
      );
    if (passes) {
      passed++;
      console.log(`  PASS: "${h.fields?.name}" (equipment_name: "${h.fields?.equipment_name}")`);
    }
  }
  if (passed === 0) {
    console.log("  NONE passed — this is the bug! Slugs don't match Pinecone equipment_name values.");
  }

  // Show what equipment_name values ARE in Pinecone for these exercises
  console.log("\n=== All unique equipment_name values seen in these queries ===");
  const allEq = new Set([...machineHits, ...otherHits].map((h) => h.fields?.equipment_name).filter(Boolean));
  for (const eq of allEq) {
    console.log(`  "${eq}"`);
  }
}

main().catch(console.error);
