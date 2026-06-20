# Simulador del Mundial FIFA 2026 — Arquitectura del Backend

> Especificación técnica para implementación en Antigravity (Gemini 3.1 Flash).
> Basada en la información oficial del torneo confirmada a fecha actual.

---

## 0. Estado actual del torneo (verificado)

Los 48 equipos están **ya definidos**. Tras los playoffs europeos e intercontinentales de marzo 2026:

- **UEFA Playoff Path A → Grupo B:** Bosnia y Herzegovina
- **UEFA Playoff Path B → Grupo F:** Suecia
- **UEFA Playoff Path C → Grupo D:** Turquía (Türkiye)
- **UEFA Playoff Path D → Grupo A:** Chequia
- **Intercontinental Path 1 → Grupo K:** RD Congo
- **Intercontinental Path 2 → Grupo I:** Iraq

### Grupos definitivos

| Grupo | Equipos |
|-------|---------|
| A | México (anfitrión), Sudáfrica, Corea del Sur, Chequia |
| B | Canadá (anfitrión), Bosnia y Herzegovina, Qatar, Suiza |
| C | Brasil, Marruecos, Haití, Escocia |
| D | Estados Unidos (anfitrión), Paraguay, Australia, Turquía |
| E | Alemania, Curazao, Costa de Marfil, Ecuador |
| F | Países Bajos, Japón, Suecia, Túnez |
| G | Bélgica, Egipto, Irán, Nueva Zelanda |
| H | España, Cabo Verde, Arabia Saudita, Uruguay |
| I | Francia, Senegal, Iraq, Noruega |
| J | Argentina, Argelia, Austria, Jordania |
| K | Portugal, RD Congo, Uzbekistán, Colombia |
| L | Inglaterra, Croacia, Ghana, Panamá |

### Formato del torneo (reglas estrictas)

- **Fase de grupos:** 12 grupos × 4 equipos → 3 partidos por equipo (round-robin).
  - Puntos: 3 victoria, 1 empate, 0 derrota.
  - **Desempate (en orden):** (1) Puntos, (2) Diferencia de goles, (3) Goles a favor, (4) Puntuación de juego limpio, (5) FIFA Ranking más reciente, (6) Sorteo.
- **Clasifican:** Top 2 de cada grupo (24 equipos) + los 8 mejores terceros → **32 equipos**.
- **Rankeo de terceros:** Mismos criterios que dentro de un grupo, aplicados entre los 12 terceros.
- **Eliminatoria:** R32 → R16 → Cuartos → Semis → Final (con partido por 3er lugar).
- **Prórroga:** 30 min si está empatado al final de 90. Penales si persiste el empate.
- **Cruces del R32:** Dependen de qué 8 grupos produjeron terceros → **Anexo C con 495 combinaciones** (tabla oficial FIFA, encodeada en `data/bracket/annex_c.json`).

### Matchups del R32 (esqueleto fijo, 16 partidos)

```
Match 73: 2A vs 2B
Match 74: 1E vs 3_[A/B/C/D/F]
Match 75: 1F vs 2C
Match 76: 1C vs 2F
Match 77: 1I vs 3_[C/D/F/G/H]
Match 78: 2E vs 2I
Match 79: 1A vs 3_[C/E/F/H/I]
Match 80: 1L vs 3_[E/H/I/J/K]
Match 81: 1D vs 3_[B/E/F/I/J]
Match 82: 1G vs 3_[A/E/H/I/J]
Match 83: 2K vs 2L
Match 84: 1H vs 2J
Match 85: 1B vs 3_[E/F/G/I/J]
Match 86: 1J vs 2H
Match 87: 1K vs 3_[D/E/I/J/L]
Match 88: 2D vs 2G
```

Los slots `3_[...]` se resuelven con el Anexo C según qué combinación de 8 grupos aportó terceros.

---

## 1. Estructura del proyecto

