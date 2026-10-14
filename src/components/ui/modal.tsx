"use client";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/bars";
import { focusRing } from "@/components/ui/motion";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onOpenChange,
  step = "Step 2 of 3 · Describe the source",
  title = "Describe the source",
  progress = true,
  percent = 66,
  back = false,
  disabled = false,
  footer = true,
  continueLabel = "Continue",
  onContinue,
  children,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  step?: string;
  title?: string;
  progress?: boolean;
  percent?: number;
  back?: boolean;
  disabled?: boolean;
  footer?: boolean;
  continueLabel?: string;
  onContinue?: () => void;
  children?: ReactNode;
  trigger?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[color-mix(in_srgb,var(--color-overlay)_40%,transparent)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-modal bg-surface p-8 text-text-1 shadow-float outline-none">
          <ModalBody
            step={step}
            title={title}
            progress={progress}
            percent={percent}
            back={back}
            disabled={disabled}
            footer={footer}
            continueLabel={continueLabel}
            onContinue={onContinue}
          >
            {children}
          </ModalBody>
          <Dialog.Close className={`${focusRing} absolute right-4 top-4 rounded-button p-1 text-text-2`} aria-label="Close">
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalBody({
  step,
  title,
  progress = false,
  percent = 66,
  back = false,
  disabled = false,
  continueLabel = "Continue",
  footer = true,
  onCancel,
  onBack,
  onContinue,
  children,
}: {
  step?: string;
  title: string;
  progress?: boolean;
  percent?: number;
  back?: boolean;
  disabled?: boolean;
  continueLabel?: string;
  footer?: boolean;
  onCancel?: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">{step}</p>
      <h2 className="mt-2 text-[24px] font-medium leading-8 text-text-1">{title}</h2>
      {progress ? <ProgressBar percent={percent} className="mt-2 w-full" /> : null}
      <div className="min-h-24 py-6 text-[15px] leading-6 text-text-2">{children ?? "Add fields or supporting content here."}</div>
      {footer ? (
        <div className="flex justify-end gap-3">
          <Button type="Secondary" label="Cancel" onClick={onCancel} />
          {back ? <Button type="Secondary" label="Back" onClick={onBack} /> : null}
          <Button label={continueLabel} state={disabled ? "Disabled" : "Default"} onClick={onContinue} />
        </div>
      ) : null}
    </div>
  );
}
