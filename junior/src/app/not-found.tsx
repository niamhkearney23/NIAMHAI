import { MascotMessage } from "@/components/mascot";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <MascotMessage title="Junior cannot find that page">It may have been deleted, or the link is wrong.</MascotMessage>
      <ButtonLink href="/draft" variant="secondary" className="self-start">
        Back to drafting
      </ButtonLink>
    </main>
  );
}
