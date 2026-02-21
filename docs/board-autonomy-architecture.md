# 🤖 Board Autonomy Architecture

How the OCC board runs itself through coordinated cron routines.

## Overview

The OCC uses **4 specialized crons** that collaborate to keep the board alive without human intervention. Each has a clear territory — no overlap, no competition.

```
┌─────────────────────────────────────────────────────┐
│                   Ronald (Human)                     │
│  Reviews tickets, leaves comments, approves work     │
└──────────┬──────────────────────────────┬────────────┘
           │ comments/approve              │ creates tickets
           ▼                               ▼
┌─────────────────────────────────────────────────────┐
│                    OCC Board                         │
│  Source of truth for tasks, routines, ideas           │
└──┬──────────┬──────────┬──────────┬─────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
Board      Task       Dev        OCC
Audit      Sprint     Sprint    Watchdog
(#47)      (#58)      (#57)     (#64)
```

## The 4 Crons

### 📋 Board Audit (#47) — The Inspector
**Schedule:** 10:30am, 6:30pm (30min before each Task Sprint)
**Role:** Quality control. Ensures tickets are well-formed and the board is healthy.

**What it does:**
1. Reads Ronald's comments on tickets → acts on them (move, cancel, add info)
2. Checks board health (stale tickets, missing fields, naming conventions)
3. **Detects orphans:** dev tickets without GitHub Issue linked → alerts or creates the Issue
4. Validates routine tickets have correct naming and status
5. Enforces Rule #7 (dual delivery: workspace + Google Drive)

**Why it runs before Task Sprint:** So tickets are clean and well-formed before execution starts.

### 🎯 Task Sprint (#58) — The Generalist
**Schedule:** 3am, 11am, 7pm
**Role:** Executes non-dev tickets (research, docs, reports, content).

**What it does:**
1. Picks highest priority ticket assigned to agent (DOING first, then TODO)
2. **Skips dev tickets** (anything with `github_link` or `deliverable_type=pr`)
3. Reads Ronald's comments before executing
4. Delivers to workspace + Google Drive (dual delivery)
5. Moves ticket to done, assigns to Ronald for review

**Territory:** Everything EXCEPT code. If it has a GitHub link, it's not yours.

### 🔨 Dev Sprint (#57) — The Developer
**Schedule:** 2am
**Role:** Writes code, creates PRs, closes GitHub Issues.

**What it does:**
1. Searches TWO sources: GitHub Issues (open) + OCC tickets with `github_link`
2. **Deduplication:** Checks if a GitHub Issue already has an OCC ticket (completed/done) → skips
3. Reads CLAUDE.md of the project, creates branch, codes, pushes PR
4. **Closes BOTH sources:** PR body has `Closes #N` (GitHub) + creates/updates OCC ticket
5. OCC ticket goes to done with `deliverable_type=pr` for Watchdog to merge later

**Territory:** Only code. Searches GitHub Issues + dev tickets in OCC.

### 🔄 OCC Watchdog (#64) — The Closer
**Schedule:** Every 6 hours
**Role:** Processes Ronald's approvals (reviewed tickets).

**What it does:**
1. Finds tickets with `reviewed_by_owner=true` and `status=done`
2. **PR tickets** (`deliverable_type=pr`): merges the PR automatically, marks completed
3. **All other tickets:** marks completed (default=close)
4. **NEVER creates child tickets automatically** — only Ronald decides to expand

**The `review_action` field** (when UI supports it):
- `close` → mark completed, done (DEFAULT)
- `expand` → create child tickets based on description/comments
- `need_info` → generate detailed report (workspace + Drive)

## How They Collaborate

```
Board Audit (10:30am) → cleans tickets, processes comments
                ↓ (30 min later)
Task Sprint (11am) → executes clean non-dev tickets
                ↓
Board Audit (6:30pm) → cleans again
                ↓ (30 min later)
Task Sprint (7pm) → executes more tickets
                ↓
Dev Sprint (2am) → codes overnight, creates PRs
                ↓
Task Sprint (3am) → handles non-dev overnight work
                ↓
Watchdog (every 6h) → merges approved PRs, closes reviewed tickets
```

## Territory Rules (No Overlap)

| Signal | Owner | Others |
|--------|-------|--------|
| `github_link` present | Dev Sprint | Task Sprint skips it |
| `deliverable_type=pr` | Dev Sprint | Task Sprint skips it |
| No `github_link`, not PR | Task Sprint | Dev Sprint ignores it |
| `reviewed_by_owner=true` | Watchdog | Others don't touch reviewed tickets |
| Ronald's comments | Board Audit | Task Sprint also reads before executing |

## Orphan Detection

The Board Audit catches tickets that fall between cracks:

| Orphan Type | Problem | Fix |
|-------------|---------|-----|
| OCC ticket with `deliverable_type=pr` but no `github_link` | Dev Sprint won't see it, Task Sprint skips it | Board Audit creates the GitHub Issue or alerts |
| GitHub Issue without OCC ticket | Dev Sprint handles it (creates ticket after PR) | Normal flow |
| Dev Sprint creates duplicate OCC ticket | Should update existing, not create new | Deduplication check by `github_link` |

## Golden Rules Referenced

- **Rule #7 (Dual Delivery):** Every deliverable exists in workspace + Google Drive. Phone-first.
- **Rule #5 (Routines):** Status must be `routine`, naming convention: `{emoji} {Name} — {schedule} (#{id})`
- **Comments = Instructions:** Ronald's comments have max priority. Board Audit and Task Sprint read them before acting.
- **Ideas vs Board:** Unclear requests go to Ideas, not the Board.

## Key Design Decisions

1. **Default post-review = close.** After bug #61 where Watchdog auto-created 4 unnecessary child tickets, we made close the safe default. Expansion requires explicit human decision.

2. **Board Audit runs before Task Sprint.** Ensures tickets are clean before execution. Like QA before production.

3. **Dev Sprint searches both sources.** GitHub Issues AND OCC dev tickets. Closes both when done. Single source of truth per ticket via `github_link`.

4. **Task Sprint is non-dev only.** Clear boundary prevents duplicate work.

## For Contributors

If you're cloning this project and setting up your own board autonomy:

1. Create cron jobs matching the 4 roles above
2. Adjust schedules to your timezone and workflow
3. The Board Audit → Task Sprint timing (30min gap) is intentional
4. Start with Watchdog default=close until you implement the 3-button review UI
5. The `github_link` field is the key discriminator between dev and non-dev work