```
worldcup_sim/
├── pyproject.toml                 # uv/Hatch — gestión moderna de dependencias
├── .python-version                # 3.12
├── README.md
├── .env.example                   # ELO_SOURCE_URL, CACHE_DIR, etc.
├── src/
│   └── worldcup_sim/
│       ├── __init__.py
│       ├── config.py              # Parámetros globales (K, μ, α, ρ, HFA, N_SIMS)
│       │
│       ├── data/                  # Datos estáticos del torneo
│       │   ├── teams.py           # 48 equipos con confederación y país
│       │   ├── groups.py          # Los 12 grupos
│       │   ├── venues.py          # 16 sedes + país + coords
│       │   ├── schedule.py        # 72 partidos de grupos + knockout skeleton
│       │   ├── bracket/
│       │   │   ├── r32_skeleton.py    # Los 16 matchups del R32 (formato)
│       │   │   ├── r16_to_final.py    # Bracket posterior
│       │   │   └── annex_c.json       # 495 combinaciones oficiales FIFA
│       │   └── fifa_ranking.py    # Ranking FIFA (tiebreak #5)
│       │
│       ├── scraping/
│       │   ├── elo_scraper.py     # Scraper de eloratings.net
│       │   └── elo_cache.py       # SQLite: ELO histórico + timestamps
│       │
│       ├── models/                # Dataclasses / Pydantic
│       │   ├── team.py            # Team
│       │   ├── match.py           # Match, MatchResult
│       │   ├── group.py           # GroupStanding
│       │   └── results.py         # SimulationRun, AggregateResults
│       │
│       ├── core/                  # Motor de simulación
│       │   ├── elo.py             # Cálculo W_e, update ELO, factor G
│       │   ├── home_advantage.py  # Tabla HFA por partido
│       │   ├── match_simulator.py # Dixon-Coles Poisson → (g_h, g_a)
│       │   ├── extra_time.py      # Prórroga + penales
│       │   ├── group_simulator.py # Simula grupo, aplica tiebreakers
│       │   ├── third_place_ranker.py  # Rankea los 12 terceros
│       │   ├── bracket_builder.py # Resuelve Anexo C, construye R32
│       │   ├── knockout.py        # Simula eliminatoria
│       │   └── tournament.py      # Orquesta un Mundial completo
│       │
│       ├── simulation/
│       │   ├── runner.py          # Ejecuta N mundiales (paralelizable)
│       │   └── aggregator.py      # Acumula estadísticas
│       │
│       ├── analysis/
│       │   └── reports.py         # Genera JSON/DataFrame de probabilidades
│       │
│       ├── api/                   # FastAPI (frontend futuro)
│       │   ├── main.py
│       │   ├── routes/
│       │   │   ├── simulate.py
│       │   │   └── teams.py
│       │   └── schemas.py
│       │
│       └── cli.py                 # Entry point: `python -m worldcup_sim`
│
├── tests/
│   ├── test_elo.py
│   ├── test_match_simulator.py
│   ├── test_group_simulator.py
│   ├── test_tiebreakers.py
│   ├── test_annex_c.py            # Valida las 495 combinaciones
│   ├── test_tournament.py
│   └── test_end_to_end.py
│
└── storage/
    ├── cache/
    │   └── elo.sqlite
    └── outputs/
        └── probabilities_YYYYMMDD.json
```

---

## 2. Entorno virtual (recomendación: **uv**)

`uv` es el gestor moderno de Python (rápido, reemplaza pip+venv+pip-tools). Si prefieres algo más clásico, la alternativa es `venv` + `pip`.

### 2.1. `pyproject.toml`

```toml
[project]
name = "worldcup-sim"
version = "0.1.0"
description = "Simulador probabilístico del Mundial FIFA 2026"
requires-python = ">=3.12"
readme = "README.md"

dependencies = [
    # Core numérico
    "numpy>=2.0",
    "scipy>=1.13",              # Distribuciones, optimización
    "pandas>=2.2",              # Output/agregaciones
    "numba>=0.60",              # JIT para el hot-loop (opcional)

    # Scraping
    "httpx>=0.27",
    "beautifulsoup4>=4.12",
    "lxml>=5.2",
    "tenacity>=9.0",            # Retries con backoff

    # Modelado/validación
    "pydantic>=2.8",

    # API (para el frontend)
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",

    # Persistencia
    "sqlite-utils>=3.37",       # Wrapper cómodo sobre SQLite

    # Utilidades
    "typer>=0.12",              # CLI
    "rich>=13.7",               # Logs y tablas bonitas
    "python-dotenv>=1.0",
    "tqdm>=4.66",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-cov>=5.0",
    "hypothesis>=6.110",         # Property-based testing (vital aquí)
    "ruff>=0.6",
    "mypy>=1.11",
    "ipython>=8.26",
]

[project.scripts]
worldcup-sim = "worldcup_sim.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### 2.2. Comandos de setup

```bash
# Instalar uv (si no lo tienes)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Crear proyecto y entorno virtual
uv venv --python 3.12
uv sync --extra dev

