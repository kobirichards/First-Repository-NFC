"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { removePhotoAction, uploadPhotoAction } from "@/actions/profile";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";

export function PhotoForm({ photoSrc, initials }: { photoSrc: string | null; initials: string }) {
  const [state, dispatch] = useActionState<ActionState, FormData>(uploadPhotoAction, {});
  const [removeState, setRemoveState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const message = removeState.message ?? state.message;
  const ok = removeState.message ? removeState.ok : state.ok;

  return (
    <div className="flex items-center gap-5">
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own media route
        <img src={photoSrc} alt="Your profile photo" width={80} height={80} className="size-20 rounded-full object-cover" />
      ) : (
        <div aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-bottle text-xl font-bold text-white">
          {initials}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            // Hidden: the visible button below opens it, so there is one control, not two.
            hidden
            tabIndex={-1}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              const data = new FormData();
              data.set("photo", file);
              setRemoveState({});
              startTransition(() => dispatch(data));
              event.currentTarget.value = "";
            }}
          />
          <Button variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? "Uploading…" : photoSrc ? "Change photo" : "Upload photo"}
          </Button>
          {photoSrc ? (
            <Button
              variant="quiet"
              disabled={pending}
              onClick={() => startTransition(async () => setRemoveState(await removePhotoAction()))}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-moss">JPEG, PNG or WebP, up to 5 MB. We strip location and camera data.</p>
        <p aria-live="polite" className={ok === false ? "text-sm font-medium text-danger" : "text-sm font-medium text-bottle"}>
          {message}
        </p>
      </div>
    </div>
  );
}
