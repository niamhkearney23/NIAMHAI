"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Shown while a draft is being written elsewhere (another tab, or after a reload). */
export function Refresher({ everyMs = 5000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
