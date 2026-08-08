import { config } from "dotenv";
config({ path: ".env.local" });

import { workoutPlanWorkflow } from "../src/lib/workout-generator/graph";

async function runEvals() {
  console.log("=== Running Formal Evals on LangGraph ===\n");

  const edgeCases = [
    {
      name: "Edge Case 1: Pregnant Woman, Home Workout",
      state: {
        goal: "Maintain fitness",
        experience: "Beginner",
        daysPerWeek: 3,
        trainingDays: ["Monday", "Wednesday", "Friday"],
        injuries:
          "7 months pregnant. Cannot do exercises lying flat on back or heavy core compression.",
        equipment: ["Dumbbells", "Exercise Ball", "Bodyweight"],
      },
    },
    {
      name: "Edge Case 2: Advanced Bodybuilder, Full Gym",
      state: {
        goal: "Hypertrophy (Massive Chest and Back)",
        experience: "Advanced",
        daysPerWeek: 5,
        trainingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        injuries: "None",
        equipment: ["Barbell", "Dumbbells", "Cable Machine", "Pull-up Bar"],
      },
    },
  ];

  let passed = 0;

  for (const edgeCase of edgeCases) {
    console.log(`\n>>> EVALUATING: ${edgeCase.name}`);
    try {
      const finalState = await workoutPlanWorkflow.invoke(edgeCase.state);

      if (
        finalState.safetyIssues &&
        finalState.safetyIssues.length > 0 &&
        finalState.retryCount >= 2
      ) {
        console.log(
          `   [FAIL] Workflow could not produce a safe plan after max retries.`,
        );
        console.log(`   [Reason]: ${finalState.safetyIssues[0]}`);
      } else {
        // Merge dailyPlans (planAggregator removed — reducer handles merging)
        const planMap: Record<string, unknown> = {};
        for (const dp of (finalState.dailyPlans ?? []) as Record<string, unknown>[]) {
          if ((dp as any) !== "CLEAR") Object.assign(planMap, dp);
        }
        const preview = JSON.stringify(planMap).substring(0, 200);
        console.log(`   [PASS] Produced safe plan.`);
        console.log(`   [Days]: ${Object.keys(planMap).join(", ")}`);
        console.log(`   [Preview]: ${preview}...`);
        passed++;
      }
    } catch (err) {
      console.error(`   [ERROR] ${err}`);
    }
  }

  console.log(`\n=== Eval Summary: ${passed}/${edgeCases.length} Passed ===`);
}

runEvals().catch(console.error);
