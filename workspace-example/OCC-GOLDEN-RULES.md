# OCC Golden Rules — Example

This is a template file for new OCC users. Customize these rules to fit your workflow.

## 🎯 Regla #1 — Todo pedido = ticket primero

Antes de hacer cualquier trabajo:
1. Crear ticket en OCC (http://your-host:3401/)
2. Asignar prioridad (high/medium/low)
3. Definir entregable claro

Sin ticket ≠ sin trabajo. El caos empieza cuando no hay registro.

## 🔄 Regla #2 — Estados claros

| Estado | Significado | Quién mueve |
|--------|-------------|-------------|
| **todo** | Listo para trabajar | Creador |
| **doing** | En progreso | Worker |
| **done** | Terminado, listo para review | Worker |
| **reviewed** | Aprobado y cerrado | Reviewer |

## 📋 Regla #3 — Prioridades

- **High (🔴)**: Urgente, afecta operación
- **Medium (🟡)**: Importante, pero puede esperar  
- **Low (🟢)**: Nice to have, hacer cuando no hay High/Medium

## 🤝 Regla #4 — Assignee responsable

- El assignee debe mover el ticket through estados
- Si no puedes completar, reasigna + comentario explicando por qué
- Sin assignee = sin ownership = trabajo perdido

## 📱 Regla #5 — Entregables específicos

Todo ticket necesita deliverable_type:
- **url**: Link a resultado (dashboard, doc, etc.)
- **file**: Archivo específico
- **pr**: Pull request
- **task**: Para tareas sin deliverable tangible

## 📝 Regla #6 — Comentarios como log

Usa comentarios para:
- Reportar progreso
- Documentar blockers
- Explicar cambios de scope
- Dejar breadcrumbs para el futuro

## Customización

Edita este archivo para agregar tus propias reglas específicas:
- Horarios de trabajo
- Tipos de proyecto específicos
- Convenciones de naming
- Procesos de review

**Tip**: Mantén las reglas simples y aplicables. Reglas complicadas no se siguen.