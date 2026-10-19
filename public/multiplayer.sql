-- Estuary Rats v1. Run the entire file in your project's Supabase SQL Editor.
-- Adds only er_* objects. Never paste a service-role key into the game.
begin;
create table if not exists public.er_rooms (
 id uuid primary key default gen_random_uuid(),
 code text unique not null,
 owner_id uuid references auth.users(id) on delete cascade,
 is_public boolean not null default false,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours')
);
create table if not exists public.er_players (
 user_id uuid primary key references auth.users(id) on delete cascade,
 room_id uuid not null references public.er_rooms(id) on delete cascade,
 name text not null check(length(name) between 1 and 20),
 seen_at timestamptz not null default now(),
 pose_at timestamptz,
 seq bigint not null default -1,
 pose jsonb
);
create index if not exists er_players_room on public.er_players(room_id);
create table if not exists public.er_join_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 started_at timestamptz not null default now(),
 attempts integer not null default 0
);
insert into public.er_rooms(id,code,is_public,expires_at)
 values('00000000-0000-4000-8000-000000000001','PUBLIC',true,'infinity')
 on conflict(id) do nothing;
alter table public.er_rooms enable row level security;
alter table public.er_players enable row level security;
alter table public.er_join_limits enable row level security;
revoke all on public.er_rooms,public.er_players,public.er_join_limits from anon,authenticated;

create or replace function public.er_backend_version() returns integer
 language sql stable set search_path='' as $$ select 1 $$;

-- A signed-in player sees only their room, never other rooms or account emails.
create or replace function public.er_snapshot() returns jsonb
 language plpgsql security definer set search_path='' as $$
declare rid uuid; result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select p.room_id into rid from public.er_players p join public.er_rooms r on r.id=p.room_id
 where p.user_id=auth.uid() and p.seen_at>now()-interval '45 seconds' and r.expires_at>now();
 if rid is null then raise exception 'Room expired. Join again.'; end if;
 select jsonb_build_object('id',r.id,'code',r.code,'public',r.is_public,'capacity',8,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name,'seq',p.seq,'pose',p.pose))
 from public.er_players p where p.room_id=rid and p.seen_at>now()-interval '45 seconds'),'[]'::jsonb))
 into result from public.er_rooms r where r.id=rid;
 return result;
end $$;

create or replace function public.er_join(p_name text,p_code text default 'PUBLIC',p_create boolean default false) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid; clean_name text; room_code text; attempts integer;
begin
 if uid is null then raise exception 'Sign in first'; end if;
 clean_name:=left(regexp_replace(trim(p_name),'[^a-zA-Z0-9 _-]','','g'),20);
 if coalesce(length(clean_name),0)<1 then raise exception 'Choose a player name (letters and numbers)'; end if;
 -- Serialize joins, including concurrent room creation and same-account joins.
 perform pg_advisory_xact_lock(735819024);
 insert into public.er_join_limits(user_id,attempts) values(uid,1)
 on conflict(user_id) do update set attempts=case when er_join_limits.started_at<now()-interval '1 minute' then 1 else er_join_limits.attempts+1 end,
 started_at=case when er_join_limits.started_at<now()-interval '1 minute' then now() else er_join_limits.started_at end
 returning er_join_limits.attempts into attempts;
 if attempts>20 then return jsonb_build_object('error','Too many joins. Wait a minute.'); end if;
 delete from public.er_rooms where not is_public and expires_at<now();
 delete from public.er_players where seen_at<now()-interval '45 seconds';
 if p_create then
  if (select count(*) from public.er_rooms where owner_id=uid)>=3 then raise exception 'You already have three private rooms. They expire after 24 hours.'; end if;
  loop
   room_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
   begin
    insert into public.er_rooms(code,owner_id) values(room_code,uid) returning id into rid;
    exit;
   exception when unique_violation then null;
   end;
  end loop;
 else
  room_code:=upper(trim(p_code));
  select id into rid from public.er_rooms where code=room_code and expires_at>now();
  if rid is null then return jsonb_build_object('error','Room code not found or expired'); end if;
 end if;
 if (select count(*) from public.er_players where room_id=rid and user_id<>uid)>=8 then return jsonb_build_object('error','Room full (8 players). Try a private room.'); end if;
 insert into public.er_players(user_id,room_id,name) values(uid,rid,clean_name)
 on conflict(user_id) do update set room_id=excluded.room_id,name=excluded.name,seen_at=now(),pose=null,pose_at=null,seq=-1;
 return public.er_snapshot();
end $$;

