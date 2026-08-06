import { WorkoutPlanStateType } from "@/lib/workout-generator/state";

const EQUIPMENT_MUSCLE_MAP: Record<string, string[]> = {
  "Chest Press Machine": ["chest", "shoulders", "triceps"],
  "Butterfly Machine": ["chest"],
  "Ab Crunch Machine": ["core"],
  "Ab Roller": ["core", "shoulders"],
  "Calf Press Machine": ["calves"],
  "Calf Raise Machine": ["calves"],
  "Climbing Rope": ["back", "biceps", "forearms", "shoulders"],
  "Circus Bell": ["shoulders", "traps", "triceps", "core"],
  Barbell: ["chest", "back", "legs", "shoulders", "arms"],
  "Cable Machine": ["chest", "back", "shoulders", "arms", "core"],
  Dumbbells: ["chest", "back", "shoulders", "arms", "legs"],
  Kettlebell: ["legs", "back", "core", "shoulders"],
  "Leg Press Machine": ["legs"],
  "Leg Extension Machine": ["legs"],
  "Leg Curl Machine": ["legs"],
  "Pull-Up Bar": ["back", "biceps"],
  "Assisted Pull-Up Machine": ["back", "biceps"],
  "Shoulder Press Machine": ["shoulders", "triceps"],
  "Biceps Curl Machine": ["biceps"],
  "Triceps Extension Machine": ["triceps"],
  "High Row Machine": ["back"],
  "Iso Row Machine": ["back"],
  "T-Bar Row Machine": ["back"],
  "Hack Squat Machine": ["legs"],
  "Smith Machine": ["legs", "chest", "shoulders"],
  "Rowing Machine": ["back", "legs", "core"],
  Bodyweight: ["chest", "back", "legs", "core", "shoulders", "arms"],
};

const ALL_MUSCLE_GROUPS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "calves",
];

// Equipment the gym likely has that covers missing groups
const EQUIPMENT_SUGGESTIONS: Record<string, string[]> = {
  back: ["Cable Machine", "Pull-Up Bar", "Barbell", "High Row Machine"],
  legs: [
    "Leg Press Machine",
    "Leg Extension Machine",
    "Leg Curl Machine",
    "Barbell",
  ],
  shoulders: ["Shoulder Press Machine", "Dumbbells", "Cable Machine"],
  arms: [
    "Biceps Curl Machine",
    "Triceps Extension Machine",
    "Cable Machine",
    "Dumbbells",
  ],
  chest: ["Barbell", "Dumbbells", "Cable Machine"],
  core: ["Cable Machine", "Bodyweight"],
};

export async function muscleGapAnalyzer(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Analyzing Muscle Group Coverage...");

  const displayNames = state.equipment || [];

  // Find which muscle groups the user's equipment covers
  const coveredSet = new Set<string>();
  for (const eq of displayNames) {
    const muscles = EQUIPMENT_MUSCLE_MAP[eq] ?? [];
    muscles.forEach((m) => coveredSet.add(m));
  }

  const coveredGroups = ALL_MUSCLE_GROUPS.filter((g) => coveredSet.has(g));
  const missingGroups = ALL_MUSCLE_GROUPS.filter((g) => !coveredSet.has(g));

  // Build a label for the plan focus
  const focusLabel =
    coveredGroups.length <= 3
      ? coveredGroups
          .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
          .join(", ") + " Specialist"
      : "Upper Body & Conditioning";

  // Build equipment suggestions for missing groups
  const suggestedEquipment = Array.from(
    new Set(missingGroups.flatMap((g) => EQUIPMENT_SUGGESTIONS[g] ?? [])),
  ).slice(0, 5);

  // Build the coach message
  let coachMessage = "";
  if (missingGroups.length === 0) {
    coachMessage = `Great equipment selection! Your setup covers all major muscle groups. I'll build you a balanced full-body program.`;
  } else {
    const missing = missingGroups
      .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
      .join(", ");
    const suggestions = suggestedEquipment.join(", ");
    coachMessage =
      `Your current equipment focuses on: **${coveredGroups.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}**. ` +
      `You don't have exercises for: **${missing}**. ` +
      `I'll build the best plan possible with what you have. ` +
      `To train all muscle groups, consider adding to your profile: **${suggestions}** — or enable Bodyweight exercises which cover everything.`;
  }

  console.log(`   [muscleGapAnalyzer] Covered: ${coveredGroups.join(", ")}`);
  console.log(
    `   [muscleGapAnalyzer] Missing: ${missingGroups.join(", ") || "none"}`,
  );

  return {
    coachInsight: {
      coveredGroups,
      missingGroups,
      focusLabel,
      coachMessage,
      suggestedEquipment,
    },
  };
}
