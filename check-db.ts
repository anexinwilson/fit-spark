import fs from 'fs';
import path from 'path';

// Parse .env.local manually
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  const match = envFile.match(/FITSPARK_RUNTIME_CONFIG_JSON=(.*)/);
  if (match) {
    process.env.FITSPARK_RUNTIME_CONFIG_JSON = match[1];
  }
} catch (e) {
  console.log("No .env.local found or error parsing");
}

import { prisma } from "./src/lib/prisma";

async function main() {
  const sessions = await prisma.workoutSession.findMany({
    include: {
      exercises: {
        include: {
          sets: true
        }
      }
    }
  });

  const completedSetsInfo = [];

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const completedSets = ex.sets.filter(s => s.completed);
      if (completedSets.length > 0) {
        completedSetsInfo.push({
          sessionName: session.name,
          exercise: ex.exerciseName,
          totalSets: ex.sets.length,
          completedSets: completedSets.length,
          setDetails: completedSets.map(s => `Set ${s.setNumber}`)
        });
      }
    }
  }

  console.log("=== COMPLETED SETS IN DATABASE ===");
  if (completedSetsInfo.length === 0) {
    console.log("No completed sets found in any session.");
  } else {
    console.log(JSON.stringify(completedSetsInfo, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
