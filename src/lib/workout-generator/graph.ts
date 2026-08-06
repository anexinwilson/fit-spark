import { StateGraph } from "@langchain/langgraph";
import { WorkoutPlanState } from "@/lib/workout-generator/state";
import { equipmentResolver } from "@/lib/workout-generator/nodes/equipmentResolver";
import { exerciseRetriever } from "@/lib/workout-generator/nodes/exerciseRetriever";
import { muscleGapAnalyzer } from "@/lib/workout-generator/nodes/muscleGapAnalyzer";
import { skeletonArchitect } from "@/lib/workout-generator/nodes/skeletonArchitect";
import { dailyPlanBuilder } from "@/lib/workout-generator/nodes/dailyPlanBuilder";
import { safetyEvaluator } from "@/lib/workout-generator/nodes/safetyEvaluator";
import {
  shouldSpawnDays,
  shouldRetry,
} from "@/lib/workout-generator/nodes/routing";

/**
 * LangGraph workout plan workflow.
 *
 * Architecture:
 *   START
 *     → equipmentResolver   (zero LLM — slug → display name)
 *     → exerciseRetriever   (zero LLM — Pinecone RAG, parallel per equipment)
 *     → muscleGapAnalyzer   (zero LLM — JS lookup table, ~1ms)
 *     → skeletonArchitect   (1x LLM — assigns exercises to days)
 *     → [Send × N days]     (N parallel LLM calls — one per training day)
 *     → safetyEvaluator     (zero LLM — programmatic compliance checks)
 *     → END  (or retry → skeletonArchitect if violations found, max 2 retries)
 *
 * Key improvements:
 *  - planAggregator removed: the dailyPlans reducer handles merging automatically
 *  - retryPolicy on LLM nodes: built-in exponential backoff, no manual retryCount
 *  - config.writer in nodes: streams live progress events to the UI
 *  - instructionsMap passed via Send: each day self-injects Pinecone instructions
 */
const workflow = new StateGraph(WorkoutPlanState)
  // Non-LLM nodes — fast, no retry needed
  .addNode("equipmentResolver", equipmentResolver)
  .addNode("exerciseRetriever", exerciseRetriever)
  .addNode("muscleGapAnalyzer", muscleGapAnalyzer)

  // LLM nodes — retryPolicy handles 429s and transient errors automatically
  .addNode("skeletonArchitect", skeletonArchitect, {
    retryPolicy: {
      maxAttempts: 3,
      retryOn: (e: unknown) => {
        const status = (e as any)?.status;
        const message = (e as any)?.message ?? "";
        // If it's a hard rate limit/quota, abort immediately. 
        if (status === 429 || message.includes("quota")) return false;
        return status >= 500;
      },
    },
  })
  .addNode("dailyPlanBuilder", dailyPlanBuilder, {
    retryPolicy: {
      maxAttempts: 3,
      retryOn: (e: unknown) => {
        const status = (e as any)?.status;
        const message = (e as any)?.message ?? "";
        // If it's a hard rate limit/quota, abort immediately.
        if (status === 429 || message.includes("quota")) return false;
        return status >= 500;
      },
    },
  })

  // Programmatic safety node — no retry needed
  .addNode("safetyEvaluator", safetyEvaluator)

  // Edges
  .addEdge("__start__", "equipmentResolver")
  .addEdge("equipmentResolver", "exerciseRetriever")
  .addEdge("exerciseRetriever", "muscleGapAnalyzer")
  .addEdge("muscleGapAnalyzer", "skeletonArchitect")
  .addConditionalEdges("skeletonArchitect", shouldSpawnDays)
  // dailyPlanBuilder → safetyEvaluator (reducer auto-merges parallel outputs)
  .addEdge("dailyPlanBuilder", "safetyEvaluator")
  .addConditionalEdges("safetyEvaluator", shouldRetry);

export const workoutPlanWorkflow = workflow.compile();
