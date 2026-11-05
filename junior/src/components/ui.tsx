import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[3px] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap";
  const sizes: Record<Size, string> = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-[15px]" };
  const variants: Record<Variant, string> = {
    primary: "border-ink bg-ink text-on-ink hover:bg-ink-2 hover:border-ink-2",
    secondary: "border-line-strong bg-transparent text-ink hover:bg-sunken",
    ghost: "border-transparent bg-transparent text-ink hover:bg-sunken",
    danger: "border-danger bg-transparent text-danger hover:bg-danger-soft",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export const inputClass =
  "w-full rounded-[3px] border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  aside,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function Panel({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-[4px] border border-line bg-surface ${className}`} {...props} />;
}

export function Badge({ tone = "plain", children }: { tone?: "plain" | "accent" | "danger" | "ink"; children: ReactNode }) {
  const tones = {
    plain: "border-line text-muted",
    accent: "border-accent text-accent",
    danger: "border-danger text-danger",
    ink: "border-ink bg-ink text-on-ink",
  };
  return (
    <span className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 border-b border-line pb-6">
      {eyebrow ? <p className="label mb-2">{eyebrow}</p> : null}
      <h1 className="font-serif text-[2rem] leading-tight font-medium text-ink sm:text-[2.5rem]">{title}</h1>
      {children ? <div className="mt-3 max-w-2xl text-[15px] text-ink-2">{children}</div> : null}
    </header>
  );
}

export function Notice({ tone = "plain", children }: { tone?: "plain" | "danger" | "accent"; children: ReactNode }) {
  const tones = {
    plain: "border-line bg-surface text-ink-2",
    danger: "border-danger bg-danger-soft text-ink",
    accent: "border-accent bg-accent-soft text-ink",
  };
  return <div className={`rounded-[4px] border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
