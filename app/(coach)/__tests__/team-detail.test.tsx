/**
 * Tests for the Team Detail screen.
 *
 * The screen uses useLocalSearchParams to get the team id, the auth store
 * for the current user, and multiple team hooks for members + mutations.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TeamDetailScreen from "../teams/[id]";

// ─── Shared UI mocks ─────────────────────────────────────────────────────
jest.mock("@/shared/ui/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: any }) => children,
}));

// ─── Auth store mock ─────────────────────────────────────────────────────
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { id: "user-1" },
      isTeamAdmin: true,
      isTeamCoach: true,
      isOnline: true,
    }),
}));

// ─── Team hooks mocks ────────────────────────────────────────────────────
const mockUseTeamMembers = jest.fn();
const mockUpdateTeamMutate = jest.fn();
const mockDeleteTeamMutate = jest.fn();
const mockAddTeamMemberMutate = jest.fn();
const mockRemoveTeamMemberMutate = jest.fn();
const mockUpdateMemberRoleMutate = jest.fn();
const mockCreateInviteMutate = jest.fn();

jest.mock("@/features/coach/hooks/useTeams", () => ({
  useTeam: () => ({ data: { id: "team-1", name: "Test Team", description: "A test team" }, isLoading: false }),
  useTeamMembers: (...args: any[]) => mockUseTeamMembers(...args),
  useUpdateTeam: () => ({ mutate: mockUpdateTeamMutate, isPending: false }),
  useDeleteTeam: () => ({ mutate: mockDeleteTeamMutate, isPending: false }),
  useAddTeamMember: () => ({
    mutate: mockAddTeamMemberMutate,
    isPending: false,
  }),
  useRemoveTeamMember: () => ({
    mutate: mockRemoveTeamMemberMutate,
    isPending: false,
  }),
  useUpdateMemberRole: () => ({
    mutate: mockUpdateMemberRoleMutate,
    isPending: false,
  }),
  useCreateInvite: () => ({
    mutate: mockCreateInviteMutate,
    isPending: false,
  }),
}));

// ─── Router mock (overrides jest.setup.ts) ───────────────────────────────
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: "team-1" }),
  Stack: { Screen: () => null },
}));

// ─── Test data ───────────────────────────────────────────────────────────
const baseMember = {
  team_id: "team-1",
  user_avatar: null,
  position: null,
  joined_at: "2024-01-01",
  created: "2024-01-01",
  updated: "2024-01-01",
};

const mockMembers = [
  {
    ...baseMember,
    id: "ms-1",
    user_id: "user-1",
    role: "admin" as const,
    user_name: "Current User",
    user_email: "user@test.com",
  },
  {
    ...baseMember,
    id: "ms-2",
    user_id: "user-2",
    role: "coach" as const,
    user_name: "Coach Smith",
    user_email: "coach@test.com",
  },
  {
    ...baseMember,
    id: "ms-3",
    user_id: "user-3",
    role: "coach" as const,
    user_name: "Coach Jones",
    user_email: "coach2@test.com",
  },
  {
    ...baseMember,
    id: "ms-4",
    user_id: "user-4",
    role: "athlete" as const,
    user_name: "Athlete One",
    user_email: "athlete@test.com",
  },
  {
    ...baseMember,
    id: "ms-5",
    user_id: "user-5",
    role: "athlete" as const,
    user_name: "Athlete Two",
    user_email: "athlete2@test.com",
  },
];

function setMembers(
  members: any[],
  { isLoading = false }: { isLoading?: boolean } = {},
) {
  mockUseTeamMembers.mockReturnValue({
    data: members,
    isLoading,
  });
}

function renderScreen() {
  return render(<TeamDetailScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  setMembers(mockMembers);
});

// ─── Tests ───────────────────────────────────────────────────────────────
describe("TeamDetailScreen", () => {
  it("renders team members grouped by role", () => {
    renderScreen();

    // Role section headers with counts
    expect(screen.getByText("Admin (1)")).toBeTruthy();
    expect(screen.getByText("Coach (2)")).toBeTruthy();
    expect(screen.getByText("Athlete (2)")).toBeTruthy();

    // Member names
    expect(screen.getByText("Current User")).toBeTruthy();
    expect(screen.getByText("Coach Smith")).toBeTruthy();
    expect(screen.getByText("Coach Jones")).toBeTruthy();
    expect(screen.getByText("Athlete One")).toBeTruthy();
    expect(screen.getByText("Athlete Two")).toBeTruthy();
  });

  it("shows invite section", () => {
    renderScreen();

    expect(screen.getByText("Invite")).toBeTruthy();
    expect(screen.getByText("Generate Invite Code")).toBeTruthy();
  });

  it("shows assign program button", () => {
    renderScreen();

    expect(screen.getByText("Select Program")).toBeTruthy();
  });

  it("assign program button navigates to assignment screen", () => {
    renderScreen();

    fireEvent.press(screen.getByText("Select Program"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(coach)/assign?teamId=team-1",
    );
  });

  it("shows loading spinner while members are loading", () => {
    setMembers([], { isLoading: true });
    renderScreen();

    expect(screen.queryByText("Admin (1)")).toBeNull();
    expect(screen.queryByText("Coach Smith")).toBeNull();
  });

  it("shows add member form for admins/coaches", () => {
    renderScreen();

    // Add Member button should be visible (canManage = true)
    const addMemberBtn = screen.getByLabelText("Add member to team");
    expect(addMemberBtn).toBeTruthy();

    // Press to reveal the form
    fireEvent.press(addMemberBtn);
    expect(screen.getByPlaceholderText("User ID")).toBeTruthy();
    expect(screen.getByText("Add")).toBeTruthy();

    // Role selectors should be present
    expect(screen.getByLabelText("Role: athlete")).toBeTruthy();
    expect(screen.getByLabelText("Role: coach")).toBeTruthy();
    expect(screen.getByLabelText("Role: admin")).toBeTruthy();
  });

  it("generate invite button shows invite code", () => {
    mockCreateInviteMutate.mockImplementation((_args, { onSuccess }) => {
      onSuccess({ code: "INVITE-ABC" });
    });

    renderScreen();

    fireEvent.press(screen.getByText("Generate Invite Code"));

    expect(mockCreateInviteMutate).toHaveBeenCalledWith(
      { teamId: "team-1", role: "athlete" },
      expect.any(Object),
    );
    expect(screen.getByText("INVITE-ABC")).toBeTruthy();
  });

  it("delete team button triggers mutation for admins", () => {
    renderScreen();

    const deleteBtn = screen.getByLabelText("Delete team");
    expect(deleteBtn).toBeTruthy();

    fireEvent.press(deleteBtn);
    expect(mockDeleteTeamMutate).toHaveBeenCalledWith(
      "team-1",
      expect.any(Object),
    );
  });

  it("delete team navigates back on success", () => {
    mockDeleteTeamMutate.mockImplementation((_id, { onSuccess }) => {
      onSuccess();
    });

    renderScreen();

    fireEvent.press(screen.getByLabelText("Delete team"));
    expect(mockBack).toHaveBeenCalled();
  });
});
