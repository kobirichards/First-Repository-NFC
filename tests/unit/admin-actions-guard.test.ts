import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Belt and braces: every exported admin server action must check the caller
 * before doing anything else. (The admin functions it calls check again.)
 */
describe("admin server actions", () => {
  const source = readFileSync(path.join(__dirname, "../../src/actions/admin.ts"), "utf8");
  const exportCount = source.match(/^export /gm)?.length ?? 0;
  // Each action's signature is on one line; the statement after it must be the guard.
  const actions = source
    .split(/^export async function /m)
    .slice(1)
    .map((chunk) => {
      const [signature, firstLine] = chunk.split("\n");
      return [signature.match(/^(\w+)/)![1], firstLine] as const;
    });

  it("every export is an async action covered here", () => expect(actions).toHaveLength(exportCount));

  it("exist", () => expect(actions.length).toBeGreaterThan(10));

  it.each(actions)("%s starts with requireAdmin()", (_name, firstLine) => {
    expect(firstLine.trim()).toBe("const actor = await requireAdmin();");
  });
});
