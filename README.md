# Simulador Mundial FIFA 2026

Motor probabilístico avanzado en Python y React para simular la Copa Mundial 2026. Utiliza simulaciones de Montecarlo (100,000 iteraciones por defecto) basadas en el ranking ELO y ventaja de localía (HFA) geográfica, previendo las probabilidades de avance en cada etapa del torneo.

## Características Principales

*   **Motor Montecarlo:** Ejecuta miles de simulaciones para calcular probabilidades precisas desde la fase de grupos hasta la final.
*   **Reglas Oficiales 2026:** Implementación completa del reglamento de desempate en fase de grupos, priorizando las mini-tablas de enfrentamientos directos (Head-to-Head) según los nuevos criterios de la FIFA.
*   **Ranking ELO Dinámico:** Calcula probabilidades basándose en la diferencia de ELO entre los equipos. Incluye la funcionalidad de anular el ELO de forma manual en el sistema.
*   **Ventaja de Localía (HFA):** Analiza el equipo sede y los estadios en México, USA y Canadá para otorgar HFA dinámico.
*   **Frontend Interactivo (React/Vite):**
    *   **Group Stage Matrix:** Vista con indicadores `(DEF)` y códigos de colores para reflejar clasificación segura (Verde) o eliminación (Rojo).
    *   **Most Likely Bracket:** Árbol de llaves R32 hasta la Final prediciendo el camino más probable de la simulación.
    *   **Match Tracker:** Registro de resultados reales y proyecciones inmediatas.

## Arquitectura

*   `src/worldcup_sim/`: Backend en Python (FastAPI).
*   `frontend/`: SPA construida con React, Vite y CSS modular.

## Instalación y Ejecución

### 1. Backend (Python)
Instala las dependencias y corre el servidor FastAPI:
```bash
uv venv
uv sync --extra dev
uvicorn src.worldcup_sim.api.main:app --reload
```

### 2. Frontend (React/Vite)
Navega a la carpeta `frontend` y lanza la interfaz:
```bash
cd frontend
npm install
npm run dev
```

---
*Hecho para proyectar el futuro del torneo más importante.*
