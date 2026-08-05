import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const WorkoutPlanState = Annotation.Root({
  goal: Annotation<string>(),
  experience: Annotation<string>(),
  daysPerWeek: Annotation<number>(),
  injuries: Annotation<string>(),
  equipment: Annotation<string[]>({ default: () => [] }),
  exercises: Annotation<string[]>({ default: () => [] }),
  plan: Annotation<string | null>({ default: () => null }),
  safetyIssues: Annotation<string[]>({ default: () => [] }),
  retryCount: Annotation<number>({ default: () => 0 }),
});

export type WorkoutPlanStateType = typeof WorkoutPlanState.State;

let config: any = {};
if (process.env.FITSPARK_RUNTIME_CONFIG_JSON) {
  try {
    config = JSON.parse(process.env.FITSPARK_RUNTIME_CONFIG_JSON);
  } catch (e) {}
}

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  temperature: 0.4,
  apiKey: config.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
});

async function equipmentResolver(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Resolving Equipment & Profile...");
  // In a real API context, we would get this from Prisma using the auth user ID.
  // For the graph testing/evals, we fall back to state.
  return { equipment: state.equipment || ["bodyweight"] };
}

async function exerciseRetriever(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Retrieving Exercises from Pinecone (RAG)...");
  
  const endpoint = `${config.PINECONE_INDEX_HOST?.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(config.PINECONE_NAMESPACE || 'exercises-v1')}/search`;
  const equipmentQuery = state.equipment?.join(" ") || "bodyweight";
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": config.PINECONE_API_KEY || process.env.PINECONE_API_KEY || "",
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: {
        inputs: { text: `${equipmentQuery} exercises for ${state.goal}, focusing on ${state.injuries || 'general fitness'}` },
        top_k: 30,
      },
      fields: ["name", "equipment_name", "category"],
    }),
  });

  if (!response.ok) {
    console.error("Pinecone search failed");
    return { exercises: ["Pushups"] };
  }

  const data = await response.json();
  const exercises = data.result?.hits?.map((hit: any) => hit.fields.name) || [];
  
  return { exercises };
}

async function planBuilder(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  const currentRetry = state.retryCount || 0;
  console.log(`-> [Node] Building Plan (Attempt ${currentRetry + 1})...`);
  
  const issues = state.safetyIssues || [];
  const safetyContext = issues.length > 0
    ? `\n\nCRITICAL: The previous plan was rejected for these reasons:\n${issues.join("\n")}\nFIX THESE ISSUES.`
    : "";

  const prompt = `You are a certified personal trainer. Create a FULL 7-DAY WORKOUT PLAN based on the following constraints:
Goal: ${state.goal}
Experience: ${state.experience}
Days per Week to Train: ${state.daysPerWeek}
Injuries/Limitations: ${state.injuries || "None"}

Available Equipment: ${(state.equipment || []).join(", ")}
Available Exercises (FROM RAG DATABASE): ${(state.exercises || []).join(", ")}
${safetyContext}

CRITICAL RULES:
1. You MUST outline all 7 days of the week (e.g., Day 1, Day 2... Day 7), clearly labeling rest days.
2. You MUST ONLY use exercises from the "Available Exercises" list above. Do NOT use any exercises outside of this list.

Return a clean, simple 7-day workout plan. Do not use markdown code blocks, just text.`;

  const response = await llm.invoke(prompt);
  return { plan: response.content.toString() };
}

async function safetyEvaluator(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Evaluating Safety...");
  
  const prompt = `You are a strict safety evaluator for workout plans.
User Injuries/Limitations: ${state.injuries || "None"}

Proposed Plan:
${state.plan}

Does this plan contain any exercises that clearly violate the user's injuries or limitations?
If it violates them, explain exactly why in a short sentence.
If it is completely safe, respond with 'PASS'.`;

  const response = await llm.invoke([{ role: "user", content: prompt }]);
  const resultText = response.content.toString().trim();
  
  if (resultText === "PASS" || resultText.includes("PASS")) {
    return { safetyIssues: [] };
  } else {
    return { 
      safetyIssues: [resultText],
      retryCount: (state.retryCount || 0) + 1
    };
  }
}

function shouldRetry(state: WorkoutPlanStateType) {
  const issues = state.safetyIssues || [];
  const retries = state.retryCount || 0;
  
  if (issues.length > 0 && retries < 2) {
    return "planBuilder";
  }
  if (issues.length > 0) {
     return END;
  }
  return END;
}

export const workoutPlanWorkflow = new StateGraph(WorkoutPlanState)
  .addNode("equipmentResolver", equipmentResolver)
  .addNode("exerciseRetriever", exerciseRetriever)
  .addNode("planBuilder", planBuilder)
  .addNode("safetyEvaluator", safetyEvaluator)
  .addEdge("__start__", "equipmentResolver")
  .addEdge("equipmentResolver", "exerciseRetriever")
  .addEdge("exerciseRetriever", "planBuilder")
  .addEdge("planBuilder", "safetyEvaluator")
  .addConditionalEdges("safetyEvaluator", shouldRetry)
  .compile();
