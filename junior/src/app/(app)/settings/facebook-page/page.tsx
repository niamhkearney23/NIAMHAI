import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonClass, PageHeader } from "@/components/ui";
import { readPendingPages } from "@/lib/connections";
import { requireUser } from "@/lib/dal";
import { choosePage } from "../actions";

export const metadata: Metadata = { title: "Choose a Page" };

export default async function FacebookPagePicker() {
  const user = await requireUser();
  const pending = await readPendingPages(user.id);
  if (!pending?.pages.length) redirect("/settings#connections");

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Facebook" title="Which Page should Junior post to?">
        You manage more than one Page. Junior posts to one. If it has an Instagram professional account linked, Junior
        connects that too.
      </PageHeader>
      <ul className="divide-y divide-line rounded-[4px] border border-line bg-surface">
        {pending.pages.map((page) => (
          <li key={page.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5">
            <div>
              <p className="text-[15px] font-medium text-ink">{page.name}</p>
              <p className="text-sm text-ink-2">
                {page.instagram ? `Instagram: @${page.instagram.username}` : "No Instagram account linked"}
              </p>
            </div>
            <form action={choosePage}>
              <input type="hidden" name="page_id" value={page.id} />
              <button type="submit" className={buttonClass("primary", "sm")}>
                Use this Page
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
