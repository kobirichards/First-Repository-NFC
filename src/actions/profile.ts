"use server";

import { refresh } from "next/cache";
import { profileInputSchema } from "@/lib/validation/profile";
import { ImageRejectedError, processProfilePhoto } from "@/server/images";
import { saveOwnProfile, setOwnProfilePhoto, setOwnProfilePublished } from "@/server/profiles";
import { checkLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/session";
import { getStorage } from "@/server/storage";
import { UserFacingError } from "@/server/errors";
import { type ActionState, toActionError } from "./result";

async function guard() {
  const user = await requireUser("/dashboard/profile");
  if (!(await checkLimit("writePerUser", user.id)).ok) {
    throw new UserFacingError("You're saving very quickly. Wait a minute, then try again.");
  }
  return user;
}

export async function saveProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await guard();
    const input = profileInputSchema.parse(Object.fromEntries(formData));
    await saveOwnProfile(user.id, user.name, input);
    refresh();
    return { ok: true, message: "Profile saved.", savedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setPublishedAction(published: boolean): Promise<ActionState> {
  try {
    const user = await guard();
    await setOwnProfilePublished(user.id, published, user.emailVerified);
    refresh();
    return { ok: true, message: published ? "Your profile is live." : "Your profile is offline." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadPhotoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await guard();
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Choose an image file.", "photo");
    const processed = await processProfilePhoto(Buffer.from(await file.arrayBuffer()));
    const key = `profile/${crypto.randomUUID()}.webp`;
    const storage = getStorage();
    await storage.put(key, processed, "image/webp");
    const previous = await setOwnProfilePhoto(user.id, key);
    if (previous) await storage.delete(previous).catch(() => undefined);
    refresh();
    return { ok: true, message: "Photo updated." };
  } catch (error) {
    if (error instanceof ImageRejectedError) return { ok: false, message: error.message, fieldErrors: { photo: error.message } };
    return toActionError(error);
  }
}

export async function removePhotoAction(): Promise<ActionState> {
  try {
    const user = await guard();
    const previous = await setOwnProfilePhoto(user.id, null);
    if (previous) await getStorage().delete(previous).catch(() => undefined);
    refresh();
    return { ok: true, message: "Photo removed." };
  } catch (error) {
    return toActionError(error);
  }
}
