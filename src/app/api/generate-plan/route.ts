import { NextResponse } from "next/server";
import { workoutPlanWorkflow } from "@/features/workout-generator/graph";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fitnessGoal, experienceLevel, trainingDays, limitations, equipment } = body;

    if (!fitnessGoal || !experienceLevel || !trainingDays || trainingDays.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: fitnessGoal, experienceLevel, or trainingDays" },
        { status: 400 }
      );
    }

    console.log("=== API Route: Generating Workout Plan ===");
    console.log(`Goal: ${fitnessGoal}, Experience: ${experienceLevel}`);

    // Initial state for LangGraph
    const initialState = {
      goal: fitnessGoal,
      experience: experienceLevel,
      daysPerWeek: trainingDays.length,
      trainingDays: trainingDays,
      injuries: limitations || "None",
      equipment: equipment ? equipment.split(', ') : ["bodyweight"], 
    };

    // Invoke the LangGraph state machine
    const finalState = await workoutPlanWorkflow.invoke(initialState);

    // If max retries hit and still unsafe
    if (finalState.safetyIssues && finalState.safetyIssues.length > 0) {
      return NextResponse.json(
        { 
          error: "Could not generate a safe plan based on your injuries.",
          details: finalState.safetyIssues[0] 
        },
        { status: 422 }
      );
    }

    // Success! Parse the JSON plan
    let parsedPlan = {};
    try {
      const cleanedStr = finalState.plan?.replace(/```json/g, '').replace(/```/g, '') || "{}";
      parsedPlan = JSON.parse(cleanedStr);
    } catch(e) {
      console.error("Failed to parse LLM JSON:", finalState.plan);
    }

    return NextResponse.json({
      workoutPlan: parsedPlan,
      exercisesUsed: finalState.exercises,
      tokensUsed: "Efficient (Gemini Flash)"
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
