import type { Channel, Jurisdiction, PostStatus, TimeZone } from "./types";

export const CHANNELS: Channel[] = ["linkedin", "instagram", "facebook", "newsletter"];

export const CHANNEL_LABEL: Record<Channel, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  newsletter: "Newsletter",
};

export const CHANNEL_DESCRIPTION: Record<Channel, string> = {
  linkedin: "Post",
  instagram: "Carousel and caption",
  facebook: "Page post",
  newsletter: "Newsletter piece",
};

/** Channels that must end with a general information line. */
export const NEEDS_GENERAL_INFO_LINE: Record<Channel, boolean> = {
  linkedin: true,
  instagram: false,
  facebook: true,
  newsletter: true,
};

export const GENERAL_INFO_LINE = "This is general information only and not legal advice.";

export const STATUS_LABEL: Record<PostStatus, string> = {
  to_review: "To review",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
};

export const STATUSES: PostStatus[] = ["to_review", "approved", "scheduled", "posted"];

export const JURISDICTION_LABEL: Record<Jurisdiction, string> = {
  MY: "Malaysia",
  SG: "Singapore",
  BOTH: "Malaysia and Singapore",
};

export const DEFAULT_TIMEZONE: Record<Jurisdiction, TimeZone> = {
  MY: "Asia/Kuala_Lumpur",
  SG: "Asia/Singapore",
  BOTH: "Asia/Kuala_Lumpur",
};

export const PRACTICE_AREAS = [
  "Banking and finance",
  "Construction",
  "Conveyancing and property",
  "Corporate and commercial",
  "Criminal",
  "Dispute resolution",
  "Employment",
  "Family",
  "Immigration",
  "Insolvency",
  "Intellectual property",
  "Personal injury",
  "Shipping",
  "Tax",
  "Technology and data",
  "Wills and probate",
];

export const PLATFORM_LIMITS = {
  linkedinChars: 3000,
  instagramCaptionChars: 2200,
  instagramHashtags: 30,
  instagramMinCards: 4,
  instagramMaxCards: 6,
  instagramCardChars: 220,
  newsletterSubjectChars: 120,
} as const;
