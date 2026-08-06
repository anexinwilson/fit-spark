import { WorkoutPlanStateType } from "@/lib/workout-generator/state";

const SLUG_TO_DISPLAY: Record<string, string> = {
  bodyweight: "Bodyweight",
  "body-only": "Bodyweight",
  barbell: "Barbell",
  "cable-machine": "Cable Machine",
  dumbbells: "Dumbbells",
  dumbbell: "Dumbbells",
  "ez-curl-bar": "EZ Curl Bar",
  "exercise-ball": "Exercise Ball",
  "foam-roller": "Foam Roller",
  kettlebell: "Kettlebell",
  "medicine-ball": "Medicine Ball",
  "resistance-bands": "Resistance Bands",
  "ab-crunch-machine": "Ab Crunch Machine",
  "ab-roller": "Ab Roller",
  "assisted-pull-up-machine": "Assisted Pull-Up Machine",
  "atlas-stones": "Atlas Stones",
  "balance-board": "Balance Board",
  "battling-ropes": "Battling Ropes",
  "biceps-curl-machine": "Biceps Curl Machine",
  "butterfly-machine": "Butterfly Machine",
  "calf-press-machine": "Calf Press Machine",
  "calf-raise-machine": "Calf Raise Machine",
  chains: "Chains",
  chair: "Chair",
  "chest-press-machine": "Chest Press Machine",
  "circus-bell": "Circus Bell",
  "climbing-rope": "Climbing Rope",
  "conans-wheel": "Conan's Wheel",
  "dip-machine": "Dip Machine",
  "elliptical-trainer": "Elliptical Trainer",
  "glute-ham-developer": "Glute Ham Developer",
  "gymnastics-rings": "Gymnastics Rings",
  "hack-squat-machine": "Hack Squat Machine",
  "head-harness": "Head Harness",
  "heavy-bag": "Heavy Bag",
  "high-row-machine": "High Row Machine",
  "hyperextension-bench": "Hyperextension Bench",
  "iso-row-machine": "Iso Row Machine",
  "jump-rope": "Jump Rope",
  keg: "Keg",
  "leg-curl-machine": "Leg Curl Machine",
  "leg-extension-machine": "Leg Extension Machine",
  "leg-press-machine": "Leg Press Machine",
  log: "Log",
  "machine-squat": "Machine Squat",
  "parallel-bars": "Parallel Bars",
  "plyometric-box": "Plyometric Box",
  "pull-up-bar": "Pull-Up Bar",
  "reverse-fly-machine": "Reverse Fly Machine",
  "reverse-hyperextension-machine": "Reverse Hyperextension Machine",
  rickshaw: "Rickshaw",
  "rowing-machine": "Rowing Machine",
  sandbag: "Sandbag",
  "shoulder-press-machine": "Shoulder Press Machine",
  "shrug-machine": "Shrug Machine",
  sledgehammer: "Sledgehammer",
  "slide-board": "Slide Board",
  sled: "Sled",
  "smith-machine": "Smith Machine",
  "stair-machine": "Stair Machine",
  "stationary-bike": "Stationary Bike",
  "suspension-trainer": "Suspension Trainer",
  "t-bar-row-machine": "T-Bar Row Machine",
  "thigh-abductor-machine": "Thigh Abductor Machine",
  "thigh-adductor-machine": "Thigh Adductor Machine",
  tire: "Tire",
  "trap-bar": "Trap Bar",
  treadmill: "Treadmill",
  "triceps-extension-machine": "Triceps Extension Machine",
  "weight-plates": "Weight Plates",
  "wrist-roller": "Wrist Roller",
  yoke: "Yoke",
};

function resolveSlug(slug: string): string {
  return SLUG_TO_DISPLAY[slug.toLowerCase()] ?? slug;
}

export async function equipmentResolver(
  state: WorkoutPlanStateType,
): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Resolving Equipment & Profile...");
  const rawSlugs = state.equipment ?? [];
  const displayNames = rawSlugs.map(resolveSlug);
  console.log(
    `   [equipmentResolver] ${rawSlugs.length} slugs → ${displayNames.join(", ")}`,
  );
  return { equipment: displayNames };
}
