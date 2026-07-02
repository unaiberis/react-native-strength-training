/**
 * Training Session Generator
 *
 * Generates workout sessions with:
 * - Multi-profile support (beginner/intermediate/advanced)
 * - Realistic training frequency (3-6 sessions/week)
 * - Weekly undulation (normal / deload / PR test)
 * - Logistic strength progression with optional plateaus
 * - Guaranteed PR at last PR test week
 * - Streak protection (0% skip in last N weeks)
 * - Logistic accessory progression (not linear)
 * - Variable adherence (occasional missed sessions)
 * - Warmup sets for compound lifts
 * - Seeded PRNG for determinism
 */

import { createPRNG } from '../helpers/prng.mjs';
import {
  getWorkingSet,
  bodyweightSet,
  roundWeight,
  accessoryWeight,
} from './progression.mjs';

// ─── Compound lift names ───────────────────────────────────────────────

const COMPOUND_EXERCISES = new Set([
  'Barbell Back Squat',
  'Barbell Front Squat',
  'Barbell Bench Press',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Romanian Deadlift',
  'Dumbbell Bench Press',
  'Incline Dumbbell Press',
  'Close-Grip Bench Press',
  'Seated Dumbbell Shoulder Press',
  'Leg Press',
  'Hip Thrust',
  'Dumbbell Row',
  'T-Bar Row',
  'Push Press',
]);

// ─── Major lifts for PR guarantee ───────────────────────────────────────

const MAJOR_LIFTS = [
  'Barbell Back Squat',
  'Barbell Bench Press',
  'Deadlift',
  'Overhead Press',
];

// ─── Deload templates ──────────────────────────────────────────────────

const DELOAD_TEMPLATES = new Set([
  'Mobility + Recovery',
  'Core + Conditioning',
]);

// ─── Week type schedule ────────────────────────────────────────────────

function getWeekType(week) {
  const mod8 = ((week % 8) + 8) % 8;
  if (mod8 === 3) return 'deload';
  if (mod8 === 7) return 'pr_test';
  return 'normal';
}

// ─── Session Generator ─────────────────────────────────────────────────

/**
 * @param {Array}  templates       - Template definitions
 * @param {object} templateIds     - template name → PocketBase ID
 * @param {object} exerciseIdMap   - exercise name → PocketBase ID
 * @param {string} userId          - PocketBase user ID
 * @param {object} prng            - Seeded PRNG
 * @param {number} weeks           - Number of weeks
 * @param {object} [options]       - Optional configuration
 * @param {object} [options.progressionOverrides] - Per-profile lift profiles
 * @param {object} [options.plateau] - { startWeek, endWeek }
 * @param {boolean} [options.guaranteePR] - Force new e1RM high at last PR test
 * @param {number} [options.noSkipLastWeeks=0] - Weeks at end with 0% skip
 * @param {boolean} [options.seedDateAuto] - Use dynamic end date
 * @returns {Array} Generated session data
 */
