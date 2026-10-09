"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { CURRENCIES } from "@/config/commerce";
import { env } from "@/config/env";
import {
  ORDER_STATUSES,
  assignCardsToOrderItem,
  createBatch,
  createProduct,
  reassignCard,
  recordRefund,
  regenerateClaimCodes,
  releaseCard,
  requireAdmin,
  reviewProof,
  setCardActive,
  setEnquiryStatus,
  setPrice,
  updateOrderStatus,
  updateProduct,
  upsertOption,
} from "@/server/admin";
import { type ActionState, toActionError } from "./result";
import { catalogChangedByAdmin } from "@/server/cache-tags";

/*
 * Admin server actions. EVERY action starts with `await requireAdmin()`
 * (tests/unit/admin-actions-guard.test.ts enforces this), and the functions
 * they call check again with assertAdmin, so a missing check in one layer
 * is still caught by the other.
 */

const id = z.string().min(1).max(64);
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
/** "24.50" → 2450. Empty → null. */
const money = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 24 or 24.50." });
      return z.NEVER;
    }
    return Math.round(Number(v) * 100);
  });

export async function createBatchAction(_prev: ActionState & { csv?: string; filename?: string }, formData: FormData) {
  const actor = await requireAdmin();
  try {
    const result = await createBatch(actor, { label: String(formData.get("label") ?? ""), quantity: Number(formData.get("quantity")) }, env.claimCodeSecret);
    refresh();
    return { ok: true, message: "Batch created. The CSV with claim codes has downloaded; it can't be downloaded again.", csv: result.csv, filename: result.filename };
  } catch (error) {
    return toActionError(error);
  }
}

export async function regenerateCodesAction(batchId: string): Promise<ActionState & { csv?: string; filename?: string }> {
  const actor = await requireAdmin();
  try {
    const result = await regenerateClaimCodes(actor, id.parse(batchId), env.claimCodeSecret);
    return { ok: true, message: "New claim codes generated. Codes printed before now no longer work for unclaimed cards.", ...result };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setCardActiveAction(cardId: string, active: boolean): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    await setCardActive(actor, id.parse(cardId), active);
    refresh();
    return { ok: true, message: active ? "Card reactivated." : "Card disabled." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reassignCardAction(cardId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    await reassignCard(actor, id.parse(cardId), z.email("Enter an email address.").parse(String(formData.get("email") ?? "").trim()));
    refresh();
    return { ok: true, message: "Card reassigned." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function releaseCardAction(cardId: string): Promise<ActionState & { claimCode?: string }> {
  const actor = await requireAdmin();
  try {
    const { claimCode } = await releaseCard(actor, id.parse(cardId), env.claimCodeSecret);
    refresh();
    return { ok: true, message: "Card returned to stock with a new claim code.", claimCode };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOrderStatusAction(orderId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    const status = z.enum(ORDER_STATUSES).parse(formData.get("status"));
    await updateOrderStatus(actor, id.parse(orderId), {
      status,
      trackingNumber: String(formData.get("trackingNumber") ?? ""),
      notify: bool(formData.get("notify")),
    });
    refresh();
    return { ok: true, message: "Order updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordRefundAction(orderId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    const amount = money.parse(String(formData.get("amount") ?? ""));
    if (amount === null) return { ok: false, message: "Enter the refunded amount.", fieldErrors: { amount: "Enter the refunded amount." } };
    await recordRefund(actor, id.parse(orderId), {
      amount,
      reason: String(formData.get("reason") ?? ""),
      stripeRefundId: String(formData.get("stripeRefundId") ?? "").trim() || undefined,
    });
    refresh();
    return { ok: true, message: "Refund recorded." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function assignCardsAction(orderItemId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    const tokens = String(formData.get("tokens") ?? "")
      .split(/[\s,]+/)
      .filter(Boolean);
    const result = await assignCardsToOrderItem(actor, id.parse(orderItemId), { tokens });
    refresh();
    return {
      ok: true,
      message: `${result.assigned.length} ${result.assigned.length === 1 ? "card" : "cards"} assigned${result.activated ? " and activated for the customer" : ". The customer claims them with the printed codes"}.`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reviewProofAction(proofId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    const decision = z.enum(["APPROVED", "REJECTED"]).parse(formData.get("decision"));
    const result = await reviewProof(actor, id.parse(proofId), decision, String(formData.get("notes") ?? ""));
    refresh();
    return { ok: true, message: decision === "APPROVED" ? (result.movedToProduction ? "Approved. The order is now in production." : "Approved.") : "Changes requested. The customer has been emailed." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setEnquiryStatusAction(enquiryId: string, status: string): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    await setEnquiryStatus(actor, id.parse(enquiryId), z.enum(["NEW", "IN_PROGRESS", "CLOSED"]).parse(status));
    refresh();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveProductAction(productId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState & { productId?: string }> {
  const actor = await requireAdmin();
  try {
    const input = {
      slug: String(formData.get("slug") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      customisable: bool(formData.get("customisable")),
      isActive: bool(formData.get("isActive")),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    };
    const savedId = productId ? (await updateProduct(actor, id.parse(productId), input), productId) : await createProduct(actor, input);
    catalogChangedByAdmin();
    refresh();
    return { ok: true, message: "Product saved.", productId: savedId, savedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveOptionAction(productId: string, optionId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    await upsertOption(actor, id.parse(productId), optionId ? id.parse(optionId) : null, {
      slug: String(formData.get("slug") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      inventory: String(formData.get("inventory") ?? "") as unknown as number,
      isActive: bool(formData.get("isActive")),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    catalogChangedByAdmin();
    refresh();
    return { ok: true, message: "Finish saved.", savedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function savePricesAction(productId: string, optionId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    for (const currency of CURRENCIES) {
      const amount = money.parse(String(formData.get(currency) ?? ""));
      await setPrice(actor, id.parse(productId), optionId ? id.parse(optionId) : null, currency, amount);
    }
    catalogChangedByAdmin();
    refresh();
    return { ok: true, message: "Prices saved." };
  } catch (error) {
    return toActionError(error);
  }
}
