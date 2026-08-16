/**
 * Member Area tile for activated live-chat volunteers.
 *
 * Rendered only when the signed-in member holds an activation row: the QR code
 * is the fastest way onto a phone, the link covers desktop, and opting out is
 * self-service so nobody has to ask an admin to be removed.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { MessagesSquare, ExternalLink } from "lucide-react";
import { useCms } from "@/i18n/cms";
import {
  getMyVolunteerStatus,
  leaveLiveChatVolunteers,
} from "@/lib/live-chat-volunteers.functions";

const CARD = "rounded-2xl border border-border bg-card p-6";
const CTA =
  "mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90";

export function LiveChatVolunteerTile() {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["live-chat-volunteer-status"],
    queryFn: () => getMyVolunteerStatus(),
  });

  useEffect(() => {
    if (!data?.active) return;
    const target = `${window.location.origin}/volunteer-chat`;
    setUrl(target);
    void QRCode.toDataURL(target, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [data?.active]);

  if (!data?.active) return null;

  const optOut = async () => {
    if (!window.confirm(t("member.home.liveChat.confirmLeave"))) return;
    setBusy(true);
    await leaveLiveChatVolunteers();
    await queryClient.invalidateQueries({ queryKey: ["live-chat-volunteer-status"] });
    setBusy(false);
  };

  return (
    <section className={CARD}>
      <MessagesSquare className="h-5 w-5 text-primary" aria-hidden />
      <h2 className="mt-3 text-lg font-bold">{t("member.home.liveChat.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("member.home.liveChat.body")}</p>
      <div className="mt-4 flex items-center gap-4">
        {qr ? (
          <img src={qr} alt={t("member.home.liveChat.qrAlt")} className="size-28 shrink-0" />
        ) : (
          <div className="size-28 shrink-0 rounded-xl bg-secondary" />
        )}
        <p className="text-xs text-muted-foreground">{t("member.home.liveChat.qrHint")}</p>
      </div>
      <a href={url || "/volunteer-chat"} target="_blank" rel="noopener noreferrer" className={CTA}>
        {t("member.home.liveChat.open")}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
      <button
        type="button"
        onClick={() => void optOut()}
        disabled={busy}
        className="mt-3 block text-xs font-semibold text-muted-foreground underline disabled:opacity-60"
      >
        {t("member.home.liveChat.leave")}
      </button>
    </section>
  );
}
