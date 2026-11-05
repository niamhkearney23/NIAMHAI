import { CHANNEL_LABEL, CHANNELS, STATUS_LABEL } from "@/lib/channels";
import type { Channel, PostStatus } from "@/lib/types";

const DOT: Record<PostStatus, string> = {
  to_review: "border-line-strong bg-transparent",
  approved: "border-accent bg-accent-soft",
  scheduled: "border-accent bg-accent",
  posted: "border-ink bg-ink",
};

/** One small marker per channel showing where each draft is. */
export function StatusDots({ posts }: { posts: { channel: Channel; status: PostStatus }[] }) {
  return (
    <span className="flex items-center gap-1">
      {CHANNELS.map((ch) => {
        const p = posts.find((x) => x.channel === ch);
        if (!p) return null;
        return (
          <span
            key={ch}
            title={`${CHANNEL_LABEL[ch]}: ${STATUS_LABEL[p.status]}`}
            aria-label={`${CHANNEL_LABEL[ch]}: ${STATUS_LABEL[p.status]}`}
            className={`h-2.5 w-2.5 rounded-full border ${DOT[p.status]}`}
          />
        );
      })}
    </span>
  );
}
