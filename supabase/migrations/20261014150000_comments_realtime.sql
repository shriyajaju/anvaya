-- Studio review comments refresh live on the evidence step.
do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
end $$;
