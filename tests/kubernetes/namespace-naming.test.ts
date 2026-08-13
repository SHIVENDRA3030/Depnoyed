/**
 * Unit tests for namespace naming derivation and sanitization.
 * Pure unit tests - no cluster required.
 */

import { describe, it, expect } from "bun:test";

import { getNamespace } from "../../backend/kubernetes/adapter";

describe("Namespace naming", () => {
  it("derives namespace from tenantId with depnoyed- prefix", () => {
    expect(getNamespace("user123")).toBe("depnoyed-user123");
    expect(getNamespace("abc")).toBe("depnoyed-abc");
  });

  it("handles alphanumeric tenant IDs", () => {
    expect(getNamespace("user-001")).toBe("depnoyed-user-001");
    expect(getNamespace("USER123")).toBe("depnoyed-USER123");
    expect(getNamespace("user_name")).toBe("depnoyed-user_name");
  });

  it("handles special characters in tenant ID (no sanitization in current impl)", () => {
    // Current implementation does not sanitize - this is a known limitation
    // that could be addressed in future if needed
    expect(getNamespace("user@domain.com")).toBe("depnoyed-user@domain.com");
    expect(getNamespace("user.with.dots")).toBe("depnoyed-user.with.dots");
  });

  it("handles empty-ish tenant IDs", () => {
    expect(getNamespace("")).toBe("depnoyed-");
    expect(getNamespace(" ")).toBe("depnoyed- ");
  });

  it("handles very long tenant IDs", () => {
    const longId = "a".repeat(200);
    expect(getNamespace(longId)).toBe(`depnoyed-${longId}`);
  });

  it("is deterministic", () => {
    for (let i = 0; i < 100; i++) {
      expect(getNamespace("test-user")).toBe("depnoyed-test-user");
    }
  });

  it("different tenant IDs produce different namespaces", () => {
    const ns1 = getNamespace("user1");
    const ns2 = getNamespace("user2");
    expect(ns1).not.toBe(ns2);
    expect(ns1).toBe("depnoyed-user1");
    expect(ns2).toBe("depnoyed-user2");
  });
});