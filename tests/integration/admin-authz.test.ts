import { describe, expect, it } from "vitest";
import * as adminModule from "@/server/admin";
import { ForbiddenError, adminOperations } from "@/server/admin";

const actors = {
  "signed out": null,
  "a customer": { id: "u1", role: "user", twoFactorEnabled: true },
  "a customer without a role": { id: "u2", role: undefined as unknown as string, twoFactorEnabled: true },
  "an admin without two-step verification": { id: "u3", role: "admin", twoFactorEnabled: false },
};

/** Exports of src/server/admin that are helpers, not operations. */
const NOT_OPERATIONS = new Set([
  "adminOperations",
  "assertAdmin",
  "requireAdmin",
  "requireAdminPendingMfa",
  "recordAudit",
  "ForbiddenError",
  "MAX_BATCH_SIZE",
  "ORDER_STATUSES",
  "productInput",
  "optionInput",
]);

describe("admin authorization", () => {
  it("every exported admin operation is registered (so the checks below cover it)", () => {
    const exported = Object.entries(adminModule)
      .filter(([name, value]) => typeof value === "function" && !NOT_OPERATIONS.has(name))
      .map(([name]) => name);
    expect(exported.sort()).toEqual(Object.keys(adminOperations).sort());
  });

  for (const [who, actor] of Object.entries(actors)) {
    it(`rejects ${who} from every admin operation`, async () => {
      for (const [name, op] of Object.entries(adminOperations)) {
        const call = (op as (...args: unknown[]) => Promise<unknown>).bind(null, actor, "x", "y", "z", "w");
        await expect(Promise.resolve().then(call), name).rejects.toBeInstanceOf(ForbiddenError);
      }
    });
  }
});
