"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { cardDestinationSchema, cardLabelSchema } from "@/lib/validation/cards";
import { deactivateOwnCard, reactivateOwnCard, renameOwnCard, setOwnCardDestination } from "@/server/cards";
import { UserFacingError } from "@/server/errors";
import { checkLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/session";
import { type ActionState, toActionError } from "./result";

const cardId = z.string().min(1).max(64);

async function guard() {
  const user = await requireUser("/dashboard/cards");
  if (!(await checkLimit("writePerUser", user.id)).ok) {
    throw new UserFacingError("You're making changes very quickly. Wait a minute, then try again.");
  }
  return user;
}

export async function renameCardAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await guard();
    await renameOwnCard(user.id, cardId.parse(id), cardLabelSchema.parse(formData.get("label") ?? ""));
    refresh();
    return { ok: true, message: "Name saved." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setDestinationAction(id: string, destination: string): Promise<ActionState> {
  try {
    const user = await guard();
    await setOwnCardDestination(user.id, cardId.parse(id), cardDestinationSchema.parse(destination));
    refresh();
    return { ok: true, message: destination === "LINKEDIN" ? "This card now opens your LinkedIn." : "This card now opens your profile." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setActiveAction(id: string, active: boolean): Promise<ActionState> {
  try {
    const user = await guard();
    if (active) await reactivateOwnCard(user.id, cardId.parse(id));
    else await deactivateOwnCard(user.id, cardId.parse(id));
    refresh();
    return { ok: true, message: active ? "Card reactivated." : "Card deactivated." };
  } catch (error) {
    return toActionError(error);
  }
}
