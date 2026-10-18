"use client";

import { useEffect, useRef } from "react";
import type { Demo } from "@/lib/demos";

export function DemoCard({ demo, index }: { demo: Demo; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canPreview = useRef(false);
  const num = String(index + 1).padStart(2, "0");

  // The preview plays only while a mouse is over the card (or it has keyboard
  // focus), so it never runs without the visitor asking. Touch screens,
  // reduced motion and data saver just get the still image. Nothing is
  // downloaded until the first play (preload="none").
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    canPreview.current =
      window.matchMedia("(hover: hover)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !connection?.saveData;
  }, []);

  const play = () => {
    if (canPreview.current) videoRef.current?.play().catch(() => {});
  };
  const pause = () => {
    videoRef.current?.pause();
  };

  return (
    <a
      href={demo.href}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={play}
      onMouseLeave={pause}
      onFocus={play}
      onBlur={pause}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-cream-dim)]">
        {/* The still sits behind the video as a lazy image, rather than as the
            video's poster, so it only loads when the card is near the screen. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={demo.preview.poster}
          alt=""
          loading="lazy"
          decoding="async"
          width={960}
          height={540}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          className="relative h-full w-full object-cover"
        >
          <source src={demo.preview.webm} type="video/webm" />
          <source src={demo.preview.mp4} type="video/mp4" />
        </video>
        <span className="text-mono absolute left-3 top-3 rounded bg-[var(--color-black)]/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-cream)]">
          Concept demo
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-mono text-sm font-bold text-[var(--color-accent)]">{num}</span>
            <span className="text-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink)]/45">
              {demo.kind}
            </span>
          </div>
          <h4 className="text-display mt-3 text-xl sm:text-2xl">{demo.title}</h4>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/75">
            {demo.description}
          </p>
        </div>
        <span className="text-mono mt-6 text-xs font-bold uppercase tracking-wide text-[var(--color-accent)] group-hover:underline">
          Try it live →
        </span>
      </div>
    </a>
  );
}
