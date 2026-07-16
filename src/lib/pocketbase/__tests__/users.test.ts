import { updateProfile } from "../users";

// Mock the PocketBase client so no network call is made.
jest.mock("@/lib/pocketbase/client", () => ({
  pb: { collection: jest.fn() },
}));

import { pb } from "@/lib/pocketbase/client";

describe("updateProfile", () => {
  const mockUpdate = jest.fn();

  beforeEach(() => {
    mockUpdate.mockReset();
    (pb.collection as jest.Mock).mockReturnValue({ update: mockUpdate });
  });

  it("calls pb.collection('users').update with the userId and defined payload", async () => {
    const record = { id: "u1", displayName: "Jane" };
    mockUpdate.mockResolvedValue(record);

    const result = await updateProfile("u1", {
      displayName: "Jane",
      bodyweight: 80,
      experience: undefined,
    });

    expect(pb.collection).toHaveBeenCalledWith("users");
    expect(mockUpdate).toHaveBeenCalledWith("u1", {
      displayName: "Jane",
      bodyweight: 80,
    });
    expect(result).toBe(record);
  });

  it("omits undefined values from the payload", async () => {
    mockUpdate.mockResolvedValue({ id: "u1" });

    await updateProfile("u1", {
      displayName: "Jane",
      bodyweight: undefined,
      height: undefined,
      experience: undefined,
      goal: undefined,
    });

    const payload = mockUpdate.mock.calls[0][1];
    expect(payload).toEqual({ displayName: "Jane" });
    expect(payload).not.toHaveProperty("bodyweight");
    expect(payload).not.toHaveProperty("experience");
  });

  it("propagates errors thrown by pb.collection('users').update", async () => {
    mockUpdate.mockRejectedValue(new Error("boom"));

    await expect(
      updateProfile("u1", { displayName: "Jane" }),
    ).rejects.toThrow("boom");
  });
});
