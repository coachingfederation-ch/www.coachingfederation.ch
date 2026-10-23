# Ballot question PR note

- Summary: adds a clear voting question to the Ballot section, with an AI suggestion based on buffered proposal text that staff can refine before saving.
- UI: editable question in each language, explicit suggestion action, safe replacement confirmation, and question above member choices and in confirmation.
- Backend/schema: nullable question fields for EN/DE/FR/IT; existing role guards and RLS retained; question freezes when published voting begins. Suggestion is manager-only and rate-limited, and never saves or publishes.
- Testing: 26 tests passed, including question input validation, translated question preservation, frozen-language comparison, and existing voting/access contracts. A signed-in vote manager generated a real AI suggestion, refined and saved it, reloaded it, translated it, and opened the read-only member preview. Desktop and phone screenshots passed inspection with no phone overflow. The temporary draft was deleted. Preview build is OK. Live ballot submission and cross-role denial were not repeated because eligibility and submission logic are unchanged.
- Risks/rollback: additive nullable fields keep existing votes usable. Revert application changes and leave fields unused. AI wording and translations require staff review.
- Follow-ups/known debt: no automatic re-generation when proposal text changes.