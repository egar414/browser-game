-- Optional creator badges. Run after 001_multiplayer.sql as the project owner.
-- Accounts cannot grant this role to themselves through the game's public API.
begin;
create table if not exists public.er_creators (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.er_creators enable row level security;
revoke all on public.er_creators from anon,authenticated;

create or replace function public.er_my_perks() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.er_creators where user_id=auth.uid())
$$;
revoke all on function public.er_my_perks() from public,anon,authenticated;
grant execute on function public.er_my_perks() to authenticated;

create or replace function public.er_snapshot() returns jsonb
 language plpgsql security definer set search_path='' as $$
declare rid uuid; result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select p.room_id into rid from public.er_players p join public.er_rooms r on r.id=p.room_id
 where p.user_id=auth.uid() and p.seen_at>now()-interval '45 seconds' and r.expires_at>now();
 if rid is null then raise exception 'Room expired. Join again.'; end if;
 select jsonb_build_object('id',r.id,'code',r.code,'public',r.is_public,'capacity',8,
 'creator',public.er_my_perks(),
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name,'seq',p.seq,'pose',p.pose,
 'creator',exists(select 1 from public.er_creators c where c.user_id=p.user_id)))
 from public.er_players p where p.room_id=rid and p.seen_at>now()-interval '45 seconds'),'[]'::jsonb))
 into result from public.er_rooms r where r.id=rid;
 return result;
end $$;
revoke all on function public.er_snapshot() from public,anon,authenticated;
grant execute on function public.er_snapshot() to authenticated;
-- Enforce the private development craft even when an older client sends it.
create or replace function public.er_check_creator_craft() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if new.pose->>'type'='hyper' and not exists(select 1 from public.er_creators c where c.user_id=new.user_id) then
  raise exception 'Apex 300 is a Creator-only development craft';
 end if;
 return new;
end $$;
revoke all on function public.er_check_creator_craft() from public,anon,authenticated;
-- Retire old unauthorised Apex snapshots before enabling the guard.
update public.er_players p set pose=jsonb_set(p.pose,'{type}','"ski"'::jsonb)
 where p.pose->>'type'='hyper' and not exists(select 1 from public.er_creators c where c.user_id=p.user_id);
drop trigger if exists er_creator_craft on public.er_players;
create trigger er_creator_craft before insert or update of pose,user_id on public.er_players
 for each row execute function public.er_check_creator_craft();

notify pgrst,'reload schema';
commit;
-- The owner's setup page appends a grant for your signed-in account UUID.