export function generateSessions(
  templates,
  templateIds,
  exerciseIdMap,
  userId,
  prng,
  weeks = 78,
  options = {}
) {
  const {
    progressionOverrides = null,
    plateau = null,
    guaranteePR = false,
    noSkipLastWeeks = 0,
    seedDateAuto = false,
  } = options;

  // Build template exercise map
  const templateDefs = {};
  for (const tmpl of templates) {
    templateDefs[tmpl.name] = tmpl.exercises;
  }

  // Build accessory base weight map
  const exerciseBaseWeight = {};
  for (const tmpl of templates) {
    for (const ex of tmpl.exercises) {
      if (
        !COMPOUND_EXERCISES.has(ex.exerciseName) &&
        !exerciseBaseWeight[ex.exerciseName]
      ) {
        exerciseBaseWeight[ex.exerciseName] = estimateBaseWeight(
          ex.exerciseName
        );
      }
    }
  }

  const generatedSessions = [];
  const now = seedDateAuto ? new Date() : new Date(2026, 5, 30); // June 30, 2026
  const prngClone = createPRNG('pr-guarantee'); // separate PRNG for guarantee logic

  // Track best e1RM per major lift for PR guarantee
  const bestE1RM = {};
  for (const lift of MAJOR_LIFTS) {
    bestE1RM[lift] = 0;
  }

  for (let week = 0; week < weeks; week++) {
    const weekType = getWeekType(week);
    const weekStartDate = new Date(now);
    weekStartDate.setDate(weekStartDate.getDate() - (weeks - week) * 7);

    // Determine sessions this week
    let sessionsThisWeek;
    if (weekType === 'deload') {
      sessionsThisWeek = prng.randomInt(2, 4);
    } else if (weekType === 'pr_test') {
      sessionsThisWeek = prng.randomInt(3, 5);
    } else {
      const base = prng.randomInt(3, 6);
      // Skip rate: 0% if in the no-skip window, 10% otherwise
      const isNoSkipZone = week >= weeks - noSkipLastWeeks;
      sessionsThisWeek = Math.max(
        2,
        base - (isNoSkipZone ? 0 : prng.random() < 0.1 ? 1 : 0)
      );
    }

    const weekSessions = pickWeeklyTemplates(
      templates,
      sessionsThisWeek,
      weekType,
      prng
    );

    for (let sIdx = 0; sIdx < weekSessions.length; sIdx++) {
      const templateName = weekSessions[sIdx];
      const tmplDef = templateDefs[templateName];
      if (!tmplDef || !templateIds[templateName]) continue;

      const sessionDate = new Date(weekStartDate);
      sessionDate.setDate(
        sessionDate.getDate() + Math.floor((sIdx * 7) / sessionsThisWeek)
      );
      sessionDate.setHours(prng.randomInt(5, 20), prng.randomInt(0, 59));

      const notes = generateNotes(weekType, week, templateName);
      const durationMinutes = generateDuration(weekType, tmplDef.length, prng);

      // Generate sets for each exercise
      const exercises = [];
      let setNumber = 1;

      for (const exDef of tmplDef) {
        const {
          exerciseName,
          targetSets,
          targetReps,
          targetRpeLow,
          targetRpeHigh,
        } = exDef;

        // Skip with ~2% probability (except in no-skip zone)
        const isNoSkipZone = week >= weeks - noSkipLastWeeks;
        if (!isNoSkipZone && prng.random() < 0.02) continue;

        let numSets = targetSets;
        if (weekType === 'deload') {
          numSets = Math.max(2, targetSets - 1);
        } else if (
          weekType === 'pr_test' &&
          COMPOUND_EXERCISES.has(exerciseName)
        ) {
          numSets = targetSets + 1;
        }

        const isCompound = COMPOUND_EXERCISES.has(exerciseName);
        const isMajor = MAJOR_LIFTS.includes(exerciseName);

        for (let setIdx = 0; setIdx < numSets; setIdx++) {
          let weight,
            reps,
            rpe,
            isWarmup = false;

          if (isCompound) {
            const setData = getWorkingSet(
              exerciseName,
              week,
              weekType,
              setIdx,
              numSets,
              prng,
              progressionOverrides,
              plateau
            );
            weight = setData.weight;
            reps = setData.reps;
            rpe = setData.rpe;
            isWarmup = setData.isWarmup;

            // Track best e1RM for PR guarantee
            if (!isWarmup && isMajor) {
              const e1rm = weight * (1 + reps / 30);
              if (e1rm > bestE1RM[exerciseName]) {
                bestE1RM[exerciseName] = e1rm;
              }
            }
          } else if (
            exerciseName === 'Plank' ||
            exerciseName === 'Farmer Walk' ||
            exerciseName === 'Cat-Cow Stretch' ||
            exerciseName === "World's Greatest Stretch" ||
            exerciseName === 'Hip Flexor Stretch' ||
            exerciseName === 'Thoracic Spine Rotation' ||
            exerciseName === 'Banded Shoulder Stretch' ||
            exerciseName === 'Standing Pigeon Stretch'
          ) {
            const bw = bodyweightSet(weekType, setIdx, numSets, prng);
            weight = bw.weight;
            reps = bw.reps;
            rpe = bw.rpe;
          } else {
            // Accessory with logistic progression
            const baseWeight = exerciseBaseWeight[exerciseName] || 15;
            const endWeight = roundWeight(baseWeight * 1.4, 1.25);
            weight = accessoryWeight(baseWeight, week, weeks, endWeight, prng);
            reps = Math.max(6, targetReps + Math.round(prng.gaussian() * 1));
            rpe = Math.max(
              1,
              Math.min(
                10,
                Math.round(
                  (targetRpeLow +
                    (setIdx / Math.max(1, numSets)) * 2 +
                    prng.gaussian() * 0.3) *
                    2
                ) / 2
              )
            );
          }

          weight = Math.max(0, weight);
          reps = Math.max(1, reps);

          const exerciseId = exerciseIdMap[exerciseName];
          if (!exerciseId) continue;

          exercises.push({
            exerciseId,
            setNumber: setNumber++,
            weight_kg: weight,
            reps,
            rpe: Math.round(rpe * 2) / 2,
            is_warmup: isWarmup,
          });
        }
      }

      // PR guarantee: if this is the last PR test week, inject a PR set
      if (
        guaranteePR &&
        weekType === 'pr_test' &&
        isLastPRTestWeek(week, weeks)
      ) {
        const injected = injectPRSets(
          exercises,
          exerciseIdMap,
          bestE1RM,
          prngClone,
          progressionOverrides,
          plateau,
          week
        );
        if (injected) {
          // Pin last session date to now when dynamic
          const lastSessionDate =
            isLastSessionOverall(week, weeks, sIdx, weekSessions.length) &&
            seedDateAuto
              ? now.toISOString()
              : sessionDate.toISOString();
          generatedSessions.push({
            userId,
            workoutTemplateId: templateIds[templateName],
            templateName,
            startedAt: lastSessionDate,
            durationMinutes,
            notes: notes + ' 🔥 NEW PR!',
            exercises: [...exercises, ...injected],
            status: 'completed',
          });
          continue;
        }
      }

      if (exercises.length > 0) {
        // Pin last session date to now when dynamic
        const lastSessionDate =
          isLastSessionOverall(week, weeks, sIdx, weekSessions.length) &&
          seedDateAuto
            ? now.toISOString()
            : sessionDate.toISOString();
        generatedSessions.push({
          userId,
          workoutTemplateId: templateIds[templateName],
          templateName,
          startedAt: lastSessionDate,
          durationMinutes,
          notes,
          exercises,
          status: 'completed',
        });
      }
    }
  }

  return generatedSessions;
}

