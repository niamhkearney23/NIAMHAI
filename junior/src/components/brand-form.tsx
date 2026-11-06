"use client";

import { useActionState, useState } from "react";
import { saveBrand, type BrandState } from "@/app/(app)/settings/actions";
import { CarouselPreview } from "@/app/(app)/briefs/[id]/carousel-preview";
import { brandWarnings, DEFAULT_BRAND, isHex, type Brand } from "@/lib/brand";
import { Button, Notice, inputClass } from "./ui";

const FIELDS: { key: keyof Brand; label: string; hint: string }[] = [
  { key: "cover", label: "First card", hint: "Background of the opening card" },
  { key: "card", label: "Other cards", hint: "Background of the rest" },
  { key: "accent", label: "Accent", hint: "Lines and page numbers" },
];

const SAMPLE = [
  { heading: "A deposit is not a penalty", body: "What the court said about tenants who leave early." },
  { heading: "What the court said", body: "A landlord must show actual loss, with receipts." },
  { heading: "The takeaway", body: "Anything above that loss goes back to the tenant." },
];

export function BrandForm({ initial, firm }: { initial: Brand; firm: string }) {
  const [state, action, pending] = useActionState<BrandState, FormData>(saveBrand, {});
  const [brand, setBrand] = useState<Brand>(initial);
  const valid = Object.values(brand).every(isHex);
  const warnings = valid ? brandWarnings(brand) : ["Use colours like #171B28."];
  const set = (key: keyof Brand, value: string) => setBrand((b) => ({ ...b, [key]: value.startsWith("#") ? value : `#${value}` }));

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="space-y-1.5">
            <label htmlFor={`brand-${key}`} className="label">
              {label}
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label={`${label} colour picker`}
                value={isHex(brand[key]) ? brand[key] : "#000000"}
                onChange={(e) => set(key, e.target.value.toUpperCase())}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-[3px] border border-line bg-surface p-1"
              />
              <input
                id={`brand-${key}`}
                name={key}
                value={brand[key]}
                maxLength={7}
                onChange={(e) => set(key, e.target.value.toUpperCase())}
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        ))}
      </div>

      {valid ? <CarouselPreview cards={SAMPLE} firm={firm} brand={brand} /> : null}

      {warnings.map((w) => (
        <Notice key={w} tone="danger">
          {w}
        </Notice>
      ))}
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state.saved ? <Notice tone="accent">Saved. New carousels use these colours.</Notice> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || !valid}>
          {pending ? "Saving" : "Save colours"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setBrand(DEFAULT_BRAND)}>
          Use Lawgistics colours
        </Button>
      </div>
    </form>
  );
}
