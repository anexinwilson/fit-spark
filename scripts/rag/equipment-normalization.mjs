const BASE_EQUIPMENT = {
  "body only": { slug: "bodyweight", name: "Bodyweight" },
  bands: { slug: "resistance-bands", name: "Resistance Bands" },
  barbell: { slug: "barbell", name: "Barbell" },
  cable: { slug: "cable-machine", name: "Cable Machine" },
  dumbbell: { slug: "dumbbells", name: "Dumbbells" },
  "e-z curl bar": { slug: "ez-curl-bar", name: "EZ Curl Bar" },
  "exercise ball": { slug: "exercise-ball", name: "Exercise Ball" },
  "foam roll": { slug: "foam-roller", name: "Foam Roller" },
  kettlebells: { slug: "kettlebell", name: "Kettlebell" },
  "medicine ball": { slug: "medicine-ball", name: "Medicine Ball" },
};

const NAME_RULES = [
  ["ab-crunch-machine", "Ab Crunch Machine", /ab crunch/],
  [
    "stationary-bike",
    "Stationary Bike",
    /bicycling, stationary|stationary bike|recumbent bike/,
  ],
  ["butterfly-machine", "Butterfly Machine", /butterfly/],
  ["calf-press-machine", "Calf Press Machine", /calf press/],
  ["calf-raise-machine", "Calf Raise Machine", /calf raise|standing calf/],
  ["dip-machine", "Dip Machine", /dip machine/],
  ["resistance-bands", "Resistance Bands", /band assisted pull-up/],
  ["assisted-pull-up-machine", "Assisted Pull-Up Machine", /assisted pull-up/],
  ["smith-machine", "Smith Machine", /smith press/],
  ["elliptical-trainer", "Elliptical Trainer", /elliptical/],
  ["glute-ham-developer", "Glute Ham Developer", /glute ham/],
  ["hack-squat-machine", "Hack Squat Machine", /hack squat/],
  ["treadmill", "Treadmill", /treadmill/],
  ["leg-extension-machine", "Leg Extension Machine", /leg extension/],
  ["leg-press-machine", "Leg Press Machine", /leg press/],
  [
    "chest-press-machine",
    "Chest Press Machine",
    /chest press|machine bench press|leverage decline chest press|leverage incline chest press/,
  ],
  ["high-row-machine", "High Row Machine", /high row/],
  ["iso-row-machine", "Iso Row Machine", /iso row/],
  [
    "shoulder-press-machine",
    "Shoulder Press Machine",
    /shoulder.*press|military.*press/,
  ],
  ["shrug-machine", "Shrug Machine", /shrug/],
  [
    "leverage-deadlift-machine",
    "Leverage Deadlift Machine",
    /leverage deadlift/,
  ],
  ["leg-curl-machine", "Leg Curl Machine", /leg curl/],
  ["machine-squat", "Machine Squat", /machine squat/],
  ["t-bar-row-machine", "T-Bar Row Machine", /t-bar row/],
  ["biceps-curl-machine", "Biceps Curl Machine", /bicep curl|preacher curl/],
  [
    "triceps-extension-machine",
    "Triceps Extension Machine",
    /triceps extension/,
  ],
  ["reverse-fly-machine", "Reverse Fly Machine", /reverse machine fly/],
  ["rowing-machine", "Rowing Machine", /rowing, stationary/],
  ["smith-machine", "Smith Machine", /smith machine|smith single-leg/],
  ["stair-machine", "Stair Machine", /stairmaster|step mill|power stairs/],
  [
    "reverse-hyperextension-machine",
    "Reverse Hyperextension Machine",
    /reverse hyperextension/,
  ],
  ["thigh-abductor-machine", "Thigh Abductor Machine", /thigh abductor/],
  ["thigh-adductor-machine", "Thigh Adductor Machine", /thigh adductor/],
  ["ab-roller", "Ab Roller", /ab roller/],
  ["atlas-stones", "Atlas Stones", /atlas stone/],
  ["balance-board", "Balance Board", /balance board/],
  ["battling-ropes", "Battling Ropes", /battling ropes/],
  [
    "plyometric-box",
    "Plyometric Box",
    /box jump|box skip|box shuffle|high box squat/,
  ],
  ["chains", "Chains", /chain handle|chain press/],
  ["circus-bell", "Circus Bell", /circus bell/],
  ["conans-wheel", "Conan's Wheel", /conan.s wheel/],
  ["heavy-bag", "Heavy Bag", /heavy bag/],
  ["head-harness", "Head Harness", /head harness/],
  ["keg", "Keg", /keg load/],
  ["log", "Log", /log lift/],
  [
    "parallel-bars",
    "Parallel Bars",
    /parallel bars|parallel bar dip|dips - chest version/,
  ],
  [
    "weight-plates",
    "Weight Plates",
    /plate raise|plate neck|plate pinch|plate twist|olympic plate|plate curls/,
  ],
  [
    "pull-up-bar",
    "Pull-Up Bar",
    /pull-ups|pullup|chin-up|chin up|chins|mixed grip chin|weighted pull ups|one handed hang/,
  ],
  ["sled", "Sled", /sled|prowler/],
  ["rickshaw", "Rickshaw", /rickshaw/],
  ["gymnastics-rings", "Gymnastics Rings", /ring dips/],
  ["sandbag", "Sandbag", /sandbag/],
  ["sledgehammer", "Sledgehammer", /sledgehammer/],
  ["suspension-trainer", "Suspension Trainer", /suspended|straps/],
  ["tire", "Tire", /tire flip/],
  ["trap-bar", "Trap Bar", /trap bar/],
  ["wrist-roller", "Wrist Roller", /wrist roller/],
  ["yoke", "Yoke", /yoke walk/],
  ["jump-rope", "Jump Rope", /rope jumping/],
  ["climbing-rope", "Climbing Rope", /rope climb/],
  [
    "chair",
    "Chair",
    /chair squat|chair leg extended stretch|chair upper body stretch/,
  ],
  [
    "hyperextension-bench",
    "Hyperextension Bench",
    /hyperextensions \(back extensions\)/,
  ],
  ["slide-board", "Slide Board", /platform hamstring slides/],
  [
    "resistance-bands",
    "Resistance Bands",
    /seated band hamstring curl|weighted sit-ups - with bands/,
  ],
  ["weight-plates", "Weight Plates", /svend press/],
];

export function normalizeEquipment(exercise) {
  const raw =
    typeof exercise.equipment === "string"
      ? exercise.equipment.trim().toLowerCase()
      : "";
  const name =
    typeof exercise.name === "string" ? exercise.name.trim().toLowerCase() : "";

  if (raw !== "machine" && raw !== "other") {
    const base = BASE_EQUIPMENT[raw];
    return base
      ? { ...base, aliases: [raw, base.name.toLowerCase()], sourceValue: raw }
      : null;
  }

  const match = NAME_RULES.find(([, , pattern]) => pattern.test(name));
  if (!match) return null;

  const [slug, displayName] = match;
  return {
    slug,
    name: displayName,
    aliases: [raw, name],
    sourceValue: raw,
  };
}
