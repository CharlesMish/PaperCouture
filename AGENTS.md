# Paper Couture — Cursor project

Read README.md and HANDOFF.md. This is Claude's chunk-3 continuation, not a new project.
The complete authored sequence and interface already exist. Start by running and playing it.
Use Node 24, npm ci, npm run typecheck, npm test, npm run build, and npm run dev.

Preserve the original sheet material coordinates, six-step construction, reversible controller,
front/back textures, and workshop/display views. Charlie wants paper and fold depth, not a
hollow dress or a dressed 3D person. Keep one garment until its feel has been reviewed.
The existing geometry checks are useful but do not certify real physical foldability or every
continuous collision. Do not replace the fold with a mesh morph or add unconstrained shape sliders.
Do not rewrite the fold engine merely to tidy it. Report and fix concrete visible failures.
Steps that fold several creases at once go through src/fold/collapse.ts and must stay rigid
(npm run check verifies the crease loops and every finished crease pattern).
Add paper patterns through src/papers; keep them separate from geometry. No backend or accounts.
Record what you tested and distinguish browser checks from real-phone and physical-paper checks.