// ─── PR Guarantee ───────────────────────────────────────────────────────

/**
 * Check if this week is the last PR test week in the program.
 */
function isLastPRTestWeek(week, totalWeeks) {
  // Find all PR test weeks and return true for the last one
  for (let w = totalWeeks - 1; w >= 0; w--) {
    if (getWeekType(w) === 'pr_test') return w === week;
  }
  return false;
}

/**
 * Check if this is the very last session in the entire program.
 * Used by SEED_DATE=auto to pin the final session date to today.
 */
function isLastSessionOverall(week, totalWeeks, sessionIdx, sessionsThisWeek) {
  return week === totalWeeks - 1 && sessionIdx === sessionsThisWeek - 1;
}

/**
 * Inject sets that guarantee a new e1RM PR for at least one major lift.
 */
function injectPRSets(
  exercises,
  exerciseIdMap,
  bestE1RM,
  prng,
  progressionOverrides,
  plateau,
  week
) {
  const injected = [];

  // Pick the major lift with the oldest/best opportunity for PR
  // Sort by current best e1RM ascending to find the one that needs the boost
  const liftsNeedingPR = MAJOR_LIFTS.filter(
    (l) => bestE1RM[l] > 0 && exerciseIdMap[l]
  );
  if (liftsNeedingPR.length === 0) return null;

  // Pick the lift closest to a nice round PR number
  const targetLift = liftsNeedingPR.sort((a, b) => {
    const currentBest = bestE1RM[a];
    const nextPR = Math.ceil(currentBest / 2.5) * 2.5 + 2.5; // next plate increment
    return (
      nextPR -
      currentBest -
      (Math.ceil(bestE1RM[b] / 2.5) * 2.5 + 2.5 - bestE1RM[b])
    );
  })[0];

  const currentBest = bestE1RM[targetLift];
  const prWeight = Math.ceil(currentBest / (1 + 5 / 30) / 2.5) * 2.5 + 2.5; // weight for 5 reps that beats current e1RM

  // Find the highest set_number from existing exercises
  const maxSetNum = exercises.reduce((m, e) => Math.max(m, e.setNumber), 0);

  // Add a PR attempt set
  injected.push({
    exerciseId: exerciseIdMap[targetLift],
    setNumber: maxSetNum + 1,
    weight_kg: prWeight,
    reps: 5,
    rpe: 9.5,
    is_warmup: false,
  });

  // Also add a second heavy single for safety
  injected.push({
    exerciseId: exerciseIdMap[targetLift],
    setNumber: maxSetNum + 2,
    weight_kg: roundWeight(prWeight * 1.05),
    reps: 3,
    rpe: 10.0,
    is_warmup: false,
  });

  return injected;
}

// ─── Template Selection ─────────────────────────────────────────────────

