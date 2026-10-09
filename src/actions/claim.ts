"use server";

import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { claimCodeSchema } from "@/lib/validation/cards";
import { claimCard } from "@/server/cards";
import { checkLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/session";
import { type ActionState, toActionError } from "./result";

export async function claimCardAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(`/activate/${encodeURIComponent(token)}`);
  const [perUser, perCard] = await Promise.all([checkLimit("claimPerUser", user.id), checkLimit("claimPerCard", token)]);
  if (!perUser.ok || !perCard.ok) {
    return { ok: false, message: "Too many attempts. Wait 15 minutes, then try again." };
  }
  try {
    const code = claimCodeSchema.parse(formData.get("code") ?? "");
    await claimCard(user, token, code, env.claimCodeSecret);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/dashboard/cards?claimed=1");
}
