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

## 2026-02-28 — Pipeline Simplification

### Changes
- **Board Audit + OAS Watchdog → OAS Manager:** Fusionados en un solo cron. Misma frecuencia (10:30am/6:30pm). Reduce tokens y elimina redundancia — ambos leían `/api/tasks`.
- **Daily Report Python → DISABLED:** Reemplazado por Morning Brief de Pepa que ya cubre VPS health + Intel + tickets en Notion/Telegram/Google Task. Email semanal se mantiene.
- **No-repeat rule added:** OAS Manager no alerta sobre tickets aprobados/cerrados ni repite naming violations. Solo issues NUEVOS notifican a Telegram.
- **Cron↔Ticket sync:** OAS Manager ahora compara `openclaw cron list` vs tickets de rutina para detectar drift (ej: cron disabled pero ticket en DOING).

### Crons afectados
| Cron | Acción | Razón |
|------|--------|-------|
| 📋 Board Audit (#47) | DISABLED | Fusionado en OAS Manager |
| 🔄 OAS Watchdog | DISABLED | Fusionado en OAS Manager |
| 🔄 OAS Manager (#47) | NEW | Reemplaza ambos |
| Daily Report Python (crontab) | DISABLED | Morning Brief lo reemplaza |

### Design Decisions
- Governance Audits (3 separados) se MANTIENEN separados por capacidad de Sonnet — 1 audit grande podría dar timeout.
- Todos los crons Intel + OAS ahora forzados a Sonnet (Gemini Flash no puede escribir archivos en sesión aislada).
