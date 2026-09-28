"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className = "button button-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending && <span className="button-spinner" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
