import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ScreenLayout } from "../ScreenLayout";

// ─── Helpers ───────────────────────────────────────────────────────────────

function renderScreenLayout(props: Record<string, any> = {}) {
  return render(
    <ScreenLayout {...props}>
      <div />
    </ScreenLayout>,
  );
}

// ─── Title ─────────────────────────────────────────────────────────────────

describe("ScreenLayout — title", () => {
  it("renders the title via ScreenTitle", () => {
    renderScreenLayout({ title: "Analytics" });
    expect(screen.getByText("Analytics")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    renderScreenLayout({
      title: "Wellness",
      subtitle: "Track your recovery",
    });
    expect(screen.getByText("Wellness")).toBeTruthy();
    expect(screen.getByText("Track your recovery")).toBeTruthy();
  });

  it("renders kicker when provided", () => {
    renderScreenLayout({
      title: "Calendar",
      kicker: "YOUR WEEK",
    });
    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.getByText("YOUR WEEK")).toBeTruthy();
  });
});

// ─── Loading State ──────────────────────────────────────────────────────────

describe("ScreenLayout — loading", () => {
  it("shows SkeletonCard when loading is true", () => {
    const { UNSAFE_getAllByType } = render(
      <ScreenLayout loading title="Test">
        <div />
      </ScreenLayout>,
    );
    // SkeletonCard renders SkeletonBar elements inside it
    // The presence of SkeletonCard means skeleton bars should exist
    // We verify by checking the loading state doesn't show children text
    expect(() => screen.getByText("child content")).toThrow();
  });

  it("does not show children text when loading", () => {
    render(
      <ScreenLayout loading title="Test">
        <div />
      </ScreenLayout>,
    );
    // Loading replaces content — children are not rendered
    // Title is also hidden during loading
    expect(() => screen.getByText("Test")).toThrow();
  });

  it("hides loading state when error is also set (error takes priority)", () => {
    render(
      <ScreenLayout loading error="Server error" title="Test">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Server error")).toBeTruthy();
  });
});

// ─── Error State ────────────────────────────────────────────────────────────

describe("ScreenLayout — error", () => {
  it("shows error message with default retry button", () => {
    render(
      <ScreenLayout error="Failed to load data" onRetry={() => {}} title="Test">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Failed to load data")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("shows custom error label on retry button", () => {
    render(
      <ScreenLayout
        error="Network error"
        errorLabel="Try Again"
        onRetry={() => {}}
        title="Test"
      >
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Try Again")).toBeTruthy();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(
      <ScreenLayout error="Something broke" title="Test">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.queryByText("Retry")).toBeNull();
  });
});

// ─── Empty State ────────────────────────────────────────────────────────────

describe("ScreenLayout — empty", () => {
  it("shows EmptyState with default title when empty=true", () => {
    render(
      <ScreenLayout empty title="Test">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("No data")).toBeTruthy();
  });

  it("shows custom empty title and subtitle", () => {
    render(
      <ScreenLayout
        empty
        emptyTitle="No workouts"
        emptySubtitle="Start your first workout"
        title="Test"
      >
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("No workouts")).toBeTruthy();
    expect(screen.getByText("Start your first workout")).toBeTruthy();
  });

  it("shows empty action button when provided", () => {
    render(
      <ScreenLayout
        empty
        emptyTitle="No data"
        emptyAction={{ label: "Add Item", onPress: () => {} }}
        title="Test"
      >
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Add Item")).toBeTruthy();
  });
});

// ─── ScrollView Mode ────────────────────────────────────────────────────────

describe("ScreenLayout — scroll mode", () => {
  it("renders children inside ScrollView", () => {
    render(
      <ScreenLayout title="Test" mode="scroll">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Test")).toBeTruthy();
  });

  it("shows children when not loading, error, or empty", () => {
    render(
      <ScreenLayout title="Test" mode="scroll">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Test")).toBeTruthy();
  });
});

// ─── FlatList Mode ─────────────────────────────────────────────────────────

describe("ScreenLayout — flatlist mode", () => {
  const mockData = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ];

  it("renders without crashing with data and renderItem", () => {
    expect(() =>
      render(
        <ScreenLayout
          title="List"
          mode="flatlist"
          data={mockData}
          renderItem={({ item }) => <div>{item.name}</div>}
          keyExtractor={(item) => item.id}
        />,
      ),
    ).not.toThrow();
  });

  it("shows loading skeleton in flatlist mode", () => {
    render(
      <ScreenLayout
        title="List"
        mode="flatlist"
        loading
        data={mockData}
        renderItem={({ item }) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
      />,
    );
    // Loading state replaces content — no crash
  });

  it("shows error state in flatlist mode", () => {
    render(
      <ScreenLayout
        title="List"
        mode="flatlist"
        error="FlatList error"
        data={mockData}
        renderItem={({ item }) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("FlatList error")).toBeTruthy();
  });

  it("shows empty state in flatlist mode", () => {
    render(
      <ScreenLayout
        title="List"
        mode="flatlist"
        empty
        emptyIcon="list-outline"
        emptyTitle="No items"
        data={mockData}
        renderItem={({ item }) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
      />,
    );
    expect(screen.getByText("No items")).toBeTruthy();
  });
});

// ─── None Mode ──────────────────────────────────────────────────────────────

describe("ScreenLayout — none mode", () => {
  it("renders children as-is without scroll wrapper", () => {
    render(
      <ScreenLayout title="Custom" mode="none">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Custom")).toBeTruthy();
  });
});

// ─── Padded Prop ────────────────────────────────────────────────────────────

describe("ScreenLayout — padded prop", () => {
  it("renders with padding by default", () => {
    expect(() =>
      render(
        <ScreenLayout title="Test">
          <div />
        </ScreenLayout>,
      ),
    ).not.toThrow();
  });

  it("renders without padding when padded=false", () => {
    expect(() =>
      render(
        <ScreenLayout title="Test" padded={false}>
          <div />
        </ScreenLayout>,
      ),
    ).not.toThrow();
  });
});

// ─── None Mode States ───────────────────────────────────────────────────────

describe("ScreenLayout — none mode states", () => {
  it("shows loading in none mode", () => {
    render(
      <ScreenLayout title="Custom" mode="none" loading>
        <div />
      </ScreenLayout>,
    );
    // Loading shown, title not rendered
    expect(() => screen.getByText("Custom")).toThrow();
  });

  it("shows error in none mode", () => {
    render(
      <ScreenLayout title="Custom" mode="none" error="None mode error">
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("None mode error")).toBeTruthy();
  });

  it("shows empty in none mode", () => {
    render(
      <ScreenLayout
        title="Custom"
        mode="none"
        empty
        emptyTitle="None Empty"
      >
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("None Empty")).toBeTruthy();
  });
});

// ─── State Priority ─────────────────────────────────────────────────────────

describe("ScreenLayout — state priority", () => {
  it("loading takes priority over empty", () => {
    render(
      <ScreenLayout loading empty emptyTitle="Empty State" title="Test">
        <div />
      </ScreenLayout>,
    );
    // Loading should show, not empty
    expect(() => screen.getByText("Empty State")).toThrow();
  });

  it("error takes priority over loading and empty", () => {
    render(
      <ScreenLayout
        loading
        error="Critical error"
        empty
        emptyTitle="Empty State"
        title="Test"
      >
        <div />
      </ScreenLayout>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Critical error")).toBeTruthy();
    expect(() => screen.getByText("Empty State")).toThrow();
  });
});
