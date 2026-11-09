import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Badge, Panel } from "@/components/ui";
import { formatDateTime } from "@/lib/time";

export interface InboundRow {
  id: string;
  status: "received" | "processing" | "drafted" | "rejected" | "failed";
  reason: string | null;
  brief_id: string | null;
  redactions: number;
  received_at: string;
}

const LABEL: Record<InboundRow["status"], string> = {
  received: "Waiting",
  processing: "Drafting",
  drafted: "Drafted",
  rejected: "Not used",
  failed: "Failed",
};

/** "Email Junior": where to forward a judgment, who it accepts it from, and what happened to recent emails. */
export function InboundPanel({ address, signInEmail, rows, timezone }: { address: string; signInEmail: string; rows: InboundRow[]; timezone: string }) {
  return (
    <div className="space-y-4">
      <Panel className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[15px] text-ink">{address}</p>
          <CopyButton text={address} label="Copy address" />
        </div>
        <p className="text-[15px] text-ink-2">
          Forward a judgment, or attach it as a PDF, from <strong className="font-medium text-ink">{signInEmail}</strong>. Junior
          drafts all four posts and puts them in To review. Nothing is posted until you approve it.
        </p>
        <p className="text-sm text-muted">
          Junior only accepts email from the address you sign in with, and only when your mail service has signed it. Scanned
          PDFs cannot be read. Names, IC numbers and phone numbers are removed before drafting.
        </p>
      </Panel>

      {rows.length ? (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Received", "Result", "Detail"].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">{formatDateTime(row.received_at, timezone)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={row.status === "drafted" ? "accent" : row.status === "received" || row.status === "processing" ? "plain" : "danger"}>
                      {LABEL[row.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {row.brief_id ? (
                      <Link href={`/briefs/${row.brief_id}`} className="text-accent underline underline-offset-2">
                        Open the drafts
                      </Link>
                    ) : (
                      row.reason
                    )}
                    {row.brief_id && row.redactions ? ` · ${row.redactions} detail${row.redactions === 1 ? "" : "s"} removed` : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}
    </div>
  );
}