# Activar (opcional; uv run lo hace automático)
source .venv/bin/activate     # Linux/Mac
.venv\Scripts\activate        # Windows

# Correr algo
uv run worldcup-sim simulate --n 10000
uv run pytest
```

---

## 3. Decisiones matemáticas

Esto es el corazón del proyecto. Cada decisión está justificada.

### 3.1. Modelo probabilístico central: **Dixon-Coles con doble Poisson**

**Por qué no ELO "puro":** El ELO estándar da una probabilidad de victoria (expected score) que mezcla empates como 0.5 wins. No produce empates explícitos ni marcadores. Necesitamos:
1. Probabilidad explícita de empate.
2. Goles exactos (para diferencia de goles y goles a favor).

**Modelo adoptado:**

Para un partido entre *home* y *away* con ELOs $R_h, R_a$ y ventaja local $H$ (en puntos ELO):

$$
\lambda_h = \mu \cdot 10^{(R_h - R_a + H)/800}
$$
$$
\lambda_a = \mu \cdot 10^{-(R_h - R_a + H)/800}
$$

- $\mu = 1.25$ (goles promedio por equipo por partido en Mundiales; calibrar desde datos históricos).
- La base $800 = 2 \times 400$ hace que el modelo sea **consistente con ELO**: el expected score de Poisson coincide numéricamente con $1/(1 + 10^{-\Delta/400})$.
- $\lambda_h, \lambda_a$ son los goles esperados de cada equipo.

**Ajuste Dixon-Coles** para corregir la sobreestimación de empates 0-0 y 1-1 y subestimación de resultados 1-0/0-1 que tiene el Poisson naïve:

$$
P(X=x, Y=y) = \tau(x, y | \lambda_h, \lambda_a, \rho) \cdot \text{Poisson}(x; \lambda_h) \cdot \text{Poisson}(y; \lambda_a)
$$

donde $\tau$ es:

| $(x, y)$ | $\tau$ |
|----------|--------|
| (0, 0)   | $1 - \lambda_h \lambda_a \rho$ |
| (0, 1)   | $1 + \lambda_h \rho$ |
| (1, 0)   | $1 + \lambda_a \rho$ |
| (1, 1)   | $1 - \rho$ |
| otros    | $1$ |

Usa $\rho = -0.1$ como valor inicial (típico en la literatura).

**Simulación de marcadores:**
```
# Pseudocódigo en core/match_simulator.py
def simulate_match(team_h, team_a, venue, elo_h, elo_a) -> (int, int):
    H = home_advantage(team_h, team_a, venue)
    diff = elo_h - elo_a + H
    lam_h = MU * 10**(diff / 800)
    lam_a = MU * 10**(-diff / 800)

    # Sample con Dixon-Coles por aceptación-rechazo O(1):
    # 1. Muestrear x ~ Poisson(lam_h), y ~ Poisson(lam_a)
    # 2. Calcular tau(x, y, lam_h, lam_a, rho)
    # 3. Aceptar con prob min(tau, 1); si no, reintentar
    #    (tau <= max_tau estabilizado cerca de 1)
    return (x, y)
```

### 3.2. Ventaja local (Home Field Advantage)

eloratings.net usa **+100 puntos ELO** para ventaja local "pura". Adoptamos ese valor y añadimos matices:

```python
# core/home_advantage.py
FULL_HOME = 100         # Anfitrión jugando en su país
STRONG_DIASPORA = 35    # Apoyo muy significativo por diáspora
MILD_DIASPORA = 15      # Apoyo moderado

