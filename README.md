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

## How a rep works

- The white ring is the storm you are in. The blue ring is the zone you are rotating into.
- Green wedges are dead sides. Red wedges are stacked.
- The dashed circle is every place the zone after next can spawn. Turn it on with **Next pull**.
- **Heat** shows where a hold leaves you a shorter rotate next zone. Greener is shorter.
- Early leaves on the reveal, while the old zone is still safe. Late farms after the storm has started moving.

Lessons on the start screen open a fixed seed so you can retry the same lobby.
