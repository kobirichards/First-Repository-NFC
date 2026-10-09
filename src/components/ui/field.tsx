import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "./cn";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

/** Labelled input with hint and error text wired up for screen readers. */
export function Field({ label, hint, error, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "h-11 rounded-control border bg-sheet px-3 text-base text-ink placeholder:text-moss/70",
          "focus-visible:outline-2 focus-visible:outline-offset-0",
          error ? "border-danger" : "border-ink/20 hover:border-ink/35",
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-moss">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
