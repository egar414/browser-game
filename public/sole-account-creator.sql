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
notify pgrst,'reload schema';
commit;
-- The owner's setup page appends a grant for your signed-in account UUID.

-- Grant only when this project has exactly one Auth account. Never guess by name.
do $$
declare sole_account uuid;
begin
 if (select count(*) from auth.users) <> 1 then
  raise exception 'Expected exactly one game account. Use COPY MY CREATOR SETUP in the game instead.';
 end if;
 select id into sole_account from auth.users;
 insert into public.er_creators(user_id) values (sole_account) on conflict(user_id) do nothing;
end $$;

select 'Creator enabled — return to the game and click REFRESH ACCOUNT' as status, user_id as account_id from public.er_creators;
