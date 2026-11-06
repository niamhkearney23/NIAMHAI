"use client";

import { useState } from "react";
import { CHANNEL_DESCRIPTION, CHANNEL_LABEL, CHANNELS, STATUS_LABEL } from "@/lib/channels";
import { openChecks } from "@/lib/guardrails";
import type { Connections } from "@/lib/connections";
import type { Channel, Post, TimeZone } from "@/lib/types";
import { PostEditor } from "./post-editor";

export function BriefWorkspace({
  posts: initial,
  initialChannel,
  timezone,
  defaultSchedule,
  firm,
  connections,
}: {
  connections: Connections;
  posts: Post[];
  initialChannel: Channel;
  timezone: TimeZone;
  defaultSchedule: string;
  firm: string;
}) {
  const [posts, setPosts] = useState(initial);
  const available = CHANNELS.filter((c) => posts.some((p) => p.channel === c));
  const [active, setActive] = useState<Channel>(available.includes(initialChannel) ? initialChannel : available[0]);

  function select(channel: Channel) {
    setActive(channel);
    const url = new URL(window.location.href);
    url.searchParams.set("channel", channel);
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      <div role="tablist" aria-label="Drafts" className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {available.map((channel) => {
          const post = posts.find((p) => p.channel === channel)!;
          const pending = openChecks([...post.checks, ...post.rule_checks], post.check_acks).length;
          const selected = channel === active;
          return (
            <button
              key={channel}
              role="tab"
              type="button"
              id={`tab-${channel}`}
              aria-selected={selected}
              aria-controls={`panel-${channel}`}
              onClick={() => select(channel)}
              className={`rounded-[4px] border px-3 py-2.5 text-left ${selected ? "border-ink bg-surface" : "border-line hover:border-line-strong"}`}
            >
              <span className="block font-serif text-lg leading-tight text-ink">{CHANNEL_LABEL[channel]}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{CHANNEL_DESCRIPTION[channel]}</span>
              <span className="mt-2 flex items-center gap-2">
                <span className={`label ${post.status === "to_review" ? "" : "text-accent"}`}>{STATUS_LABEL[post.status]}</span>
                {post.status === "to_review" && pending > 0 ? (
                  <span className="font-mono text-[11px] text-danger">{pending} to check</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {available.map((channel) => {
        const post = posts.find((p) => p.channel === channel)!;
        return (
          <div key={channel} role="tabpanel" id={`panel-${channel}`} aria-labelledby={`tab-${channel}`} hidden={channel !== active}>
            <PostEditor
              post={post}
              timezone={timezone}
              defaultSchedule={defaultSchedule}
              firm={firm}
              connection={channel === "newsletter" ? null : connections[channel]}
              onChange={(updated) => setPosts((list) => list.map((p) => (p.id === updated.id ? updated : p)))}
            />
          </div>
        );
      })}
    </div>
  );
}
