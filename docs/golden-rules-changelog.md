# 📜 Golden Rules Changelog

Track of how the rules evolved and WHY. Useful for contributors to understand the reasoning.

## 2026-02-21 — The Great Cleanup Session

### Rules Added
- **#7 Dual Delivery:** Workspace + Google Drive always. Ronald uses phone primarily.
- **#8 POC Lifecycle:** New projects start as OCC tickets without GitHub. Private repos by default. Graduate to repo only after CEO approval.
- **#9 GitHub ↔ OCC Mirror:** Every GitHub Issue must have an OCC ticket mirror. Without it, PRs never reach Ronald for merge approval.
- **FAQ: Comments = Instructions:** Ronald's comments on tickets have max priority.
- **FAQ: Ideas vs Board:** Unclear requests go to Ideas section, not the Board.

### Bugs That Drove These Rules
- **Watchdog auto-expansion (bug #61, #55):** Watchdog created child tickets automatically when it should have just closed. Led to Rule: default post-review = close. Only Ronald decides to expand.
- **Dev Sprint / Task Sprint overlap:** Both could work the same ticket from different sources. Led to territory rules: `github_link` = Dev Sprint territory, everything else = Task Sprint.
- **Orphan Issues:** GitHub Issues without OCC mirrors meant PRs were created but never reached Ronald for approval. Led to Rule #9.

### Design Decisions
- **Board Audit runs 30min before Task Sprint** (10:30am→11am, 6:30pm→7pm). Inspector before executor.
- **Watchdog default = close.** Safe default until 3-button review UI is implemented.
- **CEO/IT Manager dynamic:** Ronald directs, Pepa executes and advises. Pepa's expertise means challenging bad ideas, not blind obedience.
