import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DailyWorkoutPlan {
  warmup?: string;
  mainWorkout?: string;
  cooldown?: string;
  cardio?: string;
}

export const POST = async (request: NextRequest) => {
  try {
    const {
      workoutType,
      fitnessGoal,
      experienceLevel,
      preferredDuration,
      includeCardio,
      days,
      ageRange,
      equipment,
      limitations,
      daysPerWeek,
    } = await request.json();

    const prompt = `You are a certified fitness trainer.
    Generate a personalized ${daysPerWeek}-day workout plan for a user with the following preferences:
    - Workout Type: ${workoutType}
    - Fitness Goal: ${fitnessGoal}
    - Experience Level: ${experienceLevel}
    - Age: ${ageRange}
    - Equipment: ${equipment}
    - Limitations: ${limitations || "None"}
    - Days per week: ${daysPerWeek}
    - Daily Duration: ${preferredDuration} minutes
    - Include Cardio: ${includeCardio ? "Yes" : "No"}

    Each day should include the following keys in camelCase format:
    - warmup
    - mainWorkout
    - cooldown
    ${includeCardio ? "- cardio" : ""}

    Return the result as a JSON object where the keys are the days of the week starting from Monday, e.g. "Monday", "Tuesday", ..., up to the number of days requested.
    - Dont workout if the user is giving more than 3 day availability, dont workout the same body part without a brake of 48 hours.
    - Humanise the input so that a person understand.
    - Words should have proper spacing
    **Output only JSON. No markdown, no explanations.**`;

    const response = await openAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiContent = response.choices[0].message.content!.trim();

    let parsedWorkoutPlan: { [day: string]: DailyWorkoutPlan };

    try {
      parsedWorkoutPlan = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("Error parsing AI response", parseError);
      return NextResponse.json(
        { error: "Failed to parse workout plan." },
        { status: 500 }
      );
    }

    if (typeof parsedWorkoutPlan !== "object" || parsedWorkoutPlan === null) {
      return NextResponse.json(
        { error: "Failed to parse workout plan." },
        { status: 500 }
      );
    }

    return NextResponse.json({ workoutPlan: parsedWorkoutPlan });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