def home_advantage(team, opponent, venue) -> float:
    # 1. Anfitrión jugando local
    if team.country == venue.country and team.country in HOST_COUNTRIES:
        return FULL_HOME

    # 2. México jugando en EE.UU. en ciudades con fuerte diáspora
    if team.code == "MEX" and venue.city in {"Los Angeles", "Dallas", "Houston"}:
        return STRONG_DIASPORA

    # 3. Equipos CONCACAF/CONMEBOL jugando en México o sur de EE.UU.
    if team.confederation in {"CONMEBOL", "CONCACAF"} and venue.country == "Mexico":
        return MILD_DIASPORA

    # 4. Argentina con gran apoyo en el sur/este de EE.UU. (diáspora + hinchada)
    if team.code == "ARG" and venue.city in {"Miami", "New York/New Jersey"}:
        return MILD_DIASPORA

    # 5. Brasil con diáspora en Miami y Boston
    if team.code == "BRA" and venue.city in {"Miami", "Boston"}:
        return MILD_DIASPORA

    # 6. Portugal en Boston (diáspora portuguesa histórica)
    if team.code == "POR" and venue.city == "Boston":
        return MILD_DIASPORA

    # 7. Partido neutral
    return 0.0
```

**Justificación de los valores:**
- México en EE.UU. históricamente llena estadios; en LA y Dallas la hinchada mexicana es abrumadoramente mayoritaria incluso jugando contra EE.UU.
- El valor `STRONG_DIASPORA = 35` equivale a ~5-7% extra de probabilidad de ganar.
- Los casos específicos de ARG/BRA/POR son discutibles; documentar claramente y permitir ajuste por configuración.

**IMPORTANTE:** En cuartos/semis/final, los anfitriones jugarán en venues que pueden no ser "su país" (ejemplo: México llegando a la final en MetLife Stadium). Solo se otorga FULL_HOME si el partido es literalmente en el país del equipo.

### 3.3. Prórroga y penales

```python
def simulate_extra_time(lam_h, lam_a, rho):
    # 30 min = 1/3 de partido → escalar lambdas
    return simulate_dixon_coles(lam_h / 3, lam_a / 3, rho)

def simulate_penalties(elo_h, elo_a):
    # Ligera ventaja del más fuerte, pero muy reducida.
    # Empíricamente, shootouts son ~50/50 ajustados poco por ELO.
    diff = elo_h - elo_a
    p_h = 1 / (1 + 10**(-diff / 1200))   # base 1200 = mucho más aplanado
    return "h" if random() < p_h else "a"
```

### 3.4. Actualización del ELO durante la simulación

Cada simulación empieza con los ELO scrapeados de eloratings.net. **Dentro** de cada uno de los 10,000 Mundiales simulados, tras cada partido se actualizan los ELO según la fórmula de eloratings.net. Al final de esa simulación, los ELO se **resetean** al estado inicial para la siguiente iteración.

**Fórmula (eloratings.net):**

$$
R_{\text{new}} = R_{\text{old}} + K \cdot G \cdot (W - W_e)
$$

- **K = 60** para Copa del Mundo (fase final).
- **W** = 1 (victoria), 0.5 (empate), 0 (derrota).
- **W_e** = expected score actual = $1 / (1 + 10^{-(\Delta R + H)/400})$.
- **G** = factor por diferencia de goles:

$$
G = \begin{cases}
1 & \text{si } |\Delta g| \leq 1 \\
1.5 & \text{si } |\Delta g| = 2 \\
(11 + |\Delta g|)/8 & \text{si } |\Delta g| \geq 3
\end{cases}
$$

Es suma cero: lo que gana uno lo pierde el otro.

**Nota:** Esta actualización afecta partidos siguientes *dentro del mismo torneo simulado*. Es importante porque si Brasil sufre una derrota temprana, sus siguientes enfrentamientos hipotéticos lo reflejan. Pero esto NO contamina otras simulaciones.

### 3.5. Desempates de grupo

Implementar en el orden oficial FIFA 2026:

1. **Puntos totales** — directo.
2. **Diferencia de goles global** — directo.
3. **Goles a favor** — directo.
4. **Juego limpio (tarjetas)** — *no simulable*. Tratar todos los equipos como iguales (skip este paso).
5. **FIFA Ranking más reciente** — usar el ranking oficial a la fecha de corrida como dato estático.
6. **Sorteo** — `random.choice` si todo lo anterior falla.

Entre equipos de **distintos grupos** (ranking de terceros): mismos criterios, aplicados globalmente entre los 12 terceros.

```python
def rank_group(teams_with_stats) -> list[Team]:
    return sorted(
        teams_with_stats,
        key=lambda t: (
            -t.points,
            -t.goal_diff,
            -t.goals_for,
            # fair_play: skip
            -t.fifa_ranking_inverse,   # ranking más alto (número más chico) mejor
            random.random(),           # sorteo
        )
    )
