// ─── Mock (before imports) ────────────────────────────────────────────────

const mockGetFullList = jest.fn();

jest.mock("@/lib/pocketbase/client", () => ({
  pb: {
    collection: jest.fn(() => ({ getFullList: mockGetFullList })),
  },
}));

import { fetchTemplateNames } from "../fetch-template-names";

describe("fetchTemplateNames", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Valid IDs ──────────────────────────────────────────────────────────

  it("returns a Map with template names for valid IDs", async () => {
    mockGetFullList.mockResolvedValueOnce([
      { id: "a", name: "Push" },
      { id: "b", name: "Pull" },
    ]);

    const result = await fetchTemplateNames(["a", "b"]);

    expect(result.size).toBe(2);
    expect(result.get("a")).toBe("Push");
    expect(result.get("b")).toBe("Pull");
    expect(mockGetFullList).toHaveBeenCalledTimes(1);
    expect(mockGetFullList).toHaveBeenCalledWith({
      filter: "id='a'||id='b'",
      fields: "id,name",
      requestKey: null,
    });
  });

  // ── Empty input ────────────────────────────────────────────────────────

  it("returns empty Map for empty input array", async () => {
    const result = await fetchTemplateNames([]);

    expect(result.size).toBe(0);
    expect(mockGetFullList).not.toHaveBeenCalled();
  });

  // ── All null/undefined IDs ─────────────────────────────────────────────

  it("returns empty Map when all IDs are null/undefined", async () => {
    const result = await fetchTemplateNames([null, undefined] as unknown as string[]);

    expect(result.size).toBe(0);
    expect(mockGetFullList).not.toHaveBeenCalled();
  });

  // ── PB filter error ────────────────────────────────────────────────────

  it("returns empty Map when PB getFullList throws (no throw propagation)", async () => {
    mockGetFullList.mockRejectedValueOnce(new Error("filter too long"));

    // Should NOT throw — helper catches errors internally
    const result = await fetchTemplateNames(["a", "b"]);

    expect(result.size).toBe(0);
    expect(mockGetFullList).toHaveBeenCalledTimes(1);
  });

  // ── Dedup ──────────────────────────────────────────────────────────────

  it("deduplicates IDs — only unique IDs produce a single getFullList call", async () => {
    mockGetFullList.mockResolvedValueOnce([
      { id: "a", name: "Push" },
      { id: "b", name: "Pull" },
    ]);

    const result = await fetchTemplateNames(["a", "a", "b"]);

    expect(result.size).toBe(2);
    expect(result.get("a")).toBe("Push");
    expect(result.get("b")).toBe("Pull");
    expect(mockGetFullList).toHaveBeenCalledTimes(1);
    // The filter should only have unique IDs
    expect(mockGetFullList).toHaveBeenCalledWith({
      filter: "id='a'||id='b'",
      fields: "id,name",
      requestKey: null,
    });
  });
});
