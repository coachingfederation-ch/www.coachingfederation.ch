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
import {
  ProfileEditorHeader,
  ProfileEditorNav,
  ProfileGroup,
  ProfileSaveBar,
} from "./member-profile/ProfileEditorChrome";
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
    savedRevision,
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

  const groups = [
    { id: "profile-identity", label: t("member.groups.identity") },
    { id: "profile-expertise", label: t("member.groups.expertise") },
    { id: "profile-practice", label: t("member.groups.practice") },
    { id: "profile-contact", label: t("member.groups.contact") },
    { id: "profile-visibility", label: t("member.groups.visibility") },
  ];

  return (
    <div className="space-y-8">
      <ProfileEditorHeader
        t={t}
        title={t("member.title")}
        subtitle={t("member.subtitle")}
        visibility={profile.visibility}
        publishBlocked={publishBlocked}
        status={status}
        profileId={profile.id}
        onSave={(visibility) => void save(visibility)}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* min-w-0 on both columns: the mobile chip row is wider than the screen
          and would otherwise stretch the whole grid. */}
      <div className="grid gap-8 lg:grid-cols-4">
        <div className="min-w-0 lg:col-span-1">
          <ProfileEditorNav groups={groups} label={t("member.groups.navLabel")} />
        </div>

        <div className="min-w-0 space-y-8 lg:col-span-3">
          <ProfileGroup id="profile-identity" title={t("member.groups.identity")}>
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
          </ProfileGroup>

          <ProfileGroup id="profile-expertise" title={t("member.groups.expertise")}>
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
            <FacetSection
              title={t("member.regionsTitle")}
              note={t("member.regionsNote")}
              rows={vocab?.cf_regions ?? []}
              selected={facets.region_ids}
              onToggle={toggle("region_ids")}
              locale={locale}
            />
            <FacetSection
              title={t("member.formatsTitle")}
              rows={vocab?.cf_formats ?? []}
              selected={facets.format_ids}
              onToggle={toggle("format_ids")}
              locale={locale}
            />
            <FacetSection
              title={t("member.languagesTitle")}
              rows={vocab?.cf_languages ?? []}
              selected={facets.language_ids}
              onToggle={toggle("language_ids")}
              locale={locale}
            />
          </ProfileGroup>

          <ProfileGroup id="profile-practice" title={t("member.groups.practice")}>
            <PracticeSection
              t={t}
              locale={locale}
              vocab={vocab}
              practice={practice}
              setPractice={setPractice}
            />
            <TestimonialSection t={t} practice={practice} setPractice={setPractice} />
            {isTeamMember ? (
              <TeamBioSection t={t} practice={practice} setPractice={setPractice} />
            ) : null}
          </ProfileGroup>

          <ProfileGroup id="profile-contact" title={t("member.groups.contact")}>
            <ContactSection
              t={t}
              practice={practice}
              setPractice={setPractice}
              email={member?.email}
            />
            <LinksSection t={t} links={links} setLinks={setLinks} />
            <CorrespondenceSection
              t={t}
              value={correspondenceLocale}
              onChange={setCorrespondenceLocale}
            />
          </ProfileGroup>

          <ProfileGroup id="profile-visibility" title={t("member.groups.visibility")}>
            <ProfileTranslationsPanel showTeamFields={isTeamMember} refreshKey={savedRevision} />
            <VisibilitySection
              t={t}
              visibility={profile.visibility}
              publishBlocked={publishBlocked}
              status={status}
              onSave={(visibility) => void save(visibility)}
            />
          </ProfileGroup>
        </div>
      </div>

      <ProfileSaveBar
        t={t}
        visibility={profile.visibility}
        publishBlocked={publishBlocked}
        status={status}
        onSave={(visibility) => void save(visibility)}
      />
    </div>
  );
}
