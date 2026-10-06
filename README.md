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

## My stats (accounts)

`/stats` is a separate signed-in area for real-match stats from uploaded replays. It uses Clerk for sign-in and Convex for data and replay file storage. Rotation Lab at `/` does not need either.

Local setup:

```bash
npx convex dev            # first run: creates a Convex project and writes NEXT_PUBLIC_CONVEX_URL to .env.local
npx clerk@latest init     # or copy keys from the Clerk dashboard into .env.local
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
```

In Clerk, add a JWT template named `convex` with `"aud": "convex"` (or turn on the Convex integration). Sign in with Epic is a custom OIDC provider in Clerk using `https://api.epicgames.dev/epic/oauth/v2/.well-known/openid-configuration`.

## How a rep works

- The white ring is the storm you are in. The blue ring is the zone you are rotating into.
- Green wedges are dead sides. Red wedges are stacked.
- The dashed circle is every place the zone after next can spawn. Turn it on with **Next pull**.
- **Heat** shows where a hold leaves you a shorter rotate next zone. Greener is shorter.
- Early leaves on the reveal, while the old zone is still safe. Late farms after the storm has started moving.

Lessons on the start screen open a fixed seed so you can retry the same lobby.
