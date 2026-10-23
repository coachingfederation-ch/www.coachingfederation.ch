# Ballot question PR note

- Summary: adds a clear voting question to the Ballot section, with an AI suggestion based on buffered proposal text that staff can refine before saving.
- UI: editable question in each language, explicit suggestion action, safe replacement confirmation, and question above member choices and in confirmation.
- Backend/schema: nullable question fields for EN/DE/FR/IT; existing role guards and RLS retained; question freezes when published voting begins. Suggestion is manager-only and rate-limited, and never saves or publishes.
- Testing: pending unit tests and authenticated suggestion, refinement, save/reload, and member preview checks.
- Risks/rollback: additive nullable fields keep existing votes usable. Revert application changes and leave fields unused. AI wording and translations require staff review.
- Follow-ups/known debt: no automatic re-generation when proposal text changes.