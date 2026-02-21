# 🐷 The Pepa Loop — Autonomous Board Management Methodology

**A methodology for AI-driven project management where cron routines collaborate autonomously to detect, execute, review, and iterate work — with the human as CEO, not operator.**

---

## Philosophy

> "The CEO sleeps. The board doesn't."

The Pepa Loop is designed so a human CEO can:
1. Review work from their phone (Google Drive)
2. Make decisions with 3 buttons (Close / Expand / Need Info)  
3. Leave comments as instructions
4. Sleep, exercise, live — while the system executes

**The AI is the IT Manager, not the assistant.** It has opinions, challenges bad ideas, and proposes alternatives. But the CEO decides.

---

## The Loop

```
    ┌──────────────────────────────────────────────┐
    │              🕵️ INTEL (1:30am)                │
    │  Scans: YouTube, GitHub, Blogs, Papers        │
    │  Produces: Daily Intel Report → Drive          │
    │  Feeds: 💡 Ideas → OCC Ideas Bank              │
    └──────────────┬───────────────────────────────┘
                   │ ideas
                   ▼
    ┌──────────────────────────────────────────────┐
    │              💡 IDEAS BANK                     │
    │  CEO evaluates from phone                     │
    │  Promote → Board ticket  |  Discard           │
    └──────────────┬───────────────────────────────┘
                   │ promoted tickets
                   ▼
    ┌──────────────────────────────────────────────┐
    │              📋 BOARD (Tickets)                │
    │  todo → doing → done → review → completed     │
    │                                               │
    │  Dev tickets (github_link) ──→ Dev Sprint     │
    │  Non-dev tickets ──────────→ Task Sprint      │
    └──────┬───────────┬───────────┬───────────────┘
           │           │           │
           ▼           ▼           ▼
    ┌────────┐  ┌────────────┐  ┌──────────┐
    │📋 Board│  │🎯 Task     │  │🔨 Dev    │
    │ Audit  │  │  Sprint    │  │  Sprint  │
    │10:30am │  │3am/11am/   │  │  2am     │
    │6:30pm  │  │7pm         │  │          │
    │        │  │            │  │          │
    │Cleans  │  │Executes    │  │Codes     │
    │tickets,│  │non-dev     │  │PRs       │
    │reads   │  │tickets     │  │closes    │
    │comments│  │(research,  │  │GitHub +  │
    │detects │  │content,    │  │OCC       │
    │orphans │  │docs, POCs) │  │          │
    └────────┘  └─────┬──────┘  └────┬─────┘
                      │              │
                      ▼              ▼
              ┌──────────────────────────────┐
              │     ✅ DONE (assignee=CEO)    │
              │  Dual delivery:               │
              │  📁 Workspace + ☁️ Drive       │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     👀 CEO REVIEWS            │
              │  From phone (Google Drive)    │
              │                              │
              │  ✅ Close → completed          │
              │  🔀 Expand → child tickets    │
              │  ❓ Need Info → report         │
              │  💬 Comment → instruction      │
              │  ❌ Cancel → closes GH Issue   │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     🔄 WATCHDOG (every 6h)    │
              │  Reads review_action          │
              │  Merges PRs automatically     │
              │  Closes or expands tickets    │
              │  Generates reports if needed  │
              └──────────────┬───────────────┘
                             │
                             ▼
                      Back to Board
                    (new tickets or done)
```

---

## The 6 Routines

| # | Routine | Schedule | Role | Analogy |
|---|---------|----------|------|---------|
| 1 | 🕵️ **Daily Intel** | 1:30am | Scans the world, feeds Ideas | Market Research |
| 2 | 🔨 **Dev Sprint** | 2am | Writes code, creates PRs | Engineering |
| 3 | 🎯 **Task Sprint** | 3am, 11am, 7pm | Executes non-dev work | Operations |
| 4 | ☀️ **Morning Brief** | 7am | Summarizes overnight work → Drive | Daily Standup |
| 5 | 📋 **Board Audit** | 10:30am, 6:30pm | Cleans board, reads comments | QA / Scrum Master |
| 6 | 🔄 **Watchdog** | Every 6h | Processes CEO decisions | Release Manager |

