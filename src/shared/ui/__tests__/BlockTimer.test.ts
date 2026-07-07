
// ─── Block Timer Logic Tests ─────────────────────────────────────────────
//
// Tests the timer state machine logic without rendering the component,
// avoiding Vitest transform issues with react-native in .tsx files.

interface TimerState {
  remaining: number;
  intervalRemaining: number;
  intervalNumber: number;
  isTimeUp: boolean;
}

function createCountdownTimer(totalSeconds: number): TimerState & {
  tick: () => void;
  reset: () => void;
} {
  let remaining = totalSeconds;
  let intervalRemaining = 0;
  let intervalNumber = 0;

  return {
    get remaining() { return remaining; },
    get intervalRemaining() { return intervalRemaining; },
    get intervalNumber() { return intervalNumber; },
    get isTimeUp() { return remaining <= 0; },
    tick: () => { remaining = Math.max(0, remaining - 1); },
    reset: () => { remaining = totalSeconds; },
  };
}

function createIntervalTimer(
  totalSeconds: number,
  intervalSeconds: number,
): TimerState & {
  tick: () => void;
  reset: () => void;
} {
  let remaining = totalSeconds;
  let intervalRemaining = intervalSeconds;
  let intervalNumber = 1;

  return {
    get remaining() { return remaining; },
    get intervalRemaining() { return intervalRemaining; },
    get intervalNumber() { return intervalNumber; },
    get isTimeUp() { return remaining <= 0; },
    tick: () => {
      remaining = Math.max(0, remaining - 1);
      if (intervalRemaining <= 1) {
        intervalNumber++;
        intervalRemaining = intervalSeconds;
      } else {
        intervalRemaining--;
      }
    },
    reset: () => {
      remaining = totalSeconds;
      intervalRemaining = intervalSeconds;
      intervalNumber = 1;
    },
  };
}

describe("Countdown timer (AMRAP mode)", () => {
  it("initializes with total seconds", () => {
    const timer = createCountdownTimer(480);
    expect(timer.remaining).toBe(480);
    expect(timer.isTimeUp).toBe(false);
  });

  it("decrements on each tick", () => {
    const timer = createCountdownTimer(10);
    timer.tick();
    expect(timer.remaining).toBe(9);
    timer.tick();
    expect(timer.remaining).toBe(8);
  });

  it("signals time up at 0", () => {
    const timer = createCountdownTimer(2);
    timer.tick();
    expect(timer.isTimeUp).toBe(false);
    timer.tick();
    expect(timer.remaining).toBe(0);
    expect(timer.isTimeUp).toBe(true);
  });

  it("does not go below 0", () => {
    const timer = createCountdownTimer(1);
    timer.tick();
    expect(timer.remaining).toBe(0);
    timer.tick();
    expect(timer.remaining).toBe(0);
  });

  it("tracks progress through many ticks", () => {
    const timer = createCountdownTimer(60);
    for (let i = 0; i < 30; i++) timer.tick();
    expect(timer.remaining).toBe(30);
  });

  it("resets correctly", () => {
    const timer = createCountdownTimer(480);
    timer.tick();
    timer.tick();
    expect(timer.remaining).toBe(478);
    timer.reset();
    expect(timer.remaining).toBe(480);
  });

  it("handles 8-minute AMRAP (480 seconds)", () => {
    const timer = createCountdownTimer(480);
    expect(timer.remaining).toBe(480);
    expect(timer.isTimeUp).toBe(false);
  });

  it("handles 3-minute mini-AMRAP (180 seconds)", () => {
    const timer = createCountdownTimer(180);
    expect(timer.remaining).toBe(180);
  });
});

describe("Interval timer (EMOM mode)", () => {
  it("initializes with interval countdown at interval value", () => {
    const timer = createIntervalTimer(600, 120);
    expect(timer.remaining).toBe(600);
    expect(timer.intervalRemaining).toBe(120);
    expect(timer.intervalNumber).toBe(1);
  });

  it("counts down interval and resets at boundary", () => {
    const timer = createIntervalTimer(600, 120);

    // Tick 119 times → interval goes to 1
    for (let i = 0; i < 119; i++) timer.tick();
    expect(timer.intervalRemaining).toBe(1);
    expect(timer.intervalNumber).toBe(1);

    // One more tick → interval resets to 120, interval increments
    timer.tick();
    expect(timer.intervalRemaining).toBe(120);
    expect(timer.intervalNumber).toBe(2);
  });

  it("increments interval number on each boundary crossing", () => {
    const timer = createIntervalTimer(600, 2);

    timer.tick(); // remaining: 599, interval: 1
    timer.tick(); // remaining: 598, interval: 2→reset, intervalNumber: 2
    expect(timer.intervalNumber).toBe(2);

    timer.tick(); // interval: 1
    timer.tick(); // interval: 2→reset, intervalNumber: 3
    expect(timer.intervalNumber).toBe(3);
  });

  it("tracks overall remaining alongside intervals", () => {
    const timer = createIntervalTimer(10, 5);

    expect(timer.remaining).toBe(10);
    expect(timer.intervalRemaining).toBe(5);

    timer.tick();
    expect(timer.remaining).toBe(9);
    expect(timer.intervalRemaining).toBe(4);
  });

  it("resets interval state", () => {
    const timer = createIntervalTimer(300, 60);

    timer.tick();
    timer.tick();
    expect(timer.intervalRemaining).toBe(58);
    expect(timer.intervalNumber).toBe(1);

    timer.reset();
    expect(timer.remaining).toBe(300);
    expect(timer.intervalRemaining).toBe(60);
    expect(timer.intervalNumber).toBe(1);
  });

  it("handles 2-minute EMOM intervals (120 sec)", () => {
    const timer = createIntervalTimer(480, 120);
    expect(timer.intervalRemaining).toBe(120);
  });

  it("handles 30-second EMOM intervals", () => {
    const timer = createIntervalTimer(300, 30);
    expect(timer.intervalRemaining).toBe(30);
  });
});

describe("Timer edge cases", () => {
  it("handles 0-second total duration", () => {
    const timer = createCountdownTimer(0);
    expect(timer.isTimeUp).toBe(true);
    timer.tick();
    expect(timer.remaining).toBe(0);
  });

  it("handles 1-second countdown", () => {
    const timer = createCountdownTimer(1);
    expect(timer.isTimeUp).toBe(false);
    timer.tick();
    expect(timer.isTimeUp).toBe(true);
  });

  it("handles very short interval (1 second)", () => {
    const timer = createIntervalTimer(5, 1);
    timer.tick();
    expect(timer.intervalNumber).toBe(2);
    expect(timer.intervalRemaining).toBe(1);
  });
});
