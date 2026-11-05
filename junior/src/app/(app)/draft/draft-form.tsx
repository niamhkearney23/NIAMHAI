"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Mascot } from "@/components/mascot";
import { Button, Notice, inputClass } from "@/components/ui";
import { detectPii, PII_LABEL, stripPii, type PiiFinding } from "@/lib/pii";
import { createClient } from "@/lib/supabase/client";
import type { SourceKind } from "@/lib/types";
import { askJunior, extractUpload, type AskState } from "./actions";

const THINKING = [
  "Reading your source",
  "Picking out the facts",
  "Drafting your LinkedIn post",
  "Laying out the carousel",
  "Writing the Facebook post",
  "Writing the newsletter piece",
  "Running the house rules",
];

const MIN_CHARS = 80;

type Mode = "text" | "pdf" | "audio";

export function DraftForm({ userId, audioEnabled, demo }: { userId: string; audioEnabled: boolean; demo: boolean }) {
  const [state, action, pending] = useActionState<AskState, FormData>(askJunior, {});
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<SourceKind>("text");
  const [sourceName, setSourceName] = useState("");
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [redactions, setRedactions] = useState(0);
  const [keptKey, setKeptKey] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const findings = useMemo(() => detectPii(text), [text]);
  const findingsKey = findings.map((f) => f.id).join("|");
  const sensitive = findings.filter((f) => f.defaultStrip);
  const kept = keptKey !== null && keptKey === findingsKey;
  const blockedByPii = sensitive.length > 0 && !kept;

  const isSelected = (f: PiiFinding) => overrides[f.id] ?? f.defaultStrip;

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setThinkingIndex((i) => (i + 1) % THINKING.length), 2600);
    return () => clearInterval(id);
  }, [pending]);

  function toggle(f: PiiFinding) {
    setOverrides((prev) => ({ ...prev, [f.id]: !isSelected(f) }));
  }

  function strip() {
    const chosen = findings.filter(isSelected);
    if (!chosen.length) return;
    const out = stripPii(text, chosen);
    setText(out.text);
    setRedactions((n) => n + out.replaced);
    setOverrides({});
  }

  async function onFile(file: File) {
    setUploadError(null);
    setUploadNote(null);
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("That file is over 25 MB.");
      return;
    }
    const isPdf = mode === "pdf";
    const ext = (file.name.split(".").pop() || (isPdf ? "pdf" : "m4a")).toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type || (isPdf ? "application/pdf" : "audio/mp4"), upsert: false });
      if (error) {
        setUploadError(
          /mime|type/i.test(error.message)
            ? "Junior cannot read that kind of file."
            : "The upload did not go through. Try again.",
        );
        return;
      }
      const result = await extractUpload(path, isPdf ? "pdf" : "audio", file.name);
      if (result.error || !result.text) {
        setUploadError(result.error ?? "Junior could not read that file.");
        return;
      }
      setText(result.text);
      setKind(isPdf ? "pdf" : "audio");
      setSourceName(file.name);
      setUploadNote(`${result.detail}. Check it below, then ask Junior.`);
      setMode("text");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (pending) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-[4px] border border-line bg-surface px-6 py-16 text-center">
        <Mascot mood="thinking" size={96} />
        <div role="status" aria-live="polite">
          <p className="font-serif text-2xl text-ink">{THINKING[thinkingIndex]}</p>
          <p className="mt-2 text-sm text-muted">This usually takes under a minute. Junior only uses facts from your source.</p>
        </div>
      </div>
    );
  }

  const tooShort = text.trim().length < MIN_CHARS;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="source_kind" value={kind} />
      <input type="hidden" name="source_name" value={sourceName} />
      <input type="hidden" name="redactions" value={redactions} />
      <input type="hidden" name="pii_kept" value={kept ? "1" : "0"} />

      <div role="tablist" aria-label="How to add your source" className="flex gap-1 border-b border-line">
        {(
          [
            ["text", "Paste text"],
            ["pdf", "Upload PDF"],
            ["audio", "Voice note"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setUploadError(null);
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-[15px] ${mode === m ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode !== "text" ? (
        <div className="rounded-[4px] border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
          {mode === "audio" && !audioEnabled ? (
            <p className="text-[15px] text-ink-2">Voice notes are not switched on for this workspace yet. Paste your notes instead.</p>
          ) : (
            <>
              <p className="font-serif text-xl text-ink">
                {mode === "pdf" ? "Upload a judgment or document" : "Upload a voice note"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {mode === "pdf"
                  ? "PDFs with selectable text, up to 25 MB."
                  : "MP3, M4A, WAV, WebM or OGG, up to 25 MB. Junior transcribes it first."}{" "}
                The file is deleted as soon as Junior has read it.
              </p>
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                id="upload"
                accept={mode === "pdf" ? "application/pdf,.pdf" : "audio/*,.m4a,.mp3,.wav,.webm,.ogg,.opus"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              <label
                htmlFor="upload"
                aria-disabled={uploading}
                className={`mt-5 inline-flex h-10 cursor-pointer items-center rounded-[3px] border border-ink bg-ink px-4 text-[15px] font-medium text-on-ink ${uploading ? "pointer-events-none opacity-50" : ""}`}
              >
                {uploading ? (mode === "pdf" ? "Reading the PDF" : "Transcribing") : "Choose a file"}
              </label>
            </>
          )}
          {uploadError ? <p className="mt-4 text-sm text-danger">{uploadError}</p> : null}
        </div>
      ) : null}

      {mode === "text" ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="source" className="label">
              Source
            </label>
            <span className="font-mono text-[11px] text-muted">{text.length.toLocaleString("en-GB")} characters</span>
          </div>
          {uploadNote ? <Notice tone="accent">{uploadNote}</Notice> : null}
          <textarea
            id="source"
            name="source"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className={`${inputClass} resize-y font-sans leading-relaxed`}
            placeholder="Paste a judgment, your notes on a case, or a legal update. Junior will only use what is here."
          />
        </div>
      ) : (
        <input type="hidden" name="source" value={text} />
      )}

      {findings.length > 0 && mode === "text" ? (
        <section
          aria-labelledby="pii-heading"
          className={`rounded-[4px] border px-5 py-4 ${blockedByPii ? "border-danger bg-danger-soft" : "border-line bg-surface"}`}
        >
          <h2 id="pii-heading" className="font-serif text-lg text-ink">
            {sensitive.length
              ? kept
                ? "You chose to keep these details"
                : "This looks like it contains personal details"
              : "Case names found"}
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            {sensitive.length
              ? "Strip them before Junior reads the text. Client details should not leave your hands, and they never belong in a post."
              : "Names from a published judgment are public. Strip them if your client is a party."}
          </p>
          <ul className="mt-3 space-y-1.5">
            {findings.map((f) => (
              <li key={f.id}>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input type="checkbox" checked={isSelected(f)} onChange={() => toggle(f)} className="mt-0.5 accent-[var(--ink)]" />
                  <span>
                    <span className="label mr-2">{PII_LABEL[f.kind]}</span>
                    <span className="font-medium text-ink">{f.value}</span>
                    {f.count > 1 ? <span className="text-muted"> · {f.count} times</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" onClick={strip} disabled={!findings.some(isSelected)}>
              Strip selected
            </Button>
            {sensitive.length && !kept ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setKeptKey(findingsKey)}>
                These are not client details
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted">Junior looks for common patterns and can miss names. Read the text before you send it.</p>
        </section>
      ) : null}

      {redactions > 0 && findings.filter((f) => f.defaultStrip).length === 0 ? (
        <Notice tone="accent">
          {redactions} detail{redactions === 1 ? "" : "s"} replaced with labels such as [Name]. Junior will write around them.
        </Notice>
      ) : null}

      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {demo ? (
        <Notice>
          Demo mode: no Anthropic key is set, so Junior will return placeholder drafts built from your text. Add
          ANTHROPIC_API_KEY for real drafts.
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={tooShort || blockedByPii || uploading} className="min-w-40">
          Ask Junior
        </Button>
        <p className="text-sm text-muted">
          {tooShort
            ? "Paste at least a few sentences."
            : blockedByPii
              ? "Deal with the personal details first."
              : "You will review every draft before anything goes out."}
        </p>
      </div>
    </form>
  );
}
