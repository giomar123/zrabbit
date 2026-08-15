import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("entrega del frontend publicado", () => {
  it("no permite cachear HTML y conserva cache inmutable para assets con hash", () => {
    const source = readFileSync(new URL("./_core/vite.ts", import.meta.url), "utf8");
    expect(source).toContain('"no-store, no-cache, must-revalidate, max-age=0"');
    expect(source).toContain('index: false');
    expect(source).toContain('immutable: true');
  });
});
