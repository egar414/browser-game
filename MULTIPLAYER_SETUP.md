# Activate the prepared multiplayer build

The current public single-player update is live at:
https://egar414.github.io/browser-game/?v=2c9e648

The multiplayer code is prepared separately. **It is not connected to a live
backend yet.** GitHub Pages serves static game files; it cannot host the account
database or live room connections. No Supabase project/account is connected to
this workspace, and the available integration cannot create one for the owner.

## Owner setup

1. Create a project at https://supabase.com/dashboard (a free plan is available;
   its current quotas apply). Choose a region near your players.
2. In the project's SQL Editor, run all of
   [001_boating_worlds.sql](supabase/migrations/001_boating_worlds.sql).
   It creates display-name profiles, private rooms/memberships, invite-attempt
   limits, server time and private Realtime channel policies. No password table
   is created: Supabase Auth handles credentials.
3. In Authentication → URL Configuration, set the Site URL and allowed redirect
   URL to `https://egar414.github.io/browser-game/`. Add the actual new address
   if the repository is renamed. For local testing, also allow
   `http://localhost:5173/`.
4. Enable email/password authentication and set the server password minimum to
   10 characters. Keep email confirmations enabled for
   verified accounts. Configure production email delivery (SMTP) for public
   confirmation and password-reset emails; Supabase's built-in test sender has
   recipient/rate restrictions. See https://supabase.com/docs/guides/auth/auth-smtp .
   Email delivery has not been configured or tested by this workspace.
5. Find the **Project URL** and **publishable key** under the project's connection
   / API settings. Share these two public values so this prepared game can be
   connected and tested against the actual service. Never provide a secret or
   service-role key; the build and client refuse those keys.

For local running, copy `.env.example` to `.env.local`, fill its two public
values, run `npm ci` then `npm run dev`. Missing values leave single-player
available. Real accounts are stored in the owner's chosen Supabase project;
passwords are not stored in game files, source control, movement messages or
local game preferences. Supabase's browser SDK retains its login session on
that browser so the player can remain signed in.

For GitHub Pages, set repository Actions variables `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` before publishing the multiplayer branch. These are
public client configuration, not privileged service credentials. The workflow
reads them at build time. Re-run deployment after changing either value.

## Implemented behavior

Signed-in players who press Play join one shared `public` estuary for this
project. The public world is the same for everyone; private rooms have separate
presence and movement channels. A creator receives a random 12-character invite
code, displayed in three groups. Codes expire after 24 hours. There are at most
three active rooms per owner and limited create/join attempts. Members can
return to the public world, sign out or play single-player.

Each rider can publish only on their own authenticated movement channel.
Display names are separate from email addresses. Other players receive poses,
craft/colour/design and spray inputs, not account credentials. Remote boats use
buffered interpolation; the nearest 4 / 8 / 12 boats render on Low / Medium /
High. Presence/movement is bounded to 48 remote peers per client. This is a
small social free-roam implementation, not a server-authoritative MMO. Terrain
physics stays local; player-to-player collision, authoritative shared races,
shared garage progression and player PvP flooding are not implemented.

Online weather uses shared server-adjusted time and the same hourly sea state.
GPU phase uniforms are wrapped before upload to preserve precision at real
clock times. Movement sends at most eight updates per second while changing,
with sparse idle heartbeats; a rider alone sends no movement. Leaving the garage
reconnects; going home or hiding the tab disconnects world channels. Authentication
may still perform its normal session refresh. No analytics or advertising is added.

## Validation and remaining activation checks

`npm test` includes real PostgreSQL (PGlite) row-security checks, random-code /
rate / membership checks, and two-client session/transport tests. Chromium
exercises account UI and remote craft with a test service double. The game
contains no production test-account or teleport hooks.

Before calling multiplayer live, connect the real project and verify actual
email signup/confirmation/reset, two independent browser sessions in public,
private code join, outsider refusal, reconnect and remote-boat movement over
Supabase Realtime. Local test doubles do not establish the provider's deployed
configuration, email delivery, internet latency or free-plan capacity. Physical
phones and large player counts remain untested. Hosting-provider quotas and
possible inactivity pauses apply; no paid service has been purchased.