-- The server supplies the user id and room. A client cannot move another user.
-- Movement is client-simulated; this is not authoritative competitive physics.
create or replace function public.er_exchange(p_pose jsonb,p_seq bigint) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); previous public.er_players; key text; value numeric; clean jsonb:='{}'::jsonb;
begin
 if uid is null then raise exception 'Sign in first'; end if;
 select * into previous from public.er_players where user_id=uid for update;
 if not found or previous.seen_at<now()-interval '45 seconds' then raise exception 'Room expired. Join again.'; end if;
 if previous.pose_at>clock_timestamp()-interval '150 milliseconds' then return public.er_snapshot(); end if;
 if p_pose is null or jsonb_typeof(p_pose)<>'object' or octet_length(p_pose::text)>2048 then raise exception 'Invalid craft state'; end if;
 if p_seq is null or p_seq<0 or p_seq>9007199254740991 or p_seq<=previous.seq then return public.er_snapshot(); end if;
 if coalesce(p_pose->>'type','') not in ('ski','cat','tinny','cruiser','seago','racer','hyper') then raise exception 'Invalid craft'; end if;
 foreach key in array array['x','y','z','heading','pitch','roll','vx','vz','speed','steer','throttle','trim','rpm','riderAft','planing','passengerAft','trimAngle','steeringAngle','deckX','deckZ','deckHeading'] loop
  if jsonb_typeof(p_pose->key) is distinct from 'number' then raise exception 'Missing craft number: %',key; end if;
  value:=(p_pose->>key)::numeric;
  if abs(value)>100000 then raise exception 'Invalid craft number'; end if;
  clean:=clean||jsonb_build_object(key,value);
 end loop;
 if (clean->>'x')::numeric not between -2600 and 9600 or (clean->>'z')::numeric not between -4700 and 3900
 or (clean->>'y')::numeric not between -20 and 60 or abs((clean->>'vx')::numeric)>160 or abs((clean->>'vz')::numeric)>160
 or (clean->>'speed')::numeric not between 0 and 160 or abs((clean->>'pitch')::numeric)>25 or abs((clean->>'roll')::numeric)>25
 or abs((clean->>'steer')::numeric)>1 or abs((clean->>'throttle')::numeric)>1
 or (clean->>'trim')::numeric not between -20 and 40 or (clean->>'rpm')::numeric not between 0 and 15000
 or abs((clean->>'deckX')::numeric)>2 or abs((clean->>'deckZ')::numeric)>8 then raise exception 'Craft outside limits'; end if;
 clean:=clean||jsonb_build_object('type',p_pose->>'type','colour',case when p_pose->>'colour' in ('0','1','2') then (p_pose->>'colour')::int else 0 end,
 'design',case when p_pose->>'design' in ('classic','race','heritage') then p_pose->>'design' else 'classic' end,
 'pose',case when p_pose->>'pose' in ('hangman','nohander','superman','heartattack') then p_pose->>'pose' else null end,
 'active',p_pose->'active'='true'::jsonb,'airborne',p_pose->'airborne'='true'::jsonb,'deck',p_pose->'deck'='true'::jsonb);
 update public.er_players set pose=clean,seq=p_seq,seen_at=now(),pose_at=clock_timestamp() where user_id=uid;
 return public.er_snapshot();
end $$;

create or replace function public.er_leave() returns void
 language sql security definer set search_path='' as $$ delete from public.er_players where user_id=auth.uid() $$;

revoke all on function public.er_backend_version(),public.er_snapshot(),public.er_join(text,text,boolean),public.er_exchange(jsonb,bigint),public.er_leave() from public,anon,authenticated;
grant execute on function public.er_backend_version() to anon,authenticated;
grant execute on function public.er_snapshot(),public.er_join(text,text,boolean),public.er_exchange(jsonb,bigint),public.er_leave() to authenticated;
notify pgrst,'reload schema';
commit;

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

-- Automatic spray flooding in every room. No consent prompt or damage RPC.
-- Run after 001 and 002. Existing accounts and Creator grants are preserved.
begin;
alter table public.er_players add column if not exists water double precision not null default 0;
alter table public.er_players add column if not exists sinking_until timestamptz;
alter table public.er_players add column if not exists shield_until timestamptz not null default clock_timestamp()+interval '8 seconds';
alter table public.er_players add column if not exists flood_at timestamptz not null default clock_timestamp();
create table if not exists public.er_spray_packets(
 id bigint generated always as identity primary key,
 emitter uuid not null references public.er_players(user_id) on delete cascade,
 room_id uuid not null references public.er_rooms(id) on delete cascade,
 born timestamptz not null default clock_timestamp(),checked timestamptz not null default clock_timestamp(),
 x double precision,y double precision,z double precision,vx double precision,vy double precision,vz double precision,power double precision
);
create index if not exists er_spray_room on public.er_spray_packets(room_id);
alter table public.er_spray_packets enable row level security;
revoke all on public.er_spray_packets from public,anon,authenticated;
-- Preserve the existing strict pose/Creator validator, including on reruns.
do $$ begin
 if to_regprocedure('public.er_exchange_base(jsonb,bigint)') is null then
  alter function public.er_exchange(jsonb,bigint) rename to er_exchange_base;
 end if;
