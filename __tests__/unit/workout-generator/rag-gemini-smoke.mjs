import fs from "node:fs";

const envLine = fs
  .readFileSync(".env.local", "utf8")
  .split("\n")
  .find((line) => line.startsWith("FITSPARK_RUNTIME_CONFIG_JSON="));
const config = JSON.parse(envLine.slice("FITSPARK_RUNTIME_CONFIG_JSON=".length));

const pineconeResponse = await fetch(
  `${config.PINECONE_INDEX_HOST}/records/namespaces/${encodeURIComponent(config.PINECONE_NAMESPACE)}/search`,
  {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": config.PINECONE_API_KEY,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: { inputs: { text: "beginner ab crunch machine" }, top_k: 3 },
      fields: ["name", "equipment", "equipment_name", "equipment_aliases", "image_urls", "text"],
    }),
  },
);
if (!pineconeResponse.ok) throw new Error(`Pinecone HTTP ${pineconeResponse.status}`);
const search = await pineconeResponse.json();
const hits = search.result?.hits ?? [];
if (hits.length === 0) throw new Error("Pinecone returned no exercise matches.");

const context = hits
  .map((hit) => JSON.stringify(hit.fields))
  .join("\n");
const geminiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.GEMINI_MODEL)}:generateContent`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": config.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Answer in one concise sentence using only this retrieved exercise context. Mention the best match and its image URL.\n${context}`,
            },
          ],
        },
      ],
    }),
  },
);
if (!geminiResponse.ok) throw new Error(`Gemini HTTP ${geminiResponse.status}`);
const gemini = await geminiResponse.json();
const answer = gemini.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
if (!answer) throw new Error("Gemini returned no answer.");

console.log(`Pinecone matches: ${hits.length}`);
console.log(`GCS image URL present: ${hits.some((hit) => hit.fields?.image_urls?.some((url) => url.includes("storage.googleapis.com")))}`);
console.log(`Explicit equipment name present: ${hits.some((hit) => typeof hit.fields?.equipment_name === "string")}`);
console.log(`Gemini answer: ${answer}`);
