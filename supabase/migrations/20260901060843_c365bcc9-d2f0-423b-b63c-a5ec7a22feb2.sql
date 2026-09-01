ALTER TABLE public.op_projects
  ADD COLUMN is_project_team boolean NOT NULL DEFAULT false;

ALTER TABLE public.op_projects
  ADD CONSTRAINT op_projects_project_team_not_community
  CHECK (NOT (is_project_team AND is_community));