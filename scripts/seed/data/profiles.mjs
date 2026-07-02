/**
 * Profile Definitions
 *
 * Three user profiles for demo: Beginner, Intermediate, Advanced.
 * Each has its own progression curves, duration, and user credentials.
 */

export const PROFILES = [
  {
    id: 'beginner',
    email: 'beginner@test.com',
    password: 'test123456',
    name: 'Beginner Lifter',
    weeks: 16,
    description:
      'Starting strength — newbie gains phase with fast early progress',
    progressionOverrides: {
      'Barbell Back Squat': { start: 50, end: 100, midpoint: 8 },
      'Barbell Front Squat': { start: 40, end: 75, midpoint: 8 },
      'Barbell Bench Press': { start: 40, end: 65, midpoint: 7 },
      Deadlift: { start: 60, end: 110, midpoint: 8 },
      'Overhead Press': { start: 25, end: 45, midpoint: 7 },
      'Barbell Row': { start: 35, end: 60, midpoint: 8 },
      'Romanian Deadlift': { start: 40, end: 75, midpoint: 7 },
      'Leg Press': { start: 100, end: 180, midpoint: 9 },
      'Hip Thrust': { start: 40, end: 80, midpoint: 8 },
      'Close-Grip Bench Press': { start: 30, end: 50, midpoint: 7 },
    },
    plateau: null,
  },
  {
    id: 'intermediate',
    email: 'intermediate@test.com',
    password: 'test123456',
    name: 'Intermediate Lifter',
    weeks: 36,
    description: 'Includes a 3-week plateau followed by deload breakout',
    progressionOverrides: {
      'Barbell Back Squat': { start: 80, end: 140, midpoint: 16 },
      'Barbell Front Squat': { start: 60, end: 110, midpoint: 15 },
      'Barbell Bench Press': { start: 60, end: 100, midpoint: 14 },
      Deadlift: { start: 100, end: 170, midpoint: 15 },
      'Overhead Press': { start: 35, end: 60, midpoint: 13 },
      'Barbell Row': { start: 50, end: 85, midpoint: 15 },
      'Romanian Deadlift': { start: 65, end: 110, midpoint: 14 },
      'Leg Press': { start: 140, end: 260, midpoint: 17 },
      'Hip Thrust': { start: 60, end: 120, midpoint: 15 },
      'Close-Grip Bench Press': { start: 45, end: 75, midpoint: 14 },
    },
    // Plateau from week 18 to week 21 (4 weeks of stalled progress)
    plateau: { startWeek: 18, endWeek: 21 },
  },
  {
    id: 'advanced',
    email: 'test@test.com',
    password: 'test123456',
    name: 'Demo User',
    weeks: 78,
    description: 'Advanced lifter — 18 months of consistent training',
    progressionOverrides: null, // uses defaults from progression.mjs
    plateau: null,
  },
];
