# 📜 Golden Rules Changelog

Track of how the rules evolved and WHY. Useful for contributors to understand the reasoning.

## 2026-02-21 — The Great Cleanup Session

### Rules Added
- **#7 Dual Delivery:** Workspace + Cloud storage always. Executive uses mobile primarily.
- **#8 POC Lifecycle:** New projects start as OCC tickets without GitHub. Private repos by default. Graduate to repo only after executive approval.
- **#9 GitHub ↔ OCC Mirror:** Every GitHub Issue must have an OCC ticket mirror. Without it, PRs never reach executive for merge approval.
- **FAQ: Comments = Instructions:** Executive comments on tickets have maximum priority.
- **FAQ: Ideas vs Board:** Unclear requests go to Ideas section, not the Board.

### Bugs That Drove These Rules
- **Integration Manager auto-expansion (bug #61, #55):** System created child tickets automatically when it should have just closed. Led to Rule: default post-review = close. Only executive decides to expand.
- **Development / Operations overlap:** Both could work the same ticket from different sources. Led to territory rules: `github_link` = Development territory, everything else = Operations.
- **Orphan Issues:** GitHub Issues without OCC mirrors meant PRs were created but never reached executive for approval. Led to Rule #9.

### Design Decisions
- **Board Audit runs 30min before Task Sprint** (10:30am→11am, 6:30pm→7pm). Inspector before executor.
- **Watchdog default = close.** Safe default until 3-button review UI is implemented.
- **Executive/Operations dynamic:** Executive directs, system executes and advises. System expertise means challenging suboptimal approaches, not blind execution.