end $$;
revoke all on function public.er_exchange_base(jsonb,bigint) from public,anon,authenticated;

create or replace function public.er_combat(p public.er_players) returns jsonb
 language sql stable set search_path='' as $$
 select jsonb_build_object('water',p.water,'sinking',greatest(0,extract(epoch from p.sinking_until-clock_timestamp())),
 'shield',greatest(0,extract(epoch from p.shield_until-clock_timestamp())))
$$;
revoke all on function public.er_combat(public.er_players) from public,anon,authenticated;

create or replace function public.er_snapshot() returns jsonb
 language plpgsql security definer set search_path='' as $$
declare rid uuid; result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select p.room_id into rid from public.er_players p join public.er_rooms r on r.id=p.room_id
 where p.user_id=auth.uid() and p.seen_at>now()-interval '45 seconds' and r.expires_at>now();
 if rid is null then raise exception 'Room expired. Join again.'; end if;
 select jsonb_build_object('id',r.id,'code',r.code,'public',r.is_public,'capacity',8,'combatVersion',1,
 'combat',(select public.er_combat(p) from public.er_players p where p.user_id=auth.uid()),'creator',public.er_my_perks(),
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name,'seq',p.seq,'pose',p.pose,'combat',public.er_combat(p),
 'creator',exists(select 1 from public.er_creators c where c.user_id=p.user_id)))
 from public.er_players p where p.room_id=rid and p.seen_at>now()-interval '45 seconds'),'[]'::jsonb))
 into result from public.er_rooms r where r.id=rid;
 return result;
end $$;

create or replace function public.er_exchange(p_pose jsonb,p_seq bigint) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid; old_seq bigint; me public.er_players; s jsonb; clean_sources jsonb:='[]'; k text; n numeric;
 stamp timestamptz:=clock_timestamp(); q public.er_spray_packets; target public.er_players;
 age double precision; prev_age double precision; travel double precision; prev_y double precision;
 px double precision; py double precision; pz double precision; deck double precision; dx double precision; dz double precision; h double precision;
 half_width double precision; half_length double precision; along double precision; across double precision; amount double precision;
