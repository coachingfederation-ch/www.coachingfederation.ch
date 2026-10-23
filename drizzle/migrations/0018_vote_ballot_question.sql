ALTER TABLE public.votes
  ADD COLUMN ballot_question text,
  ADD COLUMN ballot_question_de text,
  ADD COLUMN ballot_question_fr text,
  ADD COLUMN ballot_question_it text,
  ADD CONSTRAINT votes_ballot_question_length CHECK (
    char_length(ballot_question) <= 600 AND
    char_length(ballot_question_de) <= 600 AND
    char_length(ballot_question_fr) <= 600 AND
    char_length(ballot_question_it) <= 600
  );
CREATE FUNCTION public.freeze_vote_ballot_question()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status <> 'draft' AND OLD.opens_at <= now() AND
     ROW(NEW.ballot_question, NEW.ballot_question_de, NEW.ballot_question_fr, NEW.ballot_question_it)
     IS DISTINCT FROM ROW(OLD.ballot_question, OLD.ballot_question_de, OLD.ballot_question_fr, OLD.ballot_question_it) THEN
    RAISE EXCEPTION 'The ballot question cannot change after voting has started.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.freeze_vote_ballot_question() FROM PUBLIC;
CREATE TRIGGER votes_freeze_ballot_question BEFORE UPDATE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.freeze_vote_ballot_question();