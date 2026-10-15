# Multiplayer implementation validation

16 October 2026. This prepared branch is not enabled on the public game yet.
The published single-player release is `2c9e648`.

- 66 Node tests pass: the existing 59 boating checks plus seven online/schema
  checks. Real PostgreSQL via PGlite executes the actual migration and verifies
  private-room visibility, code joins, bounded attempts, expired rooms, owner
  room limits, anonymous refusal and per-rider movement write policies.
- Session tests use a test service double with two clients to check shared-world
  presence, movement, private separation/join/public return, sign-out, channel
  reconnect, background disconnect, idle traffic limits, packet validation,
  ordered movement, public-key guards and unavailable-hosting behavior. A build with a dummy
  secret key was correctly refused before assets could be generated.
- Chromium checks exercise signup/sign-in forms, useful invalid-login feedback,
  private code display/join/separation and shared remote rendering using the
  test service. A full-game test verifies two riders, keyboard driving, shared
  hourly seas, private/public switching, hidden-tab disconnect/reconnection and
  restoration of offline sea preferences on sign-out. The development module
  interception is confined to the test; the shipped game has no test hooks.
- The separate actual-game fallback check verifies launch, account-panel layout,
  Escape/return-to-game and pause when no backend is configured.
- GPU/CPU water readback includes real epoch times and all prior shore samples.
  Wrapped phase uniforms keep the maximum checked height error below
  0.000183 m. Network clocks use a server-time RPC and round-trip midpoint
  estimate; real internet latency/jitter has not been measured.
- The production build passes. Node 24 / Chromium 154 / Linux / SwiftShader is
  the test environment. Browser screenshots of two clients and the complete
  game were visually inspected; no hardware frame-rate claim is made.

The test double does not prove a real Supabase project is configured correctly.
External signup/confirmation/password-reset delivery, deployed Realtime
policies/permissions, independent internet clients and hosting quota behavior
remain to be checked after the owner supplies a project URL/public key and
runs the migration. No external authentication service or SMTP was created,
no real user email/password was collected, and no paid resource was purchased.

The implementation is social free roam with local craft physics. Shared race
adjudication, server-authoritative movement, inter-player collision, shared
progression and player PvP flooding are outside this prepared version. The
renderer caps detailed visible boats by quality and processes up to 48 remote
peers per client. Physical mobile devices and large player counts are untested.
