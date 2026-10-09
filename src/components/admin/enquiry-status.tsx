"use client";

import { useTransition } from "react";
import { setEnquiryStatusAction } from "@/actions/admin";
import { inputClass } from "./forms";

export function EnquiryStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Status</span>
      <select
        defaultValue={status}
        disabled={pending}
        onChange={(e) => {
          const value = e.currentTarget.value;
          start(async () => void (await setEnquiryStatusAction(id, value)));
        }}
        className={inputClass}
      >
        <option value="NEW">New</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="CLOSED">Closed</option>
      </select>
    </label>
  );
}
