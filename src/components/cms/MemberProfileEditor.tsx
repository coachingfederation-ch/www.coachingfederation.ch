/**
 * Member Area profile editor.
 *
 * Only local, member-owned fields are editable here. Imported ICF identity is
 * shown read-only, and accreditation flags are staff-maintained: the member
 * can declare *availability* for mentoring/supervision but never accreditation.
 *
 * Composes useMemberProfileForm (state/logic) with the member-profile
 * section components; see src/components/cms/member-profile/.
 */
import { ProfileTranslationsPanel } from "@/components/member/ProfileTranslationsPanel";
import { AboutSection } from "./member-profile/AboutSection";
import { ContactSection } from "./member-profile/ContactSection";
import { CorrespondenceSection } from "./member-profile/CorrespondenceSection";
import { FacetSection } from "./member-profile/FacetSection";
import { IdentitySection } from "./member-profile/IdentitySection";
import { LinksSection } from "./member-profile/LinksSection";
import { PracticeSection } from "./member-profile/PracticeSection";
import { ProfilePhotoField } from "./member-profile/ProfilePhotoField";
import { ServicesSection } from "./member-profile/ServicesSection";
import { TeamBioSection } from "./member-profile/TeamBioSection";
import { TestimonialSection } from "./member-profile/TestimonialSection";
import { VisibilitySection } from "./member-profile/VisibilitySection";
import { useMemberProfileForm } from "./member-profile/useMemberProfileForm";

export function MemberProfileEditor() {
  const {
    t,
    locale,
    isTeamMember,
    data,
    vocab,
    tagline,
    setTagline,
    description,
    setDescription,
    availability,
    setAvailability,
    correspondenceLocale,
    setCorrespondenceLocale,
    services,
    setServices,
    facets,
    toggle,
    practice,
    setPractice,
    links,
    setLinks,
    imagePath,
    setImagePath,
    imageUrl,
    status,
    error,
    fileRef,
    profile,
    member,
    publishBlocked,
    save,
    onPickPhoto,
  } = useMemberProfileForm();

  if (error && !data) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">{t("member.loading")}</p>;
  if (data === "unbound")
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">{t("member.unboundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("member.unboundBody")}</p>
      </div>
    );
  if (!profile)
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("member.noProfile")}</p>
      </div>
    );

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{t("member.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("member.subtitle")}</p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <IdentitySection
        t={t}
        fullName={member?.full_name ?? null}
        credentialSlug={member?.credential_slug ?? null}
        cstRecno={member?.cst_recno ?? null}
        eligibilityReason={data.eligibility.reason}
      />

      <ProfilePhotoField
        t={t}
        fullName={member?.full_name ?? null}
        imageUrl={imageUrl}
        imagePath={imagePath}
        fileRef={fileRef}
        onPickPhoto={onPickPhoto}
        onRemove={() => setImagePath(null)}
      />

      <AboutSection
        t={t}
        tagline={tagline}
        setTagline={setTagline}
        description={description}
        setDescription={setDescription}
      />

      <ServicesSection
        t={t}
        locale={locale}
        vocab={vocab}
        services={services}
        setServices={setServices}
        availability={availability}
        setAvailability={setAvailability}
        mentorAccredited={profile.mentor_accredited}
        supervisionAccredited={profile.supervision_accredited}
      />

      <FacetSection
        title={t("member.regionsTitle")}
        note={t("member.regionsNote")}
        rows={vocab?.cf_regions ?? []}
        selected={facets.region_ids}
        onToggle={toggle("region_ids")}
        locale={locale}
      />

      <FacetSection
        title={t("member.languagesTitle")}
        rows={vocab?.cf_languages ?? []}
        selected={facets.language_ids}
        onToggle={toggle("language_ids")}
        locale={locale}
      />

      <CorrespondenceSection
        t={t}
        value={correspondenceLocale}
        onChange={setCorrespondenceLocale}
      />

      <FacetSection
        title={t("member.formatsTitle")}
        rows={vocab?.cf_formats ?? []}
        selected={facets.format_ids}
        onToggle={toggle("format_ids")}
        locale={locale}
      />

      <FacetSection
        title={t("member.specialisationsTitle")}
        rows={vocab?.cf_specialisations ?? []}
        selected={facets.specialisation_ids}
        onToggle={toggle("specialisation_ids")}
        locale={locale}
      />

      <FacetSection
        title={t("member.clientTypesTitle")}
        note={t("member.clientTypesNote")}
        rows={vocab?.cf_client_types ?? []}
        selected={facets.client_type_ids}
        onToggle={toggle("client_type_ids")}
        locale={locale}
      />

      <PracticeSection
        t={t}
        locale={locale}
        vocab={vocab}
        practice={practice}
        setPractice={setPractice}
      />

      <ContactSection t={t} practice={practice} setPractice={setPractice} email={member?.email} />

      <TestimonialSection t={t} practice={practice} setPractice={setPractice} />

      <LinksSection t={t} links={links} setLinks={setLinks} />

      {isTeamMember ? <TeamBioSection t={t} practice={practice} setPractice={setPractice} /> : null}

      <ProfileTranslationsPanel showTeamFields={isTeamMember} />

      <VisibilitySection
        t={t}
        visibility={profile.visibility}
        publishBlocked={publishBlocked}
        status={status}
        onSave={(visibility) => void save(visibility)}
      />
    </>
  );
}
