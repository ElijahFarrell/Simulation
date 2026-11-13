# Rotation Lab

A browser trainer for Fortnite rotation calls. Each rep is one zone reveal: you pin a rotate, choose when you leave, and decide whether to avoid, tag, or fight. The sim grades storm, contact, exposure, surge, and where the next zone can pull. Solos and trios are both playable.

Numbers in `src/engine/constants.ts` are teaching approximations, not Epic's live rules. This project is not affiliated with Epic Games or Osirion.

## Architecture

The sim is pure TypeScript in `src/engine`. It does not import React or the DOM. Every random draw goes through a seeded RNG, so one seed is one lobby. That is what the lesson scenarios and the engine tests rely on. The canvas UI in `src/components/lab` renders engine state and sends the three calls back in.

`src/app/api` is the server boundary: the public island map, the passcode-gated coach, and the signed-in Fortnite and Epic routes. Convex stores the Clerk user, the Epic link, and replay metadata. It does not store tournament leaderboards.

```bash
npm test
npm run typecheck
```

## Practice and the hub

`/` is the trainer. It does not need an account. Lessons on the start screen open a fixed seed so the same lobby can be retried.

`/stats` is the signed-in hub.

- Clerk is the account. Epic is linked afterwards. It is not a sign-in method.
- A display-name lookup is unverified, because anyone can claim a public name.
- Epic login proves ownership: authorization code, `basic_profile` only. The app stores the Epic account id, display name, and preferred language, and drops the access token when the link finishes.
- Tournament rows come from the [Osirion public API](https://fnapi.osirion.gg/). A session shows the live qual line, a series estimate, pace, and damage ratio.
- A `.replay` file can be stored on the account, up to 120 MB. This build does not parse replays. Placement and damage on the hub come from the leaderboard.

The optional coach sits on the practice screen. It stays off until `COACH_PASSCODE` is set, then every request must send that passcode. Replies come from the Vercel AI Gateway with a web-search tool. Model ids live in `src/lib/coach/reply.ts`.

## Auth boundaries

- `/`, `/api/island`, and `/api/coach` do not require Clerk. The island image route only fetches `https://fortnite-api.com/images/…`. The coach rejects a missing or wrong passcode and a body over 200,000 characters.
- `/stats`, `/api/fortnite/*`, and `/api/epic/*` require a Clerk session. `src/proxy.ts` enforces that, and each handler checks again.
- Convex queries and mutations do not take a caller-supplied user id. They resolve the signed-in Clerk identity.
- The Epic callback stores a random state in an httpOnly, SameSite=Lax cookie and compares it with `timingSafeEqual` before exchanging the code. The token exchange rejects a redirect URI that is not this app's `/api/epic/callback`. Cleartext is only accepted on localhost.
- Replay size is checked in the browser and again from Convex file metadata. A rejected upload is deleted.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

Copy [`.env.example`](.env.example) to `.env.local` and replace the placeholders. Nothing in that file is a real credential.

```bash
npx convex dev            # first run: creates a Convex project and writes NEXT_PUBLIC_CONVEX_URL
npx clerk@latest init     # or copy keys from the Clerk dashboard into .env.local
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
```

In Clerk, add a JWT template named `convex` with `"aud": "convex"` (or turn on the Convex integration).

Epic OAuth needs an approved Epic developer app. Until then, linking is the unverified display-name lookup.

1. In the Epic Developer Portal, create an Epic Account Services client whose only permission is basic profile. Add redirect URL `{origin}/api/epic/callback` (for local dev, `http://localhost:4317/api/epic/callback`).
2. Set `EPIC_CLIENT_ID` in `.env.local`.
3. Set the same `EPIC_CLIENT_ID` and `EPIC_CLIENT_SECRET` on Convex: `npx convex env set EPIC_CLIENT_ID your_epic_client_id` and `npx convex env set EPIC_CLIENT_SECRET your_epic_client_secret`. Set `EPIC_DEPLOYMENT_ID` too if that client's token request requires a deployment.

The Convex deploy key stays in the Convex dashboard or your shell. It is not an app env var and it does not belong in git.

## How a rep works

- The white ring is the storm you are in. The blue ring is the zone you are rotating into.
- Green wedges are dead sides. Red wedges are stacked.
- The dashed circle is every place the zone after next can spawn. Turn it on with **Pull range**.
- **Heat** shows where a hold leaves you a shorter rotate next zone. Greener is shorter.
- Early leaves on the reveal, while the old zone is still safe. Late farms after the storm has started moving.
