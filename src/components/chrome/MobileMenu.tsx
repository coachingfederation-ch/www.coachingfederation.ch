/**
 * Account links block rendered inside the design system header's mobile sheet.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n";
import { signOutHere, useHeaderSession } from "@/components/chrome/constants";

/** Account entries inside the mobile menu sheet. */
export function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useI18n();
  const { userId, roles } = useHeaderSession();
  const item = "rounded-full px-4 py-2.5 text-left text-white/85 transition hover:text-white";

  return (
    <div className="mt-2 flex flex-col border-t border-white/15 pt-2">
      {!userId ? (
        <Link to="/auth" search={{ next: undefined }} onClick={onNavigate} className={item}>
          {t("common.nav.memberLogin")}
        </Link>
      ) : (
        <>
          <Link to="/my-profile" onClick={onNavigate} className={item}>
            {t("common.nav.myProfile")}
          </Link>
          {roles.isEditor && (
            <Link to="/articles" onClick={onNavigate} className={item}>
              {t("common.nav.insightsCms")}
            </Link>
          )}
          <button type="button" onClick={() => void signOutHere()} className={item}>
            {t("common.nav.signOut")}
          </button>
        </>
      )}
    </div>
  );
}
