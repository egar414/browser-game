-- Adds the two photo-inspired 50 hp tinnies to existing online worlds.
begin;
do $$ begin
 if to_regprocedure('public.er_exchange_before_fleet(jsonb,bigint)') is null then
  alter function public.er_exchange_base(jsonb,bigint) rename to er_exchange_before_fleet;
 end if;
 if to_regprocedure('public.er_snapshot_before_fleet()') is null then
  alter function public.er_snapshot() rename to er_snapshot_before_fleet;
 end if;
end $$;
revoke all on function public.er_exchange_before_fleet(jsonb,bigint),public.er_snapshot_before_fleet() from public,anon,authenticated;
create or replace function public.er_exchange_base(p_pose jsonb,p_seq bigint) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare requested text:=p_pose->>'type'; result jsonb;
begin
 if requested in ('dinghy','skua') then
  result:=public.er_exchange_before_fleet(jsonb_set(p_pose,'{type}','"tinny"'::jsonb),p_seq);
  update public.er_players set pose=jsonb_set(pose,'{type}',to_jsonb(requested)) where user_id=auth.uid() and seq=p_seq;
  return public.er_snapshot();
 end if;
 return public.er_exchange_before_fleet(p_pose,p_seq);
end $$;
revoke all on function public.er_exchange_base(jsonb,bigint) from public,anon,authenticated;
create or replace function public.er_snapshot() returns jsonb
 language sql security definer set search_path='' as $$
 select public.er_snapshot_before_fleet()||jsonb_build_object('craftVersion',2)
$$;
revoke all on function public.er_snapshot() from public,anon,authenticated;
grant execute on function public.er_snapshot() to authenticated;
notify pgrst,'reload schema';
commit;
