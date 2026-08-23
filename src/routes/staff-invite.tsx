/**
 * Internal invitation landing (/staff-invite?token=…).
 *
 * The invited staff account arrives here with no session. The emailed token is
 * ours (24 hours, single use); the server validates it and mints a fresh
 * one-time recovery hash on the spot, which establishes the session here,
 * the invitee sets a password, and we mark the invitation accepted before
 * handing over to whatever their roles allow. Copy is English: internal
 * chapter administration runs in English, like the invitation email itself.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { completeInternalInvitation, exchangeInternalInvite } from "@/lib/roles.functions";
import { AuthCard } from "@/components/auth/auth-screen";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";

export const Route = createFileRoute("/staff-invite")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Set your password — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffInvitePage,
});

function StaffInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"verifying" | "ready" | "expired" | "saving">("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) {
        setPhase("expired");
        return;
      }
      // Our token carries the 24-hour promise; the Supabase hash is minted now
      // so its own (shorter) lifetime never expires before the invitee arrives.
      const exchanged = await exchangeInternalInvite({ data: { token } }).catch(() => null);
      if (cancelled) return;
      const tokenHash = exchanged?.tokenHash;
      if (!tokenHash) {
        setPhase("expired");
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });
      if (cancelled) return;
      setPhase(verifyError ? "expired" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Please choose a password of at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setPhase("saving");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Could not set the password. Please request a new invitation link.");
      setPhase("ready");
      return;
    }
    await completeInternalInvitation().catch(() => null);
    void navigate({ to: "/auth/callback", search: { next: "" }, replace: true });
  };

  if (phase === "verifying") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-center">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking your invitation…
        </p>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <AuthCard
        title="This invitation link is no longer valid"
        subtitle="Ask a Super Admin to send you a new invitation."
      >
        <p className="text-sm text-muted-foreground">Links work once and expire after 24 hours.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set your password"
      subtitle="Choose a password for your internal account with The Switzerland Chapter of ICF."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-semibold">
            Repeat password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={phase === "saving"} className="w-full">
          {phase === "saving" ? "Saving…" : "Set password and continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