begin
 if uid is null then raise exception 'Sign in first'; end if;
 select room_id,seq into rid,old_seq from public.er_players where user_id=uid;
 if rid is null then raise exception 'Room expired. Join again.'; end if;
 -- Acquire the room lock BEFORE base pose locks. Busy peers retry next tick.
 if not pg_try_advisory_xact_lock(hashtext(rid::text)::bigint) then return public.er_snapshot(); end if;
 perform public.er_exchange_base(p_pose,p_seq);
 select * into me from public.er_players where user_id=uid;
 if me.seq=old_seq then return public.er_snapshot(); end if;
 if p_pose ? 'spray' then
  if jsonb_typeof(p_pose->'spray')<>'array' or jsonb_array_length(p_pose->'spray')>3 then raise exception 'Invalid spray sources'; end if;
  for s in select value from jsonb_array_elements(p_pose->'spray') loop
   if coalesce(s->>'kind','') not in ('rear','left','right') or exists(select 1 from jsonb_array_elements(clean_sources) v where v->>'kind'=s->>'kind') then raise exception 'Invalid spray kind'; end if;
   foreach k in array array['ox','oy','oz','vx','vy','vz','power'] loop
    if jsonb_typeof(s->k) is distinct from 'number' then raise exception 'Invalid spray number'; end if;
    n:=(s->>k)::numeric;
    if abs(n)>200 or (k in ('ox','oy','oz') and abs(n)>12) or (k='vy' and n not between 0 and 35) or (k='power' and n not between 0 and 2) then raise exception 'Spray outside limits'; end if;
   end loop;
   -- Only retain canonical fields. Never accept a claimed victim or damage.
   s:=jsonb_build_object('kind',s->'kind','ox',s->'ox','oy',s->'oy','oz',s->'oz','vx',s->'vx','vy',s->'vy','vz',s->'vz','power',s->'power');
   if me.pose->'active'='true'::jsonb and me.pose->'airborne'='false'::jsonb and (me.pose->>'throttle')::numeric>.08 and (me.sinking_until is null or me.sinking_until<=stamp) then
    clean_sources:=clean_sources||jsonb_build_array(s);
   end if;
  end loop;
 end if;
 update public.er_players set pose=pose||jsonb_build_object('spray',clean_sources) where user_id=uid;
 -- Drain slowly, then relaunch after six seconds. Recovery shield is automatic.
 update public.er_players set water=case when sinking_until<=stamp then 0 when sinking_until>stamp then water else greatest(0,water-least(.5,greatest(0,extract(epoch from stamp-flood_at)))) end,
 sinking_until=case when sinking_until<=stamp then null else sinking_until end,flood_at=stamp where room_id=rid;
 delete from public.er_spray_packets where born<stamp-interval '5 seconds';
 -- Water follows the same .32/s drag and gravity as the visible rear plume.
 for q in select * from public.er_spray_packets where room_id=rid order by id loop
  age:=extract(epoch from stamp-q.born);prev_age:=greatest(0,extract(epoch from q.checked-q.born));
  travel:=(1-exp(-.32*age))/.32;
  px:=q.x+q.vx*travel;py:=q.y+(q.vy+9.81/.32)*travel-9.81*age/.32;pz:=q.z+q.vz*travel;
  prev_y:=q.y+(q.vy+9.81/.32)*(1-exp(-.32*prev_age))/.32-9.81*prev_age/.32;
  if (q.vy+9.81/.32)*exp(-.32*age)-9.81/.32<0 then
   for target in select * from public.er_players where room_id=rid and user_id<>q.emitter and pose->'active'='true'::jsonb and seen_at>stamp-interval '3 seconds' and shield_until<=stamp and sinking_until is null loop
    deck:=(target.pose->>'y')::float8+case when target.pose->>'type'='cruiser' then 1.02 else .35 end;
    if prev_y<deck or py>deck then continue; end if;
    -- Swept descending deck crossing, not an infinite proximity damage aura.
    travel:=(1-exp(-.32*(prev_age+(age-prev_age)*(prev_y-deck)/greatest(.0001,prev_y-py))))/.32;
    dx:=q.x+q.vx*travel-(target.pose->>'x')::float8;dz:=q.z+q.vz*travel-(target.pose->>'z')::float8;h:=(target.pose->>'heading')::float8;
    across:=dx*cos(h)-dz*sin(h);along:=dx*sin(h)+dz*cos(h);
    half_width:=case target.pose->>'type' when 'cruiser' then 2.3 when 'racer' then 2.6 when 'cat' then 1 else .7 end;
    half_length:=case target.pose->>'type' when 'cruiser' then 6.5 when 'racer' then 6.5 when 'cat' then 2 else 1.6 end;
    -- Large sportfishers receive water in the open aft cockpit, not the roof.
    if abs(across)<half_width+.5 and abs(along)<half_length+.5 and (target.pose->>'type'<>'cruiser' or along< -1.2) then
     amount:=least(8,greatest(0,q.power)*4);
     update public.er_players set water=least(100,water+amount),sinking_until=case when water+amount>=100 then stamp+interval '6 seconds' else null end,
     shield_until=case when water+amount>=100 then stamp+interval '14 seconds' else shield_until end where user_id=target.user_id;
     delete from public.er_spray_packets where id=q.id;exit;
    end if;
   end loop;
  end if;
  update public.er_spray_packets set checked=stamp where id=q.id;
  if py< -5 then delete from public.er_spray_packets where id=q.id;end if;
 end loop;
 if (select count(*) from public.er_spray_packets where room_id=rid)<360 then
  insert into public.er_spray_packets(emitter,room_id,x,y,z,vx,vy,vz,power)
  select uid,rid,(me.pose->>'x')::float8+(v->>'ox')::float8,(me.pose->>'y')::float8+(v->>'oy')::float8,(me.pose->>'z')::float8+(v->>'oz')::float8,
  (v->>'vx')::float8,(v->>'vy')::float8,(v->>'vz')::float8,(v->>'power')::float8 from jsonb_array_elements(clean_sources) v;
 end if;
 return public.er_snapshot();
end $$;
revoke all on function public.er_exchange(jsonb,bigint),public.er_snapshot() from public,anon,authenticated;
grant execute on function public.er_exchange(jsonb,bigint),public.er_snapshot() to authenticated;
notify pgrst,'reload schema';
commit;