```

### 3.6. Resolución del bracket R32 (Anexo C)

El Anexo C es una tabla de **495 filas** (combinaciones de 8 grupos de los que salen los terceros). Cada fila dice qué tercero enfrenta a 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L.

Encodificación en `data/bracket/annex_c.json`:

```json
[
  {
    "groups": ["E","F","G","H","I","J","K","L"],
    "matchups": {"1A": "3E", "1B": "3J", "1D": "3I", "1E": "3F",
                 "1G": "3H", "1I": "3G", "1K": "3L", "1L": "3K"}
  },
  {
    "groups": ["D","F","G","H","I","J","K","L"],
    "matchups": {"1A": "3H", "1B": "3G", "1D": "3I", "1E": "3D",
                 "1G": "3J", "1I": "3F", "1K": "3L", "1L": "3K"}
  },
  ...  // 493 más
]
```

**Generación:** Copiar la tabla de la sección correspondiente de la página Wikipedia del knockout stage (`2026_FIFA_World_Cup_knockout_stage`) o del Anexo C del reglamento oficial FIFA. Los datos ya fueron parseados; ver el script `scripts/parse_annex_c.py` que lee el HTML y produce el JSON.

**Lookup:**
```python
def resolve_r32_3rd_matchups(best_third_groups: set[str]) -> dict[str, str]:
    """best_third_groups: {'A','B','C','D','E','F','G','H'} (las 8 letras).
    Devuelve {'1A': '3C', '1B': '3D', ...}."""
    key = frozenset(best_third_groups)
    for entry in ANNEX_C:
        if frozenset(entry["groups"]) == key:
            return entry["matchups"]
    raise ValueError(f"Combinación no encontrada: {key}")
```

Los 4 matchups que NO involucran terceros son fijos:
- `Match 75: 1F vs 2C`, `Match 76: 1C vs 2F`, `Match 84: 1H vs 2J`, `Match 86: 1J vs 2H`.

Los 4 matchups de segundos contra segundos son fijos:
- `Match 73: 2A vs 2B`, `Match 78: 2E vs 2I`, `Match 83: 2K vs 2L`, `Match 88: 2D vs 2G`.

### 3.7. Bracket posterior (R16 → Final)

Es determinístico una vez resuelto el R32. Se encoda directamente como grafo de matches:

```python
BRACKET = {
    # Match_id: (winner_of_A, winner_of_B)
    89: (74, 77),  90: (73, 75),  91: (76, 78),  92: (79, 80),
    93: (83, 84),  94: (81, 82),  95: (86, 88),  96: (85, 87),
    # R16 → Cuartos
    97: (89, 90),  98: (93, 94),  99: (91, 92),  100: (95, 96),
    # Cuartos → Semis
    101: (97, 98), 102: (99, 100),
    # 3er lugar
    103: ("loser_101", "loser_102"),
    # Final
    104: (101, 102),
}
```

Verificar con el diagrama oficial de Wikipedia (`2026_FIFA_World_Cup_knockout_stage` sección "Bracket"). Los dos "pathways" mencionados (que separan a Spain vs Argentina y France vs England hasta la final) están implícitos en esta estructura.

---

## 4. Scraping de eloratings.net

### 4.1. Estrategia general

- **Respetuoso:** un User-Agent identificable, 1 req/seg como máximo, caché agresivo.
- **Fuente principal:** `https://www.eloratings.net/` (tabla principal).
- Detalles por equipo: `https://www.eloratings.net/{Country}` cuando sea necesario (fecha del último partido).

### 4.2. Lógica de actualización inteligente

El usuario pidió: *"verificar si algún ELO de selecciones que aún les quedan partidos (o la recién eliminada) ha cambiado".*

```python
# scraping/elo_scraper.py
def refresh_elo_if_needed(alive_teams: set[str], last_run: datetime) -> dict[str, int]:
    """
    alive_teams: equipos que siguen con partidos por jugar O recién eliminados.
    last_run: última vez que corrimos el simulador.

    Scraping solo necesario para equipos en alive_teams.
    Para los demás, usar valor cacheado (ya no afecta pronóstico).
    """
    cached = load_cache()
    updated = {}
    for team in alive_teams:
        scraped = scrape_team_elo(team)
        if scraped != cached.get(team):
            log.info(f"ELO de {team} cambió: {cached.get(team)} → {scraped}")
            updated[team] = scraped
        else:
            updated[team] = cached[team]
    # Equipos ya eliminados: congelar su ELO del último snapshot
    for team in ALL_48_TEAMS - alive_teams:
        updated[team] = cached.get(team, scrape_team_elo(team))
    save_cache(updated)
    return updated
```

