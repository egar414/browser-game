-- TOTP accounts require an Auth-verified AAL2 token for all game access.
-- Apply after migrations 001–004. Does not enrol or change any user's factors.
begin;
create or replace function public.er_require_aal2() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')
 and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
  raise exception 'Verify your authenticator code in Online / Account' using errcode='42501';
 end if;
end $$;
revoke all on function public.er_require_aal2() from public,anon,authenticated;
do $$ begin
 if to_regprocedure('public.er_join_before_mfa(text,text,boolean)') is null then
  alter function public.er_join(text,text,boolean) rename to er_join_before_mfa;
  alter function public.er_exchange(jsonb,bigint) rename to er_exchange_before_mfa;
  alter function public.er_snapshot() rename to er_snapshot_before_mfa;
  alter function public.er_my_perks() rename to er_my_perks_before_mfa;
 end if;
end $$;
revoke all on function public.er_join_before_mfa(text,text,boolean),public.er_exchange_before_mfa(jsonb,bigint),public.er_snapshot_before_mfa(),public.er_my_perks_before_mfa() from public,anon,authenticated;
create or replace function public.er_join(p_name text,p_code text default 'PUBLIC',p_create boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$ begin perform public.er_require_aal2();return public.er_join_before_mfa(p_name,p_code,p_create)||jsonb_build_object('securityVersion',1);end $$;
create or replace function public.er_exchange(p_pose jsonb,p_seq bigint) returns jsonb
language plpgsql security definer set search_path='' as $$ begin perform public.er_require_aal2();return public.er_exchange_before_mfa(p_pose,p_seq)||jsonb_build_object('securityVersion',1);end $$;
create or replace function public.er_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$ begin perform public.er_require_aal2();return public.er_snapshot_before_mfa()||jsonb_build_object('securityVersion',1);end $$;
create or replace function public.er_my_perks() returns boolean
language plpgsql security definer set search_path='' as $$ begin perform public.er_require_aal2();return public.er_my_perks_before_mfa();end $$;
revoke all on function public.er_join(text,text,boolean),public.er_exchange(jsonb,bigint),public.er_snapshot(),public.er_my_perks() from public,anon,authenticated;
grant execute on function public.er_join(text,text,boolean),public.er_exchange(jsonb,bigint),public.er_snapshot(),public.er_my_perks() to authenticated;
create or replace function public.er_security_version() returns integer language sql set search_path='' as $$ select 1 $$;
revoke all on function public.er_security_version() from public,anon,authenticated;
grant execute on function public.er_security_version() to authenticated;
notify pgrst,'reload schema';
commit;