function pickWeeklyTemplates(templates, count, weekType, prng) {
  const allNames = templates.map((t) => t.name);

  if (weekType === 'deload') {
    const recoveryNames = templates
      .filter((t) => DELOAD_TEMPLATES.has(t.name))
      .map((t) => t.name);
    const normalNames = templates
      .filter((t) => !DELOAD_TEMPLATES.has(t.name))
      .map((t) => t.name);

    let picks = [...recoveryNames];
    const remaining = count - picks.length;

    if (remaining > 0) {
      const shuffledNormal = prng.shuffle(normalNames);
      picks = picks.concat(
        shuffledNormal.slice(0, Math.min(remaining, shuffledNormal.length))
      );
    }

    if (picks.length < count) {
      const extra = prng.shuffle(allNames).slice(0, count - picks.length);
      picks = picks.concat(extra);
    }

    return picks.slice(0, count);
  }

  const shuffled = prng.shuffle(allNames);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ─── Duration Generator ─────────────────────────────────────────────────

function generateDuration(weekType, exerciseCount, prng) {
  const base = exerciseCount * 7;
  if (weekType === 'deload') return Math.round(base * 0.6 + prng.random() * 10);
  if (weekType === 'pr_test')
    return Math.round(base * 1.1 + prng.random() * 10);
  return Math.round(base + prng.random() * 15 - 5);
}

// ─── Notes Generator ────────────────────────────────────────────────────

function generateNotes(weekType, week, templateName) {
  const options = {
    normal: [
      'Solid session. Felt strong throughout.',
      'Good pump today. Focused on mind-muscle connection.',
      'Moved well. Working on bar path control.',
      'Tough session but got through it all.',
      'Felt a bit fatigued but hit all prescribed reps.',
      'Great session. Progressive overload working well.',
      'Form felt dialed in. Controlled negatives.',
      'Energy was low but technique held up.',
      'Nice session. Added weight on the main lift.',
      'Focused on tempo. Slow eccentric, explosive concentric.',
    ],
    deload: [
      'Deload week. Light weights, focusing on technique.',
      'Recovery session. Working on form and bar path.',
      'Light week. Good to give the CNS a break.',
      'Deload. Felt fresh and ready for next block.',
    ],
    pr_test: [
      'PR test week. Felt strong on the main lift.',
      'Testing max strength. Went for a new PR.',
      'Peak week. Everything felt heavy but moved well.',
      'PR attempt. Good depth and bar speed.',
    ],
  };

  const pool = options[weekType] || options.normal;
  const idx = (week + templateName.length) % pool.length;
  return pool[idx];
}

// ─── Base Weight Estimation ─────────────────────────────────────────────

function estimateBaseWeight(exerciseName) {
  const weights = {
    'Dumbbell Lateral Raise': 8,
    'Cable Lateral Raise': 6,
    'Front Raise': 10,
    'Reverse Fly': 10,
    'Dumbbell Fly': 14,
    'Cable Crossover': 12,
    'Face Pull': 12,
    'Tricep Pushdown': 18,
    'Overhead Tricep Extension': 16,
    'Skull Crusher': 20,
    'Tricep Kickback': 8,
    'Barbell Curl': 25,
    'Dumbbell Hammer Curl': 12,
    'Incline Dumbbell Curl': 10,
    'Cable Bicep Curl': 15,
    'Concentration Curl': 10,
    'Preacher Curl': 20,
    'Leg Extension': 40,
    'Leg Curl': 35,
    'Seated Leg Curl': 35,
    'Nordic Curl': 0,
    'Dumbbell Hamstring Curl': 10,
    'Standing Calf Raise': 80,
    'Seated Calf Raise': 50,
    'Donkey Calf Raise': 60,
    'Bulgarian Split Squat': 20,
    'Goblet Squat': 24,
    'Walking Lunge': 16,
    'Step Up': 16,
    'Cable Pull Through': 25,
    'Glute Bridge': 40,
    'Cable Woodchop': 15,
    'Pallof Press': 10,
    'Kettlebell Swing': 24,
    'Kettlebell Snatch': 16,
    'Push Up': 0,
    'Chest Dip': 0,
    'Pull Up': 0,
    Plank: 0,
    'Hanging Leg Raise': 0,
    'Ab Wheel Rollout': 0,
    'Dead Bug': 0,
    'Russian Twist': 10,
    'Farmer Walk': 30,
    Burpee: 0,
    'Box Jump': 0,
    'Jump Rope': 0,
    'Cat-Cow Stretch': 0,
    "World's Greatest Stretch": 0,
    'Hip Flexor Stretch': 0,
    'Thoracic Spine Rotation': 0,
    'Banded Shoulder Stretch': 0,
    'Standing Pigeon Stretch': 0,
    'Rowing Machine': 0,
    'Assault Bike Sprint': 0,
    'Ski Erg': 0,
    // Missing from original set — added for demo completeness
    'Lat Pulldown': 40,
    'Seated Cable Row': 35,
    'Decline Bench Press': 50,
    'Arnold Press': 16,
  };
  return weights[exerciseName] || 10;
}
