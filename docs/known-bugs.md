# Bugs Conocidos

- **Watchdog auto-expand (#61):** Watchdog creaba children innecesarios. Fix: default close, solo expand si Ronald lo pide explícitamente.
- **Worker runs vacío:** La tab Runs estará vacía hasta que los crons empiecen a hacer POST `/api/worker-runs`. Es comportamiento esperado.
