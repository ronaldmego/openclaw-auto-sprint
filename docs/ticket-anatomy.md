# 🎫 Ticket Anatomy — Types, Fields, and Lifecycle

## Board Categories

The OCC has 3 sections. Each serves a different purpose:

| Section | What lives here | Status values | Who creates |
|---------|----------------|---------------|-------------|
| **Board** | One-time tasks with start and end | `todo`, `doing`, `done`, `completed`, `cancelled` | User or System |
| **Routines** | Recurring tasks linked to crons | `routine` | System (via Watchdog or manually) |
| **Ideas** | Unclear requests, wishes, brainstorms | `idea`, `promoted` | User or System |

### Board → for work that gets DONE
A task enters, gets worked, gets reviewed, gets closed. It dies.

### Routines → for work that REPEATS
Linked to a cron job. Never "done" — it runs on schedule forever (or until disabled).

### Ideas → for things that MIGHT become work
"What if we..." goes here. NOT to the board. Ideas get promoted to tickets only when Ronald decides.

---

## Ticket Fields

### Required (every ticket)
| Field | Description | Example |
|-------|-------------|---------|
| `title` | Clear, specific | "MVP: SEO Monitor con Search Console API" |
| `description` | What to deliver + Definition of Done | Checklist of deliverables |
| `priority` | `critical` / `high` / `normal` / `low` | `high` |
| `assignee` | `agent` (System executes) or `human` (Human reviews) | `agent` |
| `status` | Current state (see lifecycle below) | `todo` |

### Conditional
| Field | When required | Purpose |
|-------|---------------|---------|
| `deliverable_type` | Always recommended | Determines which cron handles it |
| `github_link` | Dev tickets (code) | Links to GitHub Issue. **Key discriminator:** present = Dev Sprint territory |
| `drive_link` | When deliverable exists | **Rule #7:** Executive access via mobile. No drive_link = not accessible |
| `deliverable_url` | PR tickets | URL of the PR to merge |
| `parent_id` | Child tickets | Links to parent ticket |
| `due_date` | Time-sensitive work | ISO date |
| `project_ref` | Multi-project boards | Repo or project name |
| `review_action` | Set by executive at review time | `close` / `expand` / `need_info` |

---

## Deliverable Types

The `deliverable_type` field determines HOW the ticket gets handled:

| Type | Handled by | What it produces | Example |
|------|------------|------------------|---------|
| `pr` | **Dev Sprint** | Pull Request → Watchdog merges | "Add collapsible sections to OCC UI" |
| `research` | **Task Sprint** | Report/analysis → workspace + Drive | "Evaluación ronaldmego.com" |
| `content` | **Task Sprint** | Blog post, social content → Drive | "Blog Post: Agent Sprawl" |
| `config` | **Task Sprint** | Configuration change | "Configure pinned repos on GitHub" |
| `poc` | **Task Sprint** | Prototype → Ronald evaluates → maybe becomes repo | "SEO Monitor dashboard" |
| `proposal` | **Task Sprint** | Recommendation document → Drive | "Propuesta de archivado proyectos legacy" |
| `roadmap` | **Task Sprint** | Plan document → Drive | "Plan de reactivación proyectos pausados" |
| `review` | **Ronald** | Human review needed | "Review PR #13" |
| `other` | **Task Sprint** | Anything else | Catch-all |

### Territory Rules
```
github_link present OR deliverable_type=pr  →  Dev Sprint (#57)
Everything else                              →  Task Sprint (#58)
```

---

## Ticket Lifecycle

### Board Tickets
```
📋 TODO                    — Waiting to be picked up
    ↓ (cron picks it)
⚡ DOING                   — Being worked on
    ↓ (work complete)
✅ DONE (assignee=human)   — Work done, waiting for executive review
    ↓ (Executive reviews)   — Chooses: Close / Expand / Need Info
✔️ COMPLETED               — Closed forever (or expanded into children)
```

### Executive Review Interface (3 actions)
| Action | `review_action` | What happens |
|--------|----------------|--------------|
| ✅ **Close** | `close` | Integration Manager marks completed. Ticket archived. |
| 🔀 **Expand** | `expand` | Integration Manager creates 2-4 child tickets from description/comments. |
| ❓ **Need Info** | `need_info` | Integration Manager generates detailed report → workspace + cloud. Ticket stays in review. |

### Routine Tickets
```
🔄 ROUTINE  — Lives forever, linked to a cron
              Naming: {emoji} {Name} — {schedule} (#{id})
              Example: 🔍 Daily Intel — 1:30am (#43)
```

### Idea Tickets
```
💡 IDEA     — Brainstorm, wish, unclear request
    ↓ (Ronald decides to pursue)
📋 PROMOTED — Becomes a real ticket on the Board
```

---

## Rules Quick Reference

1. **One ticket = one deliverable.** Don't mix.
2. **Dual delivery (Rule #7):** Workspace + Google Drive. Phone-first.
3. **Dev tickets need `github_link`.** Without it, Dev Sprint won't see them.
4. **Every GitHub Issue = OCC ticket mirror (Rule #9).** Without mirror, PRs never reach executive review.
5. **POCs start without repo (Rule #8).** Private repo only after executive approval.
6. **Comments = instructions.** Executive comments have maximum priority.
7. **Unclear → Ideas, not Board.** If you can't define the deliverable, it's an idea.
8. **Watchdog default = close.** Only expands when Ronald explicitly chooses Expand.

---

## Anti-Patterns (learned the hard way)

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Create ticket without `deliverable_type` | Always set type | Crons use it to decide territory |
| Dev ticket without `github_link` | Always link to Issue | Dev Sprint searches by `github_link` |
| Skip `drive_link` | Always upload to cloud | Executive can't access from mobile |
| Auto-expand reviewed tickets | Default close, let executive decide | Bug #61: Integration Manager created 4 unnecessary children |
| Put unclear wishes on Board | Put in Ideas section | Board is for concrete work only |
| Create public repos by default | Always private | Only public after explicit sanitization + executive approval |
