"use client";

import { useEffect, useRef } from "react";
import type { Demo } from "@/lib/demos";

type Mode = "off" | "hover" | "in-view";

export function DemoCard({ demo, index }: { demo: Demo; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mode = useRef<Mode>("off");
  const num = String(index + 1).padStart(2, "0");

  // The preview only plays when it's wanted: on hover or keyboard focus where
  // there's a mouse, and while on screen on touch devices. Nothing downloads
  // until then (preload="none"), and it stays a still image for anyone who
  // prefers reduced motion or has data saver on.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || connection?.saveData) {
      return;
    }
    if (window.matchMedia("(hover: hover)").matches) {
      mode.current = "hover";
      return;
    }
    mode.current = "in-view";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const play = () => {
    if (mode.current === "hover") videoRef.current?.play().catch(() => {});
  };
  const pause = () => {
    if (mode.current === "hover") videoRef.current?.pause();
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
        <video
          ref={videoRef}
          poster={demo.preview.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          className="h-full w-full object-cover"
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
