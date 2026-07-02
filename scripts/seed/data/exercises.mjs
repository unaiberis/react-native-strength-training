/**
 * Exercise Definitions
 *
 * 80 exercises across 12 categories with complete field data.
 * Every exercise has: name, category, body_region, description,
 * default_sets, default_reps, default_rest_seconds, is_public, equipment.
 */

export const EXERCISES = [
  // ════════════════════════════════════════════════
  // CHEST
  // ════════════════════════════════════════════════
  {
    name: 'Barbell Bench Press',
    category: 'chest',
    body_region: 'upper',
    description:
      'Flat barbell bench press. Primary chest builder. Lower the bar to mid-chest, press to lockout.',
    default_sets: 4,
    default_reps: 8,
    default_rest_seconds: 120,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Dumbbell Bench Press',
    category: 'chest',
    body_region: 'upper',
    description:
      'Flat dumbbell bench press. Allows greater ROM than barbell. Palms facing forward at top.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Incline Barbell Bench Press',
    category: 'chest',
    body_region: 'upper',
    description:
      'Barbell press on 30-45 degree incline. Targets upper chest and front delts.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Incline Dumbbell Press',
    category: 'chest',
    body_region: 'upper',
    description:
      'Dumbbell press on incline bench. Upper chest emphasis with neutral grip option.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Decline Bench Press',
    category: 'chest',
    body_region: 'upper',
    description:
      'Barbell press on decline bench. Emphasizes lower chest fibers.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Dumbbell Fly',
    category: 'chest',
    body_region: 'upper',
    description:
      'Flat dumbbell fly. Stretch chest on descent, squeeze at top. Slight bend in elbows.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Cable Crossover',
    category: 'chest',
    body_region: 'upper',
    description:
      'Standing cable fly. High-to-low or low-to-high. Constant tension on chest.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Push Up',
    category: 'chest',
    body_region: 'upper',
    description:
      'Bodyweight push up. Hands shoulder-width, core tight, full ROM. Can be done anywhere.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Chest Dip',
    category: 'chest',
    body_region: 'upper',
    description:
      'Parallel bar dip. Lean forward for chest emphasis. Lower until shoulders are below elbows.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Machine Chest Press',
    category: 'chest',
    body_region: 'upper',
    description:
      'Seated machine chest press. Good for isolation and controlled reps.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // BACK
  // ════════════════════════════════════════════════
  {
    name: 'Barbell Row',
    category: 'back',
    body_region: 'upper',
    description:
      'Bent-over barbell row. 45-degree hinge, pull bar to lower ribcage. Squeeze lats.',
    default_sets: 4,
    default_reps: 8,
    default_rest_seconds: 120,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Pull Up',
    category: 'back',
    body_region: 'upper',
    description:
      'Pull up with overhand grip. Hands slightly wider than shoulder-width. Full extension to chin over bar.',
    default_sets: 3,
    default_reps: 8,
    default_rest_seconds: 90,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Lat Pulldown',
    category: 'back',
    body_region: 'upper',
    description:
      'Wide-grip lat pulldown. Pull bar to upper chest, squeeze lats, controlled return.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['cable', 'machine'],
    is_public: true,
  },
  {
    name: 'Seated Cable Row',
    category: 'back',
    body_region: 'upper',
    description:
      'Seated cable row with V-grip. Keep back straight, pull handle to lower abs, squeeze.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Dumbbell Row',
    category: 'back',
    body_region: 'upper',
    description:
      'Single-arm dumbbell row. One knee and hand on bench, pull dumbbell to hip, squeeze lat.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'T-Bar Row',
    category: 'back',
    body_region: 'upper',
    description:
      'T-bar row machine or barbell in landmine. Straddle the bar, pull to chest, squeeze mid-back.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['barbell', 'machine'],
    is_public: true,
  },
  {
    name: 'Deadlift',
    category: 'back',
    body_region: 'full_body',
    description:
      'Conventional barbell deadlift. Hips at proper height, bar over mid-foot, drive through heels.',
    default_sets: 4,
    default_reps: 5,
    default_rest_seconds: 180,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Romanian Deadlift',
    category: 'back',
    body_region: 'lower',
    description:
      'Barbell RDL. Hip hinge with slight knee bend. Feel the hamstring and back stretch.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Face Pull',
    category: 'back',
    body_region: 'upper',
    description:
      'Cable face pull with rope. Pull to face, externally rotate at end. Great for rear delts and posture.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Good Morning',
    category: 'back',
    body_region: 'lower',
    description:
      'Barbell good morning. Bar on upper back, hinge forward with flat back. Hamstring and low back.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['barbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // SHOULDERS
  // ════════════════════════════════════════════════
  {
    name: 'Overhead Press',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Standing barbell overhead press. Bar from front rack to overhead. Core tight, no leg drive.',
    default_sets: 4,
    default_reps: 8,
    default_rest_seconds: 120,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Seated Dumbbell Shoulder Press',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Seated dumbbell press. Palms forward, press to top without locking out elbows.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Dumbbell Lateral Raise',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Standing lateral raise. Slight bend in elbows, raise to shoulder height, control down.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 45,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Cable Lateral Raise',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Single-arm cable lateral raise. Constant tension throughout the movement.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 45,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Front Raise',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Plate or dumbbell front raise. Raise to shoulder height, palms down, control descent.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 45,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Reverse Fly',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Bent-over dumbbell reverse fly. Targets rear delts. Squeeze shoulder blades together.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Arnold Press',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Seated Arnold press. Rotate palms from facing you at bottom to forward at top.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Machine Shoulder Press',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Seated machine shoulder press. Stable path, good for controlled overload.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Push Press',
    category: 'shoulders',
    body_region: 'upper',
    description:
      'Barbell push press. Use leg drive to help press bar overhead. Transition to strict press.',
    default_sets: 3,
    default_reps: 6,
    default_rest_seconds: 120,
    equipment: ['barbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // BICEPS
  // ════════════════════════════════════════════════
  {
    name: 'Barbell Curl',
    category: 'biceps',
    body_region: 'upper',
    description:
      'Standing barbell curl. Elbows pinned to sides, curl bar to shoulders, squeeze at top.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Dumbbell Hammer Curl',
    category: 'biceps',
    body_region: 'upper',
    description:
      'Neutral-grip dumbbell curl. Palms face each other. Works brachialis and brachioradialis.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Incline Dumbbell Curl',
    category: 'biceps',
    body_region: 'upper',
    description:
      'Incline bench dumbbell curl. Greater stretch on biceps at bottom. Slow controlled reps.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Cable Bicep Curl',
    category: 'biceps',
    body_region: 'upper',
    description:
      'Standing cable curl with straight bar. Constant tension on biceps throughout.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Concentration Curl',
    category: 'biceps',
    body_region: 'upper',
    description:
      'Seated concentration curl. Elbow against inner thigh. Peak contraction at top.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 45,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Preacher Curl',
    category: 'biceps',
    body_region: 'upper',
    description:
      'Preacher bench curling bar. Eliminates body swing. Strict biceps isolation.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['barbell', 'dumbbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // TRICEPS
  // ════════════════════════════════════════════════
  {
    name: 'Tricep Pushdown',
    category: 'triceps',
    body_region: 'upper',
    description:
      'Cable tricep pushdown with straight bar or rope. Elbows pinned, push down, squeeze.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Overhead Tricep Extension',
    category: 'triceps',
    body_region: 'upper',
    description:
      'Seated overhead dumbbell extension. Two hands on one dumbbell, lower behind head.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Skull Crusher',
    category: 'triceps',
    body_region: 'upper',
    description:
      'Lying barbell or EZ bar tricep extension. Lower bar to forehead, extend to lockout.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Close-Grip Bench Press',
    category: 'triceps',
    body_region: 'upper',
    description:
      'Barbell bench with hands shoulder-width apart. Tricep emphasis with chest activation.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Tricep Kickback',
    category: 'triceps',
    body_region: 'upper',
    description:
      'Bent-over dumbbell kickback. Extend arm to horizontal, squeeze tricep at top.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 45,
    equipment: ['dumbbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // QUADRICEPS
  // ════════════════════════════════════════════════
  {
    name: 'Barbell Back Squat',
    category: 'quadriceps',
    body_region: 'lower',
    description:
      'Barbell back squat. Bar on upper traps, squat to parallel or below. Core braced.',
    default_sets: 4,
    default_reps: 8,
    default_rest_seconds: 150,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Barbell Front Squat',
    category: 'quadriceps',
    body_region: 'lower',
    description:
      'Barbell front squat. Bar on front delts, elbows up. More quad emphasis than back squat.',
    default_sets: 3,
    default_reps: 8,
    default_rest_seconds: 120,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Leg Press',
    category: 'quadriceps',
    body_region: 'lower',
    description:
      '45-degree leg press. Feet shoulder-width on platform, squat depth control.',
    default_sets: 4,
    default_reps: 12,
    default_rest_seconds: 90,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Leg Extension',
    category: 'quadriceps',
    body_region: 'lower',
    description:
      'Leg extension machine. Isolate quads. Squeeze at top for peak contraction.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Bulgarian Split Squat',
    category: 'quadriceps',
    body_region: 'lower',
    description:
      'Rear foot elevated split squat. Dumbbells or barbell. Quad and glute dominant.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Goblet Squat',
    category: 'quadriceps',
    body_region: 'lower',
    description:
      'Kettlebell or dumbbell goblet squat. Hold weight at chest, squat deep. Good for mobility.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['kettlebell', 'dumbbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // HAMSTRINGS
  // ════════════════════════════════════════════════
  {
    name: 'Leg Curl',
    category: 'hamstrings',
    body_region: 'lower',
    description:
      'Lying leg curl machine. Curl weight toward glutes. Slow controlled negative.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Seated Leg Curl',
    category: 'hamstrings',
    body_region: 'lower',
    description:
      'Seated leg curl. Different angle than lying, better hip flexion for hamstring stretch.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Nordic Curl',
    category: 'hamstrings',
    body_region: 'lower',
    description:
      'Bodyweight Nordic hamstring curl. Kneeling, lower torso to floor with controlled eccentric.',
    default_sets: 3,
    default_reps: 8,
    default_rest_seconds: 90,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Dumbbell Hamstring Curl',
    category: 'hamstrings',
    body_region: 'lower',
    description:
      'Lying on bench, hold dumbbell between feet, curl weight toward glutes.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Kettlebell Swing',
    category: 'hamstrings',
    body_region: 'full_body',
    description:
      'Two-handed kettlebell swing. Hip hinge drive, swing to chest height. Hamstring and glute power.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['kettlebell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // GLUTES
  // ════════════════════════════════════════════════
  {
    name: 'Hip Thrust',
    category: 'glutes',
    body_region: 'lower',
    description:
      'Barbell hip thrust on bench. Squeeze glutes at top, hold for 1 second. Progressive overload.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 90,
    equipment: ['barbell'],
    is_public: true,
  },
  {
    name: 'Glute Bridge',
    category: 'glutes',
    body_region: 'lower',
    description:
      'Barbell glute bridge on floor. Similar to hip thrust but floor-based. Glute activation.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['barbell', 'bodyweight'],
    is_public: true,
  },
  {
    name: 'Cable Pull Through',
    category: 'glutes',
    body_region: 'lower',
    description:
      'Cable pull through. Face away from cable, pull between legs, squeeze glutes at top.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Step Up',
    category: 'glutes',
    body_region: 'lower',
    description:
      'Dumbbell step up onto box. Drive through heel, step up, lower controlled.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },
  {
    name: 'Walking Lunge',
    category: 'glutes',
    body_region: 'lower',
    description:
      'Dumbbell walking lunge. Step forward into 90-degree lunge, drive to next step.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 90,
    equipment: ['dumbbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // CALVES
  // ════════════════════════════════════════════════
  {
    name: 'Standing Calf Raise',
    category: 'calves',
    body_region: 'lower',
    description:
      'Standing calf raise machine or Smith machine. Full ROM, hold stretch at bottom.',
    default_sets: 4,
    default_reps: 15,
    default_rest_seconds: 45,
    equipment: ['machine', 'barbell'],
    is_public: true,
  },
  {
    name: 'Seated Calf Raise',
    category: 'calves',
    body_region: 'lower',
    description:
      'Seated calf raise machine. Targets soleus. Full stretch and squeeze.',
    default_sets: 4,
    default_reps: 15,
    default_rest_seconds: 45,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Donkey Calf Raise',
    category: 'calves',
    body_region: 'lower',
    description:
      'Donkey calf raise machine or with a partner on lower back. Max stretch on gastrocnemius.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 60,
    equipment: ['machine', 'bodyweight'],
    is_public: true,
  },
  {
    name: 'Jump Rope',
    category: 'calves',
    body_region: 'full_body',
    description:
      'Jump rope intervals. Excellent for calf conditioning, coordination, and cardio.',
    default_sets: 3,
    default_reps: 60,
    default_rest_seconds: 30,
    equipment: ['bodyweight'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // CORE
  // ════════════════════════════════════════════════
  {
    name: 'Plank',
    category: 'core',
    body_region: 'full_body',
    description:
      'Front plank. Elbows under shoulders, body in straight line. Hold for time.',
    default_sets: 3,
    default_reps: 1,
    default_rest_seconds: 45,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Hanging Leg Raise',
    category: 'core',
    body_region: 'full_body',
    description:
      'Hanging leg raise. Hang from bar, raise legs to parallel or above. Strict or kipping.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 60,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Cable Woodchop',
    category: 'core',
    body_region: 'full_body',
    description:
      'Cable woodchop. High-to-low or low-to-high. Rotational core strength.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 45,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Ab Wheel Rollout',
    category: 'core',
    body_region: 'full_body',
    description:
      'Ab wheel rollout from knees or toes. Anti-extension core strength.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Pallof Press',
    category: 'core',
    body_region: 'full_body',
    description:
      'Cable Pallof press. Anti-rotation core work. Press cable out, resist rotation.',
    default_sets: 3,
    default_reps: 12,
    default_rest_seconds: 45,
    equipment: ['cable'],
    is_public: true,
  },
  {
    name: 'Dead Bug',
    category: 'core',
    body_region: 'full_body',
    description:
      'Floor dead bug. Opposite arm and leg extend, core braced, lower back flat.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 45,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Russian Twist',
    category: 'core',
    body_region: 'full_body',
    description:
      'Seated Russian twist with plate or dumbbell. Rotate torso side to side, feet off ground.',
    default_sets: 3,
    default_reps: 15,
    default_rest_seconds: 45,
    equipment: ['dumbbell', 'bodyweight'],
    is_public: true,
  },
  {
    name: 'Farmer Walk',
    category: 'core',
    body_region: 'full_body',
    description:
      'Heavy dumbbell farmer walk. Walk with heavy weight in each hand, core braced, upright posture.',
    default_sets: 3,
    default_reps: 1,
    default_rest_seconds: 60,
    equipment: ['dumbbell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // CARDIO
  // ════════════════════════════════════════════════
  {
    name: 'Rowing Machine',
    category: 'cardio',
    body_region: 'full_body',
    description:
      'Erg rower. Full body cardio. Focus on legs drive, then pull, then arms.',
    default_sets: 1,
    default_reps: 1,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Assault Bike Sprint',
    category: 'cardio',
    body_region: 'full_body',
    description:
      'Fan bike sprint. All-out effort for short intervals. Air resistance scales with effort.',
    default_sets: 1,
    default_reps: 1,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Ski Erg',
    category: 'cardio',
    body_region: 'full_body',
    description:
      'Ski ergometer. Double pole technique. Full body cardio, especially lats and shoulders.',
    default_sets: 1,
    default_reps: 1,
    default_rest_seconds: 60,
    equipment: ['machine'],
    is_public: true,
  },
  {
    name: 'Burpee',
    category: 'cardio',
    body_region: 'full_body',
    description:
      'Full burpee with push up and jump. Explosive full body cardio movement.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 45,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Box Jump',
    category: 'cardio',
    body_region: 'lower',
    description:
      'Box jump onto plyo box. Explosive hip extension. Land soft, stand up tall.',
    default_sets: 3,
    default_reps: 8,
    default_rest_seconds: 60,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Kettlebell Snatch',
    category: 'cardio',
    body_region: 'full_body',
    description:
      'Kettlebell snatch. Single-arm snatch from between legs to overhead. Explosive hip drive.',
    default_sets: 3,
    default_reps: 10,
    default_rest_seconds: 60,
    equipment: ['kettlebell'],
    is_public: true,
  },

  // ════════════════════════════════════════════════
  // MOBILITY
  // ════════════════════════════════════════════════
  {
    name: 'Cat-Cow Stretch',
    category: 'mobility',
    body_region: 'full_body',
    description:
      'Tabletop cat-cow. Alternating spinal flexion and extension for warmup and recovery.',
    default_sets: 2,
    default_reps: 10,
    default_rest_seconds: 30,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: "World's Greatest Stretch",
    category: 'mobility',
    body_region: 'full_body',
    description:
      'Lunge with thoracic rotation. Hip flexor stretch plus upper back rotation. Per side.',
    default_sets: 2,
    default_reps: 8,
    default_rest_seconds: 15,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Hip Flexor Stretch',
    category: 'mobility',
    body_region: 'lower',
    description:
      'Half-kneeling hip flexor stretch. Squeeze glute to deepen stretch. Per side.',
    default_sets: 2,
    default_reps: 1,
    default_rest_seconds: 30,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Thoracic Spine Rotation',
    category: 'mobility',
    body_region: 'upper',
    description:
      'Side-lying or quadruped thoracic rotation. Improve upper back mobility for overhead work.',
    default_sets: 2,
    default_reps: 8,
    default_rest_seconds: 15,
    equipment: ['bodyweight'],
    is_public: true,
  },
  {
    name: 'Banded Shoulder Stretch',
    category: 'mobility',
    body_region: 'upper',
    description:
      'Resistance band shoulder pass-through and dislocates. Improve shoulder mobility.',
    default_sets: 2,
    default_reps: 10,
    default_rest_seconds: 15,
    equipment: ['resistance_band'],
    is_public: true,
  },
  {
    name: 'Standing Pigeon Stretch',
    category: 'mobility',
    body_region: 'lower',
    description:
      'Figure-4 standing glute stretch. Ankle on opposite knee, sit back. Per side.',
    default_sets: 2,
    default_reps: 1,
    default_rest_seconds: 30,
    equipment: ['bodyweight'],
    is_public: true,
  },
];
