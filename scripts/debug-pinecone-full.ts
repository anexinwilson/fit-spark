/**
 * Full Pinecone field inspection + LangSmith connectivity check.
 * Run: npx tsx scripts/debug-pinecone-full.ts
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
const LANGSMITH_API_KEY: string =
  process.env.LANGSMITH_API_KEY ?? runtimeConfig.LANGSMITH_API_KEY ?? "";

const endpoint = `${PINECONE_INDEX_HOST.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(PINECONE_NAMESPACE)}/search`;

// The user's ACTUAL equipment slugs from Postgres
const USER_SLUGS = [
  "ab-crunch-machine",
  "ab-roller",
  "butterfly-machine",
  "calf-press-machine",
  "chest-press-machine",
  "climbing-rope",
  "circus-bell",
];

// After slug→display resolution (what graph.ts will now send)
const SLUG_TO_DISPLAY: Record<string, string> = {
  "ab-crunch-machine": "Ab Crunch Machine",
  "ab-roller": "Ab Roller",
  "butterfly-machine": "Butterfly Machine",
  "calf-press-machine": "Calf Press Machine",
  "chest-press-machine": "Chest Press Machine",
  "climbing-rope": "Climbing Rope",
  "circus-bell": "Circus Bell",
};

async function queryPinecone(queryText: string, topK = 150) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": PINECONE_API_KEY,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: { inputs: { text: queryText }, top_k: topK },
      fields: [
        "name",
        "equipment_name",
        "equipment_slug",
        "category",
        "level",
        "primary_muscles",
        "secondary_muscles",
        "mechanic",
        "force", "text",
      ],
    }),
  });

  if (!res.ok) throw new Error(`Pinecone ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result?.hits ?? [];
}

async function main() {
  // ── 1. LangSmith check ────────────────────────────────────────────────────
  console.log("=".repeat(60));
  console.log("1. LANGSMITH API KEY CHECK");
  console.log("=".repeat(60));
  if (!LANGSMITH_API_KEY) {
    console.log(
      "❌ LANGSMITH_API_KEY is NOT set in .env.local or FITSPARK_RUNTIME_CONFIG_JSON",
    );
    console.log(
      "   Evals will run but traces won't be uploaded to LangSmith dashboard.",
    );
  } else {
    console.log(
      `✅ LANGSMITH_API_KEY found: ${LANGSMITH_API_KEY.slice(0, 12)}...`,
    );
    // Test connectivity
    const lsRes = await fetch("https://api.smith.langchain.com/info", {
      headers: { "x-api-key": LANGSMITH_API_KEY },
    }).catch(() => null);
    if (lsRes?.ok) {
      console.log("✅ LangSmith API is reachable");
    } else {
      console.log(`❌ LangSmith API returned ${lsRes?.status ?? "error"}`);
    }
  }

  // ── 2. What display names will graph.ts now send? ─────────────────────────
  const displayNames = USER_SLUGS.map((s) => SLUG_TO_DISPLAY[s] ?? s);
  console.log("\n" + "=".repeat(60));
  console.log("2. SLUG → DISPLAY NAME RESOLUTION (what graph.ts now sends)");
  console.log("=".repeat(60));
  USER_SLUGS.forEach((slug, i) => {
    console.log(`  ${slug}  →  ${displayNames[i]}`);
  });

  // ── 3. Query Pinecone with display names ──────────────────────────────────
  const queryText = `exercises using ${displayNames.join(", ")}`;
  console.log("\n" + "=".repeat(60));
  console.log(`3. PINECONE QUERY: "${queryText}"`);
  console.log("=".repeat(60));

  const hits = await queryPinecone(queryText);
  const allowedSet = new Set(displayNames.map((d) => d.toLowerCase()));

  const matching = hits.filter(
    (h: Record<string, unknown>) =>
      allowedSet.has(
        String((h.fields as Record<string, unknown>)?.equipment_name ?? "").toLowerCase(),
      ),
  );

  console.log(`\nTotal hits from Pinecone: ${hits.length}`);
  console.log(`Hits matching user equipment: ${matching.length}`);

  // ── 4. Show ALL fields for 3 matching exercises ───────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("4. FULL FIELD SAMPLE (first 3 matching exercises)");
  console.log("=".repeat(60));
  for (const hit of matching.slice(0, 3)) {
    console.log("\n" + JSON.stringify(hit.fields, null, 2));
  }

  // ── 5. Breakdown by equipment ─────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("5. EXERCISE COUNT PER EQUIPMENT TYPE");
  console.log("=".repeat(60));
  const byEquip: Record<string, number> = {};
  for (const h of matching) {
    const eq = String((h.fields as Record<string, unknown>)?.equipment_name ?? "unknown");
    byEquip[eq] = (byEquip[eq] ?? 0) + 1;
  }
  for (const [eq, count] of Object.entries(byEquip)) {
    console.log(`  ${eq}: ${count} exercises`);
  }

  // ── 6. Show exercise names per equipment ──────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("6. ALL MATCHED EXERCISE NAMES");
  console.log("=".repeat(60));
  for (const [equipName] of Object.entries(byEquip)) {
    const exForEquip = matching
      .filter(
        (h: Record<string, unknown>) =>
          String((h.fields as Record<string, unknown>)?.equipment_name ?? "") === equipName,
      )
      .map((h: Record<string, unknown>) =>
        String((h.fields as Record<string, unknown>)?.name ?? ""),
      );
    console.log(`\n  ${equipName}:`);
    exForEquip.forEach((name: string) => console.log(`    - ${name}`));
  }

  // ── 7. Confirm slug filter would have returned 0 (the old bug) ────────────
  console.log("\n" + "=".repeat(60));
  console.log("7. CONFIRMING OLD BUG (slug filter returned 0)");
  console.log("=".repeat(60));
  const slugSet = new Set(USER_SLUGS.map((s) => s.toLowerCase()));
  const oldMatching = hits.filter((h: Record<string, unknown>) => {
    const eq = String(
      (h.fields as Record<string, unknown>)?.equipment_name ?? "",
    ).toLowerCase();
    return (
      slugSet.has(eq) ||
      Array.from(slugSet).some((s) => eq.includes(s) || s.includes(eq))
    );
  });
  console.log(
    `  Old filter (slugs): ${oldMatching.length} exercises matched ← this was 0, causing hallucination`,
  );
  console.log(
    `  New filter (display names): ${matching.length} exercises matched ← this is the fix`,
  );
}

main().catch(console.error);