### 4.3. Caché SQLite

Tabla `elo_snapshots`:

| column        | type    | notes                          |
|---------------|---------|--------------------------------|
| team_code     | TEXT    | "BRA", "ARG", ...              |
| elo           | INTEGER | Puntos ELO                     |
| fetched_at    | TEXT    | ISO 8601                       |
| last_match_at | TEXT    | Fecha del último partido real  |

Al correr el programa:
1. Consulta la última fila por equipo.
2. Si `alive` y ha pasado > 24h → re-scrape.
3. Si no cambió el ELO → actualiza timestamp, nada más.
4. Si cambió → registra nueva fila.

---

## 5. Flujo de ejecución completo

```
┌──────────────────────────────────────────────────────────────────┐
│  CLI: `worldcup-sim simulate --n 10000`                          │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │ 1. Determinar `alive_teams`           │
        │    (equipos con partidos restantes)   │
        └──────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │ 2. Scrapear/actualizar ELO            │
        │    (solo para alive_teams)            │
        │    → storage/cache/elo.sqlite         │
        └──────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │ 3. Cargar estado real del torneo:     │
        │    - resultados ya ocurridos           │
        │    - equipos ya eliminados            │
        └──────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │ 4. Loop × 10,000 (paralelo):          │
        │    a. Copiar ELOs a estado mutable    │
        │    b. Para cada partido pendiente:    │
        │       - simular (Dixon-Coles)         │
        │       - actualizar ELOs               │
        │    c. Calcular posiciones de grupo    │
        │    d. Rankear 12 terceros → 8 mejores │
        │    e. Resolver R32 con Anexo C        │
        │    f. Simular knockout                 │
        │    g. Registrar: pos_grupo, R32, R16, │
        │       QF, SF, Final, Campeón          │
        └──────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │ 5. Agregar resultados → probabilidades│
        └──────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │ 6. Exportar JSON + tabla Rich         │
        │    → storage/outputs/                 │
        └──────────────────────────────────────┘
```

**Paralelización:** Usar `multiprocessing.Pool` con `chunksize=100` o similar. Cada worker corre N/W simulaciones con seed distinto. Reducir con simple suma de contadores.

**Tiempo estimado:** 10,000 simulaciones, 48 equipos, ~104 partidos cada una ≈ 1-3 minutos en un laptop moderno con paralelización.

---

## 6. Outputs

### 6.1. Estructura del JSON de salida

```json
{
  "metadata": {
    "run_timestamp": "2026-04-21T12:34:56Z",
    "n_simulations": 10000,
    "elo_source_fetched_at": "2026-04-21T09:00:00Z",
    "parameters": {"mu": 1.25, "rho": -0.1, "K": 60, "HFA_full": 100}
  },
  "initial_elo": {"BRA": 2066, "ARG": 2151, ...},
  "teams": {
    "BRA": {
      "group": "C",
      "group_position_probs": {"1st": 0.58, "2nd": 0.28, "3rd": 0.10, "4th": 0.04},
      "advance_to_r32": 0.96,
      "advance_to_r16": 0.82,
      "advance_to_qf":  0.54,
      "advance_to_sf":  0.30,
      "advance_to_final": 0.18,
      "champion": 0.11,
      "expected_points_group": 6.8,
      "expected_goals_for_group": 7.2
    },
    "ARG": { ... },
    ...
  },
  "most_likely_final": [
    {"matchup": "Spain vs Argentina", "probability": 0.08},
    {"matchup": "Spain vs Brazil",    "probability": 0.05},
    ...
  ]
}
```

### 6.2. Output por consola (tabla Rich)

```
                   PROBABILIDADES MUNDIAL 2026
┌──────────┬───────┬────────┬────────┬────────┬────────┬────────┬─────────┐
│ Equipo   │ Grupo │ 1°     │ 2°     │ R16    │ QF     │ SF     │ Campeón │
├──────────┼───────┼────────┼────────┼────────┼────────┼────────┼─────────┤
│ España   │  H    │  62%   │  25%   │  88%   │  61%   │  38%   │  13%    │
│ Argentina│  J    │  70%   │  20%   │  92%   │  65%   │  42%   │  14%    │
│ ...                                                                     │
└──────────┴───────┴────────┴────────┴────────┴────────┴────────┴─────────┘
```

