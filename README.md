# Rotation Lab

A browser trainer for Fortnite trios IGL calls. Each rep is one zone reveal: you pin a rotate, choose when you leave, and decide whether to avoid, tag, or fight. The sim grades storm, contact, exposure, surge, and where the next zone can pull.

Numbers in `src/engine/constants.ts` are teaching approximations, not Epic's live rules.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

```bash
npm test
npm run typecheck
```

## Hub (accounts)

`/stats` is the signed-in hub. It looks up an Epic display name, shows a tournament session (live qual line, series estimate, pace, damage ratio), and stores `.replay` uploads. Clerk handles sign-in. Convex stores the account link and the replay files. Rotation practice at `/` does not need either.

Tournament rows come from the [Osirion public API](https://fnapi.osirion.gg/). That feed includes placement, elims, and damage for scored games. This app does not parse `.replay` files, and it is not affiliated with Epic or Osirion. Epic sign-in still needs an approved Epic developer app; until then, linking is a display-name lookup.

Local setup:

```bash
npx convex dev            # first run: creates a Convex project and writes NEXT_PUBLIC_CONVEX_URL to .env.local
npx clerk@latest init     # or copy keys from the Clerk dashboard into .env.local
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
```

In Clerk, add a JWT template named `convex` with `"aud": "convex"` (or turn on the Convex integration).

Epic is not a sign-in method. Clerk is the account, and Epic is linked afterwards, which is how Osirion does it: authorization code, `basic_profile` only. The app stores the Epic account id, display name, and preferred language, and drops the access token when the link finishes.

1. In the Epic Developer Portal, create an Epic Account Services client whose only permission is basic profile. Add redirect URL `{origin}/api/epic/callback` (for local dev, `http://localhost:4317/api/epic/callback`).
2. Set `EPIC_CLIENT_ID` in the Next.js environment.
3. Set the same `EPIC_CLIENT_ID` and `EPIC_CLIENT_SECRET` in Convex: `npx convex env set EPIC_CLIENT_ID ...` and `npx convex env set EPIC_CLIENT_SECRET ...`. Set `EPIC_DEPLOYMENT_ID` too if that client's token request requires a deployment.

## How a rep works

- The white ring is the storm you are in. The blue ring is the zone you are rotating into.
- Green wedges are dead sides. Red wedges are stacked.
- The dashed circle is every place the zone after next can spawn. Turn it on with **Pull range**.
- **Heat** shows where a hold leaves you a shorter rotate next zone. Greener is shorter.
- Early leaves on the reveal, while the old zone is still safe. Late farms after the storm has started moving.

Lessons on the start screen open a fixed seed so you can retry the same lobby.
