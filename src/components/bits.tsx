import type { ReactNode } from "react";

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-t border-line pt-3">
      <div className="text-xs tracking-widest text-muted uppercase">{label}</div>
      <div className="mt-2 font-display text-3xl tabular-nums leading-none md:text-4xl">{value}</div>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 border border-line bg-paper p-4 md:p-5">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}