---

## 7. Consideraciones para el frontend (fase posterior)

Aunque ahora solo codificas backend, diseñar la API REST desde ya evita refactorizar:

### 7.1. Endpoints propuestos (FastAPI)

```
GET  /api/teams                      → lista de los 48 con ELO actual
GET  /api/groups                     → los 12 grupos
GET  /api/schedule                   → todos los partidos con fecha/sede
POST /api/simulate                   → corre N simulaciones (async)
     body: {"n_simulations": 10000, "refresh_elo": true}
     → {"job_id": "uuid"}
GET  /api/simulate/{job_id}          → estado + resultado cuando termine
GET  /api/probabilities/latest       → último output
GET  /api/teams/{code}/probabilities → detalle por equipo
```

### 7.2. WebSocket opcional

Para mostrar progreso de la simulación (`n_completed / n_total`) en tiempo real al usuario.

### 7.3. CORS y hosting

Configurar `CORSMiddleware` para permitir el origen del frontend. Desplegar con Uvicorn + reverse proxy.

---

## 8. Tests críticos a implementar

```python
# tests/test_elo.py
def test_elo_update_zero_sum():
    """Lo que gana un equipo lo pierde el otro."""
    r_h, r_a = 1800, 1700
    new_h, new_a = update_elo(r_h, r_a, score_h=1, goal_diff=1, hfa=0)
    assert abs((new_h - r_h) + (new_a - r_a)) < 1e-6

def test_elo_update_goal_diff_factor():
    """Diferencia de 3 goles → G = 14/8 = 1.75."""
    ...

# tests/test_annex_c.py
def test_annex_c_has_495_entries():
    assert len(ANNEX_C) == 495

def test_annex_c_keys_are_unique():
    keys = [frozenset(e["groups"]) for e in ANNEX_C]
    assert len(set(keys)) == 495

# tests/test_group_simulator.py
def test_tiebreakers_respect_order():
    """Dos equipos con igual puntaje pero distinta DG → DG decide."""
    ...

# tests/test_match_simulator.py
@hypothesis.given(elo_h=st.integers(1500, 2200), elo_a=st.integers(1500, 2200))
def test_match_probabilities_sum_to_one(elo_h, elo_a):
    p_h, p_d, p_a = compute_outcome_probs(elo_h, elo_a, hfa=0)
    assert abs(p_h + p_d + p_a - 1.0) < 1e-6

def test_higher_elo_more_likely_to_win():
    p_h1, _, _ = compute_outcome_probs(2000, 1800, hfa=0)
    p_h2, _, _ = compute_outcome_probs(2200, 1800, hfa=0)
    assert p_h2 > p_h1

# tests/test_tournament.py
def test_exactly_32_teams_advance_to_r32():
    result = simulate_tournament(elos, seed=42)
    assert len(result.round_of_32_teams) == 32

def test_one_champion():
    result = simulate_tournament(elos, seed=42)
    assert result.champion is not None
    assert len(result.final_four) == 4
```

---

## 9. Parámetros de configuración centralizados

En `config.py`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Modelo
    MU_GOALS: float = 1.25          # Media de goles por equipo en un Mundial
    RHO_DIXON_COLES: float = -0.1   # Corrección de dependencia
    K_FACTOR: int = 60              # Para update ELO (WC)
    HFA_FULL: float = 100.0         # Ventaja local completa
    HFA_STRONG_DIASPORA: float = 35.0
    HFA_MILD_DIASPORA: float = 15.0

    # Simulación
    N_SIMULATIONS: int = 10000
    N_WORKERS: int = 0               # 0 = usar todos los cores

    # Scraping
    ELO_URL: str = "https://www.eloratings.net/"
    SCRAPE_TIMEOUT_S: int = 30
    SCRAPE_RATE_LIMIT_S: float = 1.0
    USER_AGENT: str = "WorldCupSim/0.1 (educational; contact: ...)"

    # Paths
    CACHE_DIR: Path = Path("storage/cache")
    OUTPUT_DIR: Path = Path("storage/outputs")

    class Config:
        env_file = ".env"
```

**Ventaja:** todos los parámetros mágicos quedan en un solo lugar, y se puede overridear con variables de entorno para experimentación.

---

## 10. Checklist de implementación (orden sugerido)

1. [ ] Crear estructura de directorios + `pyproject.toml` + `uv venv`.
2. [ ] Encodar los 48 equipos, 12 grupos, 16 sedes en `data/`.
3. [ ] Parsear Anexo C (495 combinaciones) desde el HTML de Wikipedia → `annex_c.json`.
4. [ ] Encodar el bracket post-R32 en `bracket/r16_to_final.py`.
5. [ ] Implementar scraper de eloratings.net + caché SQLite. Verificar con los 48 equipos.
6. [ ] Implementar `core/elo.py` (cálculo W_e, factor G, update). Tests.
7. [ ] Implementar `core/home_advantage.py`. Tests.
8. [ ] Implementar `core/match_simulator.py` (Dixon-Coles). Tests estadísticos con Hypothesis.
9. [ ] Implementar `core/group_simulator.py` con tiebreakers FIFA 2026. Tests.
10. [ ] Implementar `core/third_place_ranker.py`. Tests.
11. [ ] Implementar `core/bracket_builder.py` (resolver Anexo C). Tests con las 495 combinaciones.
12. [ ] Implementar `core/knockout.py` (con prórroga + penales). Tests.
13. [ ] Implementar `core/tournament.py` (orquestador). Test end-to-end.
14. [ ] Implementar `simulation/runner.py` con multiprocessing. Benchmark de rendimiento.
15. [ ] Implementar `simulation/aggregator.py` y `analysis/reports.py`.
16. [ ] CLI con Typer. Output con Rich.
17. [ ] (Después) FastAPI stubs para endpoints clave.

---

## 11. Pendientes y riesgos documentados

- **Calibración de μ y ρ:** los valores propuestos son razonables pero idealmente deberían calibrarse con datos de los últimos 3-5 Mundiales. Si tienes datos, incluir un script `scripts/calibrate.py` que ajuste por verosimilitud máxima.
- **Anexo C:** Si el parsing de Wikipedia arroja inconsistencias, contrastar con el PDF oficial del reglamento FIFA (`FIFA World Cup 26 Competition Regulations`).
- **Juego limpio (tiebreak #4):** no simulable; aceptar que puede haber un ínfimo sesgo vs. realidad.
- **Equipos "alive" al inicio:** antes del 11 de junio, **todos** los 48 están vivos. Después, el set se reduce.
- **Bordes del home advantage:** las reglas de diáspora son juicios editoriales; documentar claramente y permitir que el usuario final los modifique vía `.env`.
- **Reproducibilidad:** fijar semilla por defecto (`seed=42`), pero permitir override.
- **ELO scraping:** respetar rate limits. Si eloratings.net cambia su HTML, el scraper se romperá; tener tests de smoke.

---

## 12. Resumen de decisiones clave

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Modelo de resultado | Dixon-Coles + doble Poisson | Produce empates y goles naturalmente, consistente con ELO |
| Lambda goles | $\lambda = \mu \cdot 10^{\pm(\Delta R + H)/800}$ | Consistente con ELO base 10 |
| μ | 1.25 goles/equipo | Media histórica Mundiales |
| ρ (Dixon-Coles) | -0.1 | Valor estándar de literatura |
| Home advantage | 100 ELO (completa), 35 (diáspora fuerte), 15 (moderada) | Estándar eloratings.net + juicio |
| Update ELO | Fórmula eloratings.net, K=60 | Oficial de la fuente |
| Desempate grupos | Orden FIFA oficial | Regla estricta del torneo |
| Anexo C | 495 combinaciones como JSON | Regla estricta FIFA |
| Penales | Levemente ponderado por ELO (base 1200) | Realismo moderado |
| N simulaciones | 10,000 | Requerimiento |
| Paralelización | multiprocessing.Pool | Eficiencia |
| Entorno virtual | uv + pyproject.toml | Moderno, rápido |
| API para frontend | FastAPI | Ecosistema Python estándar |

---

**Fin del documento de arquitectura.**
Pegar este documento completo como contexto en Antigravity y pedirle a Gemini 3.1 Flash que implemente módulo por módulo, empezando por `data/` y `core/elo.py`.
