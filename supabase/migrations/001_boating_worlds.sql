-- Managed Supabase Auth owns email/password credentials. No password table here.
create table if not exists public.pilots (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (char_length(nickname) between 2 and 20 and nickname !~ '[<>[:cntrl:]]'),
 created_at timestamptz not null default now()
);
create table if not exists public.boating_rooms (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 invite_code text not null unique check (invite_code ~ '^[A-F0-9]{12}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '24 hours'
);
create table if not exists public.boating_members (
 room_id uuid not null references public.boating_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(room_id,user_id)
);
create index if not exists boating_members_user on public.boating_members(user_id);
create table if not exists public.boating_rate_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null,
 window_start timestamptz not null,
 attempts int not null,
 primary key(user_id,action)
);
alter table public.pilots enable row level security;
alter table public.boating_rooms enable row level security;
alter table public.boating_members enable row level security;
alter table public.boating_rate_limits enable row level security;
revoke all on public.pilots,public.boating_rooms,public.boating_members,public.boating_rate_limits from anon,authenticated;
grant select on public.pilots,public.boating_rooms,public.boating_members to authenticated;

create or replace function public.boating_access(world text) returns boolean
 language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (world='public' or exists(
  select 1 from public.boating_rooms r join public.boating_members m on m.room_id=r.id
  where r.id::text=world and m.user_id=auth.uid() and r.expires_at>now()
 ));
$$;
create or replace function public.boating_rate(action_name text,maximum int) returns boolean
 language plpgsql security definer set search_path='' as $$
 declare n int;
 begin
  if auth.uid() is null then return false;end if;
  insert into public.boating_rate_limits(user_id,action,window_start,attempts)
  values(auth.uid(),action_name,now(),1)
  on conflict(user_id,action) do update set
   attempts=case when boating_rate_limits.window_start<now()-interval '1 minute' then 1 else boating_rate_limits.attempts+1 end,
   window_start=case when boating_rate_limits.window_start<now()-interval '1 minute' then now() else boating_rate_limits.window_start end
  returning attempts into n;
  return n<=maximum;
 end;
$$;
create or replace function public.ensure_pilot(display_name text default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare pilot public.pilots;clean text;
 begin
  if auth.uid() is null then raise exception 'Sign in first';end if;
  clean:=nullif(btrim(display_name),'');
  if clean is not null and (char_length(clean)<2 or char_length(clean)>20 or clean ~ '[<>[:cntrl:]]') then raise exception 'Use a display name of 2 to 20 characters';end if;
  insert into public.pilots(id,nickname) values(auth.uid(),coalesce(clean,'Skipper '||substr(auth.uid()::text,1,4)))
  on conflict(id) do update set nickname=coalesce(clean,pilots.nickname) returning * into pilot;
  return to_jsonb(pilot);
 end;
$$;
create or replace function public.create_boating_room() returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare room public.boating_rooms;
 begin
  if auth.uid() is null then return jsonb_build_object('error','Sign in first.');end if;
  if not public.boating_rate('create',5) then return jsonb_build_object('error','Please wait a minute before creating another room.');end if;
  -- Lock one owner so concurrent requests cannot exceed the room limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  delete from public.boating_rooms where owner_id=auth.uid() and expires_at<now();
  if (select count(*) from public.boating_rooms where owner_id=auth.uid())>=3 then return jsonb_build_object('error','You already have three active rooms. Use an existing code.');end if;
  insert into public.boating_rooms(owner_id,invite_code) values(auth.uid(),upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))) returning * into room;
  insert into public.boating_members(room_id,user_id) values(room.id,auth.uid());
  return jsonb_build_object('id',room.id,'code',room.invite_code,'expiresAt',room.expires_at);
 end;
$$;
create or replace function public.join_boating_room(invite text) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare room public.boating_rooms;clean text;
 begin
  if auth.uid() is null then return jsonb_build_object('error','Sign in first.');end if;
  -- Return errors instead of raising, so failed-code attempts still commit the limit.
  if not public.boating_rate('join',12) then return jsonb_build_object('error','Too many code attempts. Try again in a minute.');end if;
  clean:=replace(replace(upper(btrim(invite)),'-',''),' ','');
  if clean !~ '^[A-F0-9]{12}$' then return jsonb_build_object('error','That invite code is invalid or expired.');end if;
  select * into room from public.boating_rooms where invite_code=clean and expires_at>now();
  if not found then return jsonb_build_object('error','That invite code is invalid or expired.');end if;
  insert into public.boating_members(room_id,user_id) values(room.id,auth.uid()) on conflict do nothing;
  return jsonb_build_object('id',room.id,'code',room.invite_code,'expiresAt',room.expires_at);
 end;
$$;
create or replace function public.leave_boating_room(room_id_text text) returns void
 language sql security definer set search_path='' as $$
 delete from public.boating_members where user_id=auth.uid() and room_id::text=room_id_text;
$$;
-- Public Auth sessions may read display names; emails remain in the Auth service.
drop policy if exists pilots_read on public.pilots;
create policy pilots_read on public.pilots for select to authenticated using (true);
drop policy if exists rooms_read on public.boating_rooms;
create policy rooms_read on public.boating_rooms for select to authenticated using (public.boating_access(id::text));
drop policy if exists members_read on public.boating_members;
create policy members_read on public.boating_members for select to authenticated using (user_id=(select auth.uid()));

-- Lobby presence is shared by room members. Each rider writes only to their own
-- pilot channel, preventing another member from impersonating their pose stream.
-- realtime.messages is supplied by Supabase Realtime; keep private channels on.
drop policy if exists estuary_receive on realtime.messages;
create policy estuary_receive on realtime.messages for select to authenticated using (
 split_part(realtime.topic(),':',1)='estuary' and split_part(realtime.topic(),':',2) in ('world','pilot')
 and public.boating_access(split_part(realtime.topic(),':',3)) and extension in ('broadcast','presence')
);
drop policy if exists estuary_send on realtime.messages;
create policy estuary_send on realtime.messages for insert to authenticated with check (
 split_part(realtime.topic(),':',1)='estuary' and public.boating_access(split_part(realtime.topic(),':',3)) and (
  (split_part(realtime.topic(),':',2)='world' and extension='presence') or
  (split_part(realtime.topic(),':',2)='pilot' and extension='broadcast' and split_part(realtime.topic(),':',4)=(select auth.uid())::text)
 )
);
revoke all on function public.boating_access(text),public.boating_rate(text,int),public.ensure_pilot(text),public.create_boating_room(),public.join_boating_room(text),public.leave_boating_room(text) from public,anon,authenticated;
grant execute on function public.boating_access(text),public.ensure_pilot(text),public.create_boating_room(),public.join_boating_room(text),public.leave_boating_room(text) to authenticated;
create or replace function public.boating_clock() returns double precision language sql stable set search_path='' as $$select extract(epoch from now())::double precision$$;
revoke all on function public.boating_clock() from public,anon;
grant execute on function public.boating_clock() to authenticated;
notify pgrst, 'reload schema';
