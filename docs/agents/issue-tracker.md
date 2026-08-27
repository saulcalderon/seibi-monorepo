# Issue tracker: Linear

Issues and PRDs for this repo live in Linear workspace **Seibi** (`https://linear.app/seibi`), team **Seibi** (key `SEI`). Use the Linear MCP for all operations — not GitHub Issues.

Default product project: **[App móvil Seibi](https://linear.app/seibi/project/app-movil-seibi-69b2a870770c)**. Attach new product work to this project unless the user names another one.

## Language

**All content written into Linear is Spanish.** That includes project names, summaries, descriptions, documents, issues, PRDs, comments, milestones, and status updates.

- Use the Spanish names from ADR-0002 (Vehículo, Servicio, Tipo, Taller, Recordatorio, Kilometraje, Estimado). Do not use the English `CONTEXT.md` terms in Linear.
- Keep proper nouns and technical identifiers as they appear in code or vendor docs (Supabase, TanStack, PWA, Capacitor, `SEI-123`, file paths).
- This file (`docs/agents/issue-tracker.md`) stays in English so agents can follow the operations. The Linear payload they write must still be Spanish.

## Conventions

- **Create an issue**: `save_issue` with `title`, `team: "Seibi"`, and usually `project: "App móvil Seibi"`. Put the body in `description` as Markdown (literal newlines; do not escape). Set `labels` (e.g. `Feature`, `Improvement`, `Bug`) and `state` (`Backlog` / `Todo` / `In Progress` / `Done` / `Canceled` / `Duplicate`) as needed.
- **Read an issue**: `get_issue` with the identifier (`SEI-123`). Pass `includeRelations: true` when blockers or related issues matter. Then `list_comments` on that issue.
- **List issues**: `list_issues` with `team: "Seibi"` and filters (`project`, `state`, `label`, `assignee`). Use `assignee: "me"` for the current user; `assignee: "null"` for unassigned.
- **Comment on an issue**: `save_comment` with `issueId` and `body`.
- **Apply / remove labels**: `save_issue` with `id` and the full `labels` array (this replaces the set). Create a missing label with `create_issue_label` (`teamId` omitted = workspace label).
- **Close**: `save_issue` with `id` and `state: "Done"` (or `"Canceled"` / `"Duplicate"`). Add a closing comment first when the skill asks for one.
- **Assign / claim**: `save_issue` with `assignee: "me"` (or a user name/email).

Issue identifiers look like `SEI-123`. The GitHub repo is for code and PRs only.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

PRs stay on GitHub. Do not file or triage them as Linear issues unless the user explicitly asks.

## When a skill says "publish to the issue tracker"

Create a Linear issue on team **Seibi** with `save_issue`. Put it on **App móvil Seibi** unless the user says otherwise. Write the title and body in Spanish, using the Spanish names from ADR-0002.

## When a skill says "fetch the relevant ticket"

Run `get_issue` for that identifier (with comments via `list_comments`).

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single Linear issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `save_issue` with that label on team Seibi.
- **Child ticket**: `save_issue` with `parentId` set to the map's identifier (`SEI-n`). Labels: `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`). Once claimed, assign the ticket to the driving dev.
- **Blocking**: Linear relations — `blockedBy` / `blocks` on `save_issue` (append-only; use `removeBlockedBy` / `removeBlocks` to drop an edge). Read with `get_issue` + `includeRelations: true`. A ticket is unblocked when every blocker is Done/Canceled.
- **Frontier query**: `list_issues` with `parentId` of the map, open states (`Backlog` / `Todo` / `In Progress`), no assignee (`assignee: "null"`), drop any with an open `blockedBy`; first in map order wins.
- **Claim**: `save_issue` with `assignee: "me"` — the session's first write.
- **Resolve**: `save_comment` with the answer, then `save_issue` `state: "Done"`, then append a context pointer to the map's Decisions-so-far.

## Workspace notes

Existing issue labels: `Feature`, `Improvement`, `Bug`. Statuses: `Backlog`, `Todo`, `In Progress`, `Done`, `Canceled`, `Duplicate`.
