<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Personal data hygiene

Never put real member data into files that live in this repository — plans
(`.lovable/`), docs, migrations, code comments, or commit messages. That
includes names, private email addresses, phone numbers, ICF member numbers
(`cst_recno`) and account ids. When illustrating a screen that displays member
records, use obvious placeholders (`Anna Muster`, `anna.muster@example.com`,
`ICF 000000`). The only address that may appear verbatim is the chapter's
public `office@coachingfederation.ch`.

Live member data belongs in the database, behind RLS — not in version control.
