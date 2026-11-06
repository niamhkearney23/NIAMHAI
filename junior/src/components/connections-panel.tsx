import { disconnectAccount } from "@/app/(app)/settings/actions";
import type { Connections, Provider } from "@/lib/connections";
import { providerConfigured } from "@/lib/platforms/config";
import { formatDate } from "@/lib/time";
import { ButtonLink, buttonClass, Notice } from "./ui";

const ERRORS: Record<string, string> = {
  cancelled: "The connection was cancelled. Nothing was changed.",
  state: "That sign-in could not be verified. Please try again.",
  failed: "Junior could not finish connecting. Please try again.",
  no_pages: "Facebook did not share any Pages. Choose at least one Page when Facebook asks, then try again.",
  not_configured: "Connections are not switched on for this workspace yet. Your administrator needs to add the app keys.",
};

const NAMES: Record<string, string> = { meta: "Facebook", linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram" };

export function ConnectionsPanel({
  connections,
  timezone,
  connected,
  error,
  errorProvider,
}: {
  connections: Connections;
  timezone: string;
  connected?: string;
  error?: string;
  errorProvider?: string;
}) {
  const metaReady = providerConfigured("meta");
  const linkedinReady = providerConfigured("linkedin");
  const fb = connections.facebook;
  const ig = connections.instagram;
  const li = connections.linkedin;

  const rows: {
    provider: Provider;
    name: string;
    detail: string;
    state: "connected" | "expired" | "pending" | "off";
    action: React.ReactNode;
  }[] = [
    {
      provider: "facebook",
      name: "Facebook Page",
      detail:
        fb?.status === "active"
          ? fb.display_name
          : fb?.status === "pending"
            ? "Choose which Page Junior posts to."
            : fb?.status === "expired"
              ? "Access expired. Reconnect to keep publishing."
              : "Junior posts to a Page you manage.",
      state: fb?.status === "active" ? "connected" : fb?.status === "expired" ? "expired" : fb?.status === "pending" ? "pending" : "off",
      action:
        fb?.status === "pending" ? (
          <ButtonLink href="/settings/facebook-page" size="sm">
            Choose a Page
          </ButtonLink>
        ) : fb?.status === "active" ? (
          <Disconnect provider="facebook" />
        ) : metaReady ? (
          <ConnectButton href="/api/connect/meta" variant="primary">
            {fb?.status === "expired" ? "Reconnect" : "Connect Facebook"}
          </ConnectButton>
        ) : (
          <span className="label">Not available yet</span>
        ),
    },
    {
      provider: "instagram",
      name: "Instagram",
      detail:
        ig?.status === "active"
          ? `${ig.display_name}, through ${fb?.display_name ?? "your Page"}`
          : fb?.status === "active"
            ? "No Instagram professional account is linked to this Page. Link one in Meta Business Suite, then reconnect Facebook."
            : "Connects through your Facebook Page. It must be a professional account linked to that Page.",
      state: ig?.status === "active" ? "connected" : ig?.status === "expired" ? "expired" : "off",
      action:
        ig?.status === "active" ? (
          <span className="label">With Facebook</span>
        ) : fb?.status === "active" && metaReady ? (
          <ConnectButton href="/api/connect/meta" variant="secondary">
            Reconnect Facebook
          </ConnectButton>
        ) : null,
    },
    {
      provider: "linkedin",
      name: "LinkedIn",
      detail:
        li?.status === "active"
          ? `${li.display_name}${li.token_expires_at ? `. Reconnect by ${formatDate(li.token_expires_at, timezone)}` : ""}`
          : li?.status === "expired"
            ? "Access expired. Reconnect to keep publishing."
            : "Junior posts to your personal profile.",
      state: li?.status === "active" ? "connected" : li?.status === "expired" ? "expired" : "off",
      action:
        li?.status === "active" ? (
          <Disconnect provider="linkedin" />
        ) : linkedinReady ? (
          <ConnectButton href="/api/connect/linkedin" variant="primary">
            {li?.status === "expired" ? "Reconnect" : "Connect LinkedIn"}
          </ConnectButton>
        ) : (
          <span className="label">Not available yet</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {connected ? <Notice tone="accent">{NAMES[connected] ?? "Account"} connected. Junior can now publish approved posts there.</Notice> : null}
      {error ? (
        <Notice tone="danger">
          {errorProvider ? `${NAMES[errorProvider] ?? ""}: ` : ""}
          {ERRORS[error] ?? ERRORS.failed}
        </Notice>
      ) : null}
      <ul className="divide-y divide-line rounded-[4px] border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.provider} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                {r.name}
                <span
                  className={`label ${r.state === "connected" ? "text-accent" : r.state === "expired" ? "text-danger" : ""}`}
                >
                  {r.state === "connected" ? "Connected" : r.state === "expired" ? "Expired" : r.state === "pending" ? "One more step" : "Not connected"}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-ink-2">{r.detail}</p>
            </div>
            {r.action}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Access tokens are encrypted before they are stored and are never sent to your browser. Junior only posts what you
        have approved.
      </p>
    </div>
  );
}

// A full page load, not client routing: the route sends the browser on to
// Facebook or LinkedIn.
function ConnectButton({ href, variant, children }: { href: string; variant: "primary" | "secondary"; children: React.ReactNode }) {
  return (
    <form action={href} method="get">
      <button type="submit" className={buttonClass(variant, "sm")}>
        {children}
      </button>
    </form>
  );
}

function Disconnect({ provider }: { provider: Provider }) {
  return (
    <form action={disconnectAccount}>
      <input type="hidden" name="provider" value={provider} />
      <button type="submit" className={buttonClass("ghost", "sm")}>
        Disconnect
      </button>
    </form>
  );
}
