"use client";

import { focusRing } from "@/components/ui/motion";
import { ChevronDown } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type InputHTMLAttributes } from "react";

export type FieldKind = "Input" | "Textarea" | "Select";
export type FieldState = "Default" | "Focus" | "Error";
export type FieldSurface = "Card" | "Flat";

type Shared = {
  kind?: FieldKind;
  label: string;
  helper?: string;
  error?: string;
  state?: FieldState;
  surface?: FieldSurface;
  leading?: ReactNode;
  trailing?: ReactNode;
  options?: { value: string; label: string }[];
};

const shell = (surface: FieldSurface, state: FieldState) =>
  `flex w-full flex-col gap-1 rounded-card px-5 py-3.5 ${
    surface === "Card" ? "bg-surface shadow-card" : "border border-border bg-transparent"
  } ${state === "Error" ? "ring-1 ring-conf-low" : ""} ${state === "Focus" ? "ring-2 ring-accent" : ""}`;

export function Field({
  kind = "Input",
  label,
  helper,
  error,
  state = "Default",
  surface = "Card",
  leading,
  trailing,
  options = [],
  className = "",
  id,
  ...props
}: Shared &
  InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement> &
  SelectHTMLAttributes<HTMLSelectElement>) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const describedBy = error ? `${fieldId}-error` : helper ? `${fieldId}-helper` : undefined;
  const control = `w-full bg-transparent text-[15px] leading-6 text-text-1 outline-none placeholder:text-text-3 ${focusRing}`;
  return (
    <div className={`${shell(surface, error ? "Error" : state)} ${className}`}>
      <div className="flex items-center gap-2">
        {leading}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={fieldId} className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">
            {label}
          </label>
          {kind === "Textarea" ? (
            <textarea id={fieldId} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={`${control} min-h-[72px] resize-y`} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
          ) : kind === "Select" ? (
            <span className="relative">
              <select id={fieldId} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={`${control} appearance-none pr-6`} {...(props as SelectHTMLAttributes<HTMLSelectElement>)}>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-text-2" />
            </span>
          ) : (
            <input id={fieldId} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={control} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
          )}
        </span>
        {trailing}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-[13px] leading-5 text-conf-low">
          {error}
        </p>
      ) : helper ? (
        <p id={`${fieldId}-helper`} className="text-[13px] leading-5 text-text-3">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
