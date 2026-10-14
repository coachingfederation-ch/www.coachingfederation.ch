/**
 * Slim frame for external advertisers (non-members) on /advertise.
 *
 * Same Deep Blue chrome as the rest of the site but with no Member Area
 * navigation: an advertiser account can only reach the booking portal.
 */
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button, SiteHeader } from "@/design-system/icf-welcome-design-system-a835df";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { SiteFooter } from "@/components/site-chrome";

export function AdvertiserShell({ children }: { children: ReactNode }) {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/advertise", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        variant="compact"
        homeTo="/"
        items={[{ to: "/advertise", label: t("advertiser.nav.portal") }]}
        cta={{ to: "/find-a-coach", label: t("member.nav.findACoach") }}
        navLabel={t("member.nav.primaryLabel")}
        brandLabel={t("member.nav.homeAria")}
        skipToContentLabel={t("member.nav.skipToContent")}
        openMenuLabel={t("member.nav.menuOpen")}
        closeMenuLabel={t("member.nav.menuClose")}
        utilitySlot={
          <Button
            type="button"
            variant="inverse-ghost"
            size="pill"
            onClick={() => void handleSignOut()}
            aria-label={t("nav.signOut")}
          >
            <LogOut aria-hidden />
            {t("nav.signOut")}
          </Button>
        }
      />
      <main id="main" className="mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
