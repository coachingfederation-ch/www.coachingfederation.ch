/**
 * Member Area tile for activated live-chat volunteers.
 *
 * Rendered only when the signed-in member holds an activation row. The QR code
 * is minted on demand and carries a single-use, ten-minute sign-in code, so the
 * phone that scans it lands in the console without typing a password — and a
 * screenshot of the code is worthless minutes later. The plain link covers
 * desktop, and opting out is self-service.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { MessagesSquare, ExternalLink, QrCode, Loader2 } from "lucide-react";
import { useCms } from "@/i18n/cms";
import {
  getMyVolunteerStatus,
  leaveLiveChatVolunteers,
} from "@/lib/live-chat-volunteers.functions";
import { createVolunteerLoginCode } from "@/lib/volunteer-qr.functions";

const CARD = "rounded-2xl border border-border bg-card p-6";
const CTA =
  "mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90";

export function LiveChatVolunteerTile() {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [minting, setMinting] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const { data } = useQuery({
    queryKey: ["live-chat-volunteer-status"],
    queryFn: () => getMyVolunteerStatus(),
  });

  useEffect(() => {
    if (!data?.active) return;
    setUrl(`${window.location.origin}/volunteer-chat`);
  }, [data?.active]);

  // Countdown so a stale code visibly disappears instead of failing silently.
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setQr(null);
        setExpiresAt(null);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (!data?.active) return null;

  const showQr = async () => {
    setMinting(true);
    const result = await createVolunteerLoginCode().catch(() => null);
    if (result?.token) {
      const target = `${window.location.origin}/volunteer-login/${result.token}`;
      const image = await QRCode.toDataURL(target, { width: 320, margin: 1 }).catch(() => null);
      setQr(image);
      setExpiresAt(Date.now() + result.expiresInMinutes * 60_000);
    }
    setMinting(false);
  };

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
      {qr ? (
        <div className="mt-4 flex items-center gap-4">
          <img src={qr} alt={t("member.home.liveChat.qrAlt")} className="size-36 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">{t("member.home.liveChat.qrHint")}</p>
            <p className="mt-2 text-xs font-semibold text-foreground">
              {t("member.home.liveChat.qrExpiresIn")} {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">{t("member.home.liveChat.qrIntro")}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void showQr()} disabled={minting} className={CTA}>
          {minting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <QrCode className="h-4 w-4" aria-hidden />
          )}
          {qr ? t("member.home.liveChat.qrRenew") : t("member.home.liveChat.qrShow")}
        </button>
        <a
          href={url || "/volunteer-chat"}
          target="_blank"
          rel="noopener noreferrer"
          className={`${CTA} bg-secondary text-secondary-foreground`}
        >
          {t("member.home.liveChat.open")}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("member.home.liveChat.installHint")}</p>
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
