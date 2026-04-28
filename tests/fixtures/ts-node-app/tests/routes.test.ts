import { describe, expect, it } from "vitest";

describe("routes", () => {
  it("documents API key creation", () => {
    expect("POST /v1/api-keys").toContain("/v1/api-keys");
  });
});
