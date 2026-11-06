export type Jurisdiction = "MY" | "SG" | "BOTH";
export type Channel = "linkedin" | "instagram" | "facebook" | "newsletter";
export type PostStatus = "to_review" | "approved" | "scheduled" | "posted";
export type SourceKind = "text" | "pdf" | "audio";
export type TimeZone = "Asia/Kuala_Lumpur" | "Asia/Singapore";

export interface Check {
  key: string;
  item: string;
  pass: boolean;
  note: string;
  /** Blocking checks must be fixed in the text; they cannot be ticked off. */
  blocking?: boolean;
  /** An automatic fix the editor can offer. */
  fix?: FixId;
}

export type FixId = "emojis" | "dashes" | "spelling";

export interface CheckAck {
  at: string;
  by: string;
}

export interface Card {
  heading: string;
  body: string;
}

export interface Profile {
  id: string;
  full_name: string;
  firm: string;
  jurisdiction: Jurisdiction;
  practice_areas: string[];
  voice_samples: string[];
  timezone: TimeZone;
  onboarded_at: string | null;
  brand_cover: string;
  brand_card: string;
  brand_accent: string;
  newsletter_enabled: boolean;
  newsletter_from_name: string;
  newsletter_reply_to: string;
  newsletter_footer: string;
  newsletter_slug: string | null;
}

export interface Brief {
  id: string;
  title: string;
  source_kind: SourceKind;
  source_name: string | null;
  source_text: string;
  redactions: number;
  pii_kept: boolean;
  drafted_with: string;
  created_at: string;
}

export interface Post {
  id: string;
  brief_id: string;
  channel: Channel;
  status: PostStatus;
  title: string;
  body: string;
  cards: Card[];
  checks: Check[];
  rule_checks: Check[];
  check_acks: Record<string, CheckAck>;
  scheduled_for: string | null;
  approved_at: string | null;
  approved_by: string | null;
  posted_at: string | null;
  publish_state: "publishing" | "failed" | null;
  publish_error: string | null;
  publish_retryable: boolean;
  publish_attempts: number;
  next_attempt_at: string | null;
  external_url: string | null;
  published_via: "junior" | "manual" | null;
  created_at: string;
  updated_at: string;
}

export interface PostContent {
  title: string;
  body: string;
  cards: Card[];
}

export interface ApprovalLogEntry {
  id: number;
  post_id: string | null;
  actor_email: string;
  action:
    | "approved"
    | "approval_revoked"
    | "scheduled"
    | "unscheduled"
    | "marked_posted"
    | "check_ticked"
    | "check_unticked"
    | "publish_requested"
    | "published"
    | "publish_failed";
  channel: Channel | null;
  content_hash: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}
