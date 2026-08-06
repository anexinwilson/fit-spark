import { WorkoutPlanStateType } from "@/lib/workout-generator/state";
import { PineconeHit } from "@/lib/workout-generator/types";
import { getPineconeConfig } from "@/lib/workout-generator/config";

function formatExercise(hit: PineconeHit): string | null {
  const f = hit.fields;
  if (!f?.name) return null;
  return [
    `- ${f.name}`,
    `(Equipment: ${f.equipment_name ?? "?"})`,
    `[Category: ${f.category ?? "?"}]`,
    `[Level: ${f.level ?? "?"}]`,
    `[Primary: ${f.primary_muscles ?? "?"}]`,
    f.secondary_muscles ? `[Secondary: ${f.secondary_muscles}]` : "",
    f.mechanic ? `[Mechanic: ${f.mechanic}]` : "",
    f.force ? `[Force: ${f.force}]` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchExercisesForEquipment(
  equipmentDisplayName: string,
  endpoint: string,
  apiKey: string,
  goal: string,
): Promise<PineconeHit[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: {
        inputs: { text: `${equipmentDisplayName} exercises for ${goal}` },
        top_k: 50,
      },
      fields: [
        "name",
        "equipment_name",
        "equipment_slug",
        "category",
        "level",
        "primary_muscles",
        "secondary_muscles",
        "mechanic",
        "force",
        "text",
      ],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result?.hits ?? []) as PineconeHit[];
}

export async function exerciseRetriever(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Retrieving Exercises from Pinecone (RAG)...");

  const pineconeConfig = getPineconeConfig();
  const host = pineconeConfig.host;
  const namespace = pineconeConfig.namespace;
  const apiKey = pineconeConfig.apiKey;
  const endpoint = `${host.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(namespace)}/search`;

  const displayNames = state.equipment || [];
  const allowedSet = new Set(displayNames.map((e: string) => e.toLowerCase()));
  if (allowedSet.has("bodyweight")) {
    allowedSet.add("none");
    allowedSet.add("unclassified equipment");
  }

  const allHits: PineconeHit[] = [];
  const seenNames = new Set<string>();
  const instructionsMap: Record<string, string[]> = {};

  await Promise.all(
    displayNames.map(async (equipName: string) => {
      const hits = await fetchExercisesForEquipment(
        equipName,
        endpoint,
        apiKey,
        state.goal,
      );
      const filtered = hits.filter(
        (h) =>
          (h.fields?.equipment_name ?? "").toLowerCase() ===
          equipName.toLowerCase(),
      );
      for (const h of filtered) {
        const name = h.fields?.name ?? "";
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          allHits.push(h);

          // Extract instructions from the text field
          const text = h.fields?.text || "";
          const instructionsRaw =
            text.split("Instructions:\\n")[1] ||
            text.split("Instructions:\n")[1] ||
            "";
          const instructions = instructionsRaw
            .split("\\n")
            .flatMap((s: string) => s.split("\n"))
            .filter((line: string) => line.trim().length > 0)
            .map((line: string) => line.replace(/^\\d+\\.\\s*/, "").trim());

          if (instructions.length > 0) {
            instructionsMap[name] = instructions;
          }
        }
      }
    }),
  );

  const exercises = allHits.map(formatExercise).filter(Boolean) as string[];
  console.log(
    `   [RAG] ${exercises.length} unique exercises across ${displayNames.length} equipment types`,
  );
  return { exercises, instructionsMap };
}