### Supporting routines
| Routine | Schedule | Role |
|---------|----------|------|
| 🧹 **Weekly Hygiene** | Sunday 4am | Maintenance, cleanup |
| 📊 **SEO Weekly** | Monday 8am | SEO metrics report |

---

## Territory Rules (No Overlap)

```
github_link present OR deliverable_type=pr  →  Dev Sprint only
No github_link AND not PR type             →  Task Sprint only
reviewed_by_owner=true                      →  Watchdog only
Ronald's comments on active tickets         →  Board Audit + executing Sprint
```

---

## The 3-Button Review

When the CEO reviews a completed ticket:

| Button | Effect | When to use |
|--------|--------|-------------|
| ✅ **Close** | Ticket dies. Done forever. | Work is complete, no follow-up needed |
| 🔀 **Expand** | Watchdog creates child tickets | Work revealed next steps |
| ❓ **Need Info** | Watchdog generates detailed report → Drive | CEO needs more detail to decide |

**Default (no button / legacy):** Close. Safe default.

---

## Delivery Rules

1. **Dual delivery:** Every deliverable exists in workspace (technical) + Google Drive (CEO reads from phone)
2. **Phone-first:** Assume CEO is never at laptop
3. **Drive structure:**
   ```
   🐷 Pepa Office/
   ├── ☀️ Morning Briefs/
   ├── 🕵️ INTEL AI Reports/
   ├── 📈 SEO Strategy/
   ├── 📊 Reportes/
   ├── 📝 Content Drafts/
   ├── 📋 Backlog/
   └── 📺 YouTube Digests/
   ```

---

## Anti-Patterns (Learned the Hard Way)

| ❌ Problem | 🐛 What happened | ✅ Fix |
|-----------|------------------|--------|
| Watchdog auto-expands | Created 4 unnecessary child tickets (#61) | Default=close. Only CEO decides to expand |
| Dev/Task Sprint overlap | Both worked same ticket from different sources | Territory rules: github_link = Dev Sprint |
| Orphan GitHub Issues | Issues without OCC mirror → PRs never reach CEO | Rule #9: every Issue needs OCC ticket |
| No Drive link | CEO can't see deliverables from phone | Rule #7: dual delivery mandatory |
| Placeholders in reports | "[verify stats]" in CEO report | Methodology: verify or don't include |
| Ideas die in reports | Good ideas buried in Google Docs | Intel auto-registers Ideas in OCC |
| Server not restarted after PR merge | New features in code but not running | Watchdog restarts OCC after merging OCC PRs |

---

## Comparison with Agile/Scrum

| Concept | Scrum | Pepa Loop |
|---------|-------|-----------|
| Sprint Planning | Meeting, human-driven | Board Audit cleans + prioritizes automatically |
| Daily Standup | Meeting, 15min | Morning Brief → Google Doc, async |
| Sprint Execution | Developers, sync | Dev Sprint + Task Sprint, autonomous |
| Sprint Review | Meeting with stakeholders | 3-button review from phone |
| Retrospective | Meeting, human-driven | Anti-patterns documented, methodology evolves |
| Product Backlog | Jira/Linear, manual | OCC Board, auto-fed by Intel → Ideas |
| Scrum Master | Human role | Board Audit cron |
| Release | Manual deploy + review | Watchdog auto-merges approved PRs |

**Key difference:** In Scrum, humans do everything and meet constantly. In Pepa Loop, AI routines handle execution and coordination — the human only makes decisions and reviews results.

---

## For Contributors

To implement the Pepa Loop in your own OCC:

1. **Start with Board Audit + Watchdog** — these are the foundation
2. **Add Task Sprint** — for non-dev work execution
3. **Add Dev Sprint** — for code work (requires GitHub integration)
4. **Add Intel** — for automated market scanning
5. **Add Morning Brief** — for async daily standup
6. **Define territory rules** — prevent overlap between sprints
7. **Implement 3-button review** — CEO decision interface
8. **Connect to Google Drive** — phone-first delivery

Each routine's prompt is in its corresponding cron job. The methodology docs are in `docs/`.

---

*Created: 2026-02-21 by Pepa 🐷 & Ronald Mego*  
*Born from a Saturday night debugging session that turned into a methodology.*
