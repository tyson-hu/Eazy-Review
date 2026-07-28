-- Task 11 review hardening: every public-schema helper in the core schema is
-- internal to a trigger path and must not be directly executable by client
-- roles. PostgreSQL grants function EXECUTE to PUBLIC by default, so revoke
-- both inherited and explicit client-role access.

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon, authenticated;

revoke execute on function public.reject_user_rating_identity_change()
  from public;
revoke execute on function public.reject_user_rating_identity_change()
  from anon, authenticated;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user()
  from anon, authenticated;

revoke execute on function public.create_zero_rating_aggregate()
  from public;
revoke execute on function public.create_zero_rating_aggregate()
  from anon, authenticated;

revoke execute on function public.refresh_rating_aggregates(uuid)
  from public;
revoke execute on function public.refresh_rating_aggregates(uuid)
  from anon, authenticated;

revoke execute on function public.handle_user_rating_change() from public;
revoke execute on function public.handle_user_rating_change()
  from anon, authenticated;
