import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Structure for a daily workout plan.
 */
interface DailyWorkoutPlan {
  warmup?: string;
  mainWorkout?: string;
  cooldown?: string;
  cardio?: string;
}

// Generates a personalized multi-day workout plan using the OpenAI API.
// Reads user preferences from the request body and returns a JSON workout plan.
export const POST = async (request: NextRequest) => {
  try {
    // Extracts user preferences from the request body.
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

    // Builds a prompt for OpenAI with all relevant user parameters.
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

    // Requests a workout plan from OpenAI based on user preferences.
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
      // Attempts to parse the returned JSON workout plan.
      parsedWorkoutPlan = JSON.parse(aiContent);
    } catch (parseError) {
      // Returns an error if parsing fails.
      console.error("Error parsing AI response", parseError);
      return NextResponse.json(
        { error: "Failed to parse workout plan." },
        { status: 500 }
      );
    }

    // Ensures the parsed result is an object.
    if (typeof parsedWorkoutPlan !== "object" || parsedWorkoutPlan === null) {
      return NextResponse.json(
        { error: "Failed to parse workout plan." },
        { status: 500 }
      );
    }

    // Returns the generated workout plan to the client.
    return NextResponse.json({ workoutPlan: parsedWorkoutPlan });
  } catch (error: any) {
    // Handles errors from OpenAI or unexpected sources.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
