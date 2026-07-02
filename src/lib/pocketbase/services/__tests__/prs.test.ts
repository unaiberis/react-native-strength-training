// Mock the client module so we control pb behavior
const mockGetFullList = jest.fn();

const mockPb = {
  collection: jest.fn(() => ({
    getFullList: mockGetFullList,
  })),
};

jest.mock('../../client', () => ({
  pb: mockPb,
}));

import type { ExerciseSetRow } from '../../../../types/pocketbase';
import { listPRs, getExercisePRs, getPRHistory, checkIsPR } from '../prs';

const makeSet = (overrides: Partial<ExerciseSetRow> = {}): ExerciseSetRow => ({
  id: 'set-1',
  workout_session_id: 'sess-1',
  exercise_id: 'ex-1',
  set_number: 1,
  weight_kg: 100,
  reps: 5,
  rpe: null,
  rir: null,
  is_warmup: false,
  logged_at: '2026-01-01T10:00:00Z',
  created: '2026-01-01T10:00:00Z',
  updated: '2026-01-01T10:00:00Z',
  ...overrides,
});

describe('PocketBase PRs service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear any unconsumed mock values to prevent cross-test leakage
    mockGetFullList.mockReset();
  });

  // ─── listPRs ──────────────────────────────────────────────────

  it('listPRs returns computed PRs grouped by exercise', async () => {
    // getWorkingSetsForUser: 1st call = sessions, 2nd call = sets
    const mockSessions = [{ id: 'sess-1' }, { id: 'sess-2' }];
    const mockSets = [
      makeSet({ exercise_id: 'ex-1', weight_kg: 100, reps: 5 }),
      makeSet({ id: 'set-2', exercise_id: 'ex-1', weight_kg: 110, reps: 3 }),
      makeSet({ id: 'set-3', exercise_id: 'ex-2', weight_kg: 150, reps: 1 }),
    ];
    const mockExercises = [
      { id: 'ex-1', name: 'Bench Press' },
      { id: 'ex-2', name: 'Squat' },
    ];

    mockGetFullList
      .mockResolvedValueOnce(mockSessions) // 1: sessions
      .mockResolvedValueOnce(mockSets) // 2: sets
      .mockResolvedValueOnce(mockExercises); // 3: exercise names

    const result = await listPRs('user-1');

    expect(result).toHaveLength(2);

    // ex-1: Bench Press — best e1RM: 100*(1+5/30)=116.67, 110*(1+3/30)=121
    const bp = result.find((r: any) => r.exerciseId === 'ex-1');
    expect(bp).toBeDefined();
    expect(bp!.exerciseName).toBe('Bench Press');
    expect(bp!.estimatedOneRepMax).toBeCloseTo(121, 0);
    expect(bp!.maxWeight).toBe(110);
    expect(bp!.maxReps).toBe(5);

    // ex-2: Squat — 1RM from single rep
    const sq = result.find((r: any) => r.exerciseId === 'ex-2');
    expect(sq).toBeDefined();
    expect(sq!.exerciseName).toBe('Squat');
    expect(sq!.oneRepMax).toBe(150);
  });

  it('listPRs filters by specific exercise IDs when provided', async () => {
    const mockSessions = [{ id: 'sess-1' }];
    const mockSets = [makeSet({ exercise_id: 'ex-1' })];

    mockGetFullList
      .mockResolvedValueOnce(mockSessions) // 1: sessions
      .mockResolvedValueOnce(mockSets) // 2: sets
      .mockResolvedValueOnce([]); // 3: exercise names (empty is fine)

    await listPRs('user-1', ['ex-1']);

    // The sets filter should reference exercise_id = 'ex-1'
    const setsFilterArg = mockGetFullList.mock.calls[1][0]?.filter;
    expect(setsFilterArg).toContain("exercise_id = 'ex-1'");
  });

  it('listPRs returns empty array when no sessions exist', async () => {
    mockGetFullList.mockResolvedValueOnce([]); // sessions: empty

    const result = await listPRs('user-1');

    expect(result).toEqual([]);
  });

  it('listPRs returns data even when exercise names not found', async () => {
    const mockSessions = [{ id: 'sess-1' }];
    const mockSets = [makeSet({ exercise_id: 'ex-999' })];

    mockGetFullList
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockSets)
      .mockResolvedValueOnce([]); // no matching exercises

    const result = await listPRs('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].exerciseName).toBe('Unknown Exercise');
  });

  it('listPRs throws on PocketBase error', async () => {
    mockGetFullList.mockRejectedValueOnce(new Error('PB error'));

    await expect(listPRs('user-1')).rejects.toThrow('PB error');
  });

  // ─── getExercisePRs ────────────────────────────────────────────

  it('getExercisePRs returns PR data for a single exercise', async () => {
    const mockSessions = [{ id: 'sess-1' }];
    const mockSets = [
      makeSet({ exercise_id: 'ex-1', weight_kg: 80, reps: 10 }),
      makeSet({ id: 'set-2', exercise_id: 'ex-1', weight_kg: 90, reps: 6 }),
    ];
    const mockExercises = [{ id: 'ex-1', name: 'Bench Press' }];

    mockGetFullList
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockSets)
      .mockResolvedValueOnce(mockExercises);

    const result = await getExercisePRs('user-1', 'ex-1');

    expect(result).not.toBeNull();
    expect(result!.exerciseId).toBe('ex-1');
    expect(result!.exerciseName).toBe('Bench Press');
    expect(result!.estimatedOneRepMax).toBeCloseTo(108, 0); // 90*(1+6/30)
  });

  it('getExercisePRs returns null when no sets exist for exercise', async () => {
    mockGetFullList.mockResolvedValueOnce([{ id: 'sess-1' }]); // sessions exist
    mockGetFullList.mockResolvedValueOnce([]); // no sets

    const result = await getExercisePRs('user-1', 'ex-unknown');

    expect(result).toBeNull();
  });

  // ─── getPRHistory ──────────────────────────────────────────────

  it('getPRHistory returns progression of best e1RM per session over time', async () => {
    const mockSets = [
      makeSet({
        workout_session_id: 'sess-1',
        weight_kg: 80,
        reps: 10,
        logged_at: '2026-01-01T10:00:00Z',
      }),
      makeSet({
        id: 'set-2',
        workout_session_id: 'sess-2',
        weight_kg: 90,
        reps: 6,
        logged_at: '2026-01-08T10:00:00Z',
      }),
      makeSet({
        id: 'set-3',
        workout_session_id: 'sess-2',
        weight_kg: 100,
        reps: 3,
        logged_at: '2026-01-08T10:00:00Z',
      }),
      makeSet({
        id: 'set-4',
        workout_session_id: 'sess-3',
        weight_kg: 95,
        reps: 5,
        logged_at: '2026-01-15T10:00:00Z',
      }),
    ];

    mockGetFullList.mockResolvedValueOnce(mockSets);

    const result = await getPRHistory('ex-1', 'estimated_one_rep_max');

    expect(result).toHaveLength(3);
    // sess-1: 80*(1+10/30) = 106.67
    expect(result[0].value).toBeCloseTo(106.67, 0);
    expect(result[0].sessionId).toBe('sess-1');
    // sess-2: best is 100*(1+3/30) = 110
    expect(result[1].value).toBeCloseTo(110, 0);
    expect(result[1].sessionId).toBe('sess-2');
    // sess-3: 95*(1+5/30) = 110.83
    expect(result[2].value).toBeCloseTo(110.83, 0);
    expect(result[2].sessionId).toBe('sess-3');
  });

  it('getPRHistory returns progression of one_rep_max over time', async () => {
    const mockSets = [
      makeSet({
        workout_session_id: 'sess-1',
        weight_kg: 130,
        reps: 1,
        logged_at: '2026-01-01T10:00:00Z',
      }),
      makeSet({
        id: 'set-2',
        workout_session_id: 'sess-2',
        weight_kg: 140,
        reps: 1,
        logged_at: '2026-01-08T10:00:00Z',
      }),
    ];

    mockGetFullList.mockResolvedValueOnce(mockSets);

    const result = await getPRHistory('ex-1', 'one_rep_max');

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(130);
    expect(result[1].value).toBe(140);
  });

  it('getPRHistory returns empty array when no sets', async () => {
    mockGetFullList.mockResolvedValueOnce([]);

    const result = await getPRHistory('ex-1', 'estimated_one_rep_max');

    expect(result).toEqual([]);
  });

  it('getPRHistory throws on PocketBase error', async () => {
    mockGetFullList.mockRejectedValueOnce(new Error('PB error'));

    await expect(getPRHistory('ex-1', 'one_rep_max')).rejects.toThrow(
      'PB error'
    );
  });

  // ─── checkIsPR ────────────────────────────────────────────────

  it('checkIsPR returns true when weight exceeds current best 1RM', async () => {
    const mockSets = [makeSet({ weight_kg: 100, reps: 1 })];

    mockGetFullList.mockResolvedValueOnce(mockSets);

    const result = await checkIsPR('ex-1', 110, 1);

    expect(result.isPR).toBe(true);
    expect(result.currentBest).toBe(100);
    expect(result.proposedValue).toBe(110);
    expect(result.prType).toBe('one_rep_max');
  });

  it('checkIsPR returns true when new set has higher e1RM than current best', async () => {
    const mockSets = [
      makeSet({ weight_kg: 100, reps: 5 }), // e1RM = 116.67
    ];

    mockGetFullList.mockResolvedValueOnce(mockSets);

    const result = await checkIsPR('ex-1', 100, 8); // e1RM = 126.67

    expect(result.isPR).toBe(true);
    expect(result.prType).toBe('estimated_one_rep_max');
  });

  it('checkIsPR returns false when weight does not beat current best', async () => {
    const mockSets = [
      makeSet({ weight_kg: 140, reps: 1 }), // 1RM = 140
    ];

    mockGetFullList.mockResolvedValueOnce(mockSets);

    const result = await checkIsPR('ex-1', 135, 1);

    expect(result.isPR).toBe(false);
    expect(result.currentBest).toBe(140);
    expect(result.proposedValue).toBe(135);
  });

  it('checkIsPR returns true when no prior sets exist (first time)', async () => {
    mockGetFullList.mockResolvedValueOnce([]);

    const result = await checkIsPR('ex-1', 50, 10); // e1RM = 66.67

    expect(result.isPR).toBe(true);
    expect(result.currentBest).toBeNull();
    expect(result.prType).toBe('estimated_one_rep_max');
  });

  it('checkIsPR throws on PocketBase error', async () => {
    mockGetFullList.mockRejectedValueOnce(new Error('PB error'));

    await expect(checkIsPR('ex-1', 100, 5)).rejects.toThrow('PB error');
  });
});
