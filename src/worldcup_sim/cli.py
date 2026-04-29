import typer
from rich.console import Console
from rich.table import Table

from worldcup_sim.config import config
from worldcup_sim.scraping.elo_scraper import refresh_elo_if_needed
from worldcup_sim.data.teams import TEAMS
from worldcup_sim.simulation.runner import run_simulations_parallel
from worldcup_sim.simulation.aggregator import aggregate_tournament_results
from worldcup_sim.analysis.reports import export_json_report

app = typer.Typer(help="World Cup 2026 Probabilistic Simulator")
console = Console()

@app.command()
def simulate(
    n: int = typer.Option(config.N_SIMULATIONS, "--n", "-n", help="Número de simulaciones"),
    refresh_elo: bool = typer.Option(True, "--refresh-elo", help="Hacer fetch a eloratings.net"),
    workers: int = typer.Option(config.N_WORKERS, help="Num procesos paralelos. 0=Automático"),
):
    """
    Ejecuta el bloque completo de simulación de N mundiales.
    """
    console.print(f"[bold blue]Inicializando simulador para {n} iteraciones...[/bold blue]")
    
    # 1. Obtener ELOs
    alive_teams = set(TEAMS.keys())  # Por ahora asumimos todos vivos si corremos antes del torneo
    if refresh_elo:
        console.print("[yellow]Buscando Elos actualizados...[/yellow]")
        
    initial_elos = refresh_elo_if_needed(alive_teams, max_age_hours=24 if refresh_elo else 999999)
    
    # Mostrar pequeños sanity checks
    console.print(f"[green]Elo de MEX: {initial_elos.get('MEX')}[/green]")
    console.print(f"[green]Elo de ARG: {initial_elos.get('ARG')}[/green]")
    
    # 2. Correr
    console.print(f"[bold cyan]Corriendo {n} mundiales paralelos...[/bold cyan]")
    raw_results = run_simulations_parallel(initial_elos, n=n, num_workers=workers)
    
    # 3. Aggregator
    console.print("[yellow]Agregando datos probabilísticos...[/yellow]")
    agg_res = aggregate_tournament_results(raw_results, n)
    
    # 4. JSON
    filepath = export_json_report(agg_res, initial_elos)
    console.print(f"[bold green]Reporte guardado en: {filepath}[/bold green]")
    
    # 5. Output con Rich
    console.print("\n[bold magenta]Top 15 Favoritos para Ganar:[/bold magenta]")
    
    # Ordenar por probabilidad de salir campeón
    sorted_teams = sorted(agg_res.teams.values(), key=lambda t: t.champion, reverse=True)
    
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Equipo", style="dim", width=12)
    table.add_column("Grupo", justify="center")
    table.add_column("1° Grupo", justify="right")
    table.add_column("2° Grupo", justify="right")
    table.add_column("R16", justify="right")
    table.add_column("QF", justify="right")
    table.add_column("SF", justify="right")
    table.add_column("Final", justify="right")
    table.add_column("Campeón", justify="right", style="bold green")
    
    for i in range(min(15, len(sorted_teams))):
        team_data = sorted_teams[i]
        grp = team_data.group
        name = TEAMS[team_data.team_code].name
        
        p1 = f"{team_data.group_position_probs['1st']*100:.1f}%"
        p2 = f"{team_data.group_position_probs['2nd']*100:.1f}%"
        r16 = f"{team_data.advance_to_r16*100:.1f}%"
        qf = f"{team_data.advance_to_qf*100:.1f}%"
        sf = f"{team_data.advance_to_sf*100:.1f}%"
        f = f"{team_data.advance_to_final*100:.1f}%"
        cup = f"{team_data.champion*100:.1f}%"
        
        table.add_row(name, grp, p1, p2, r16, qf, sf, f, cup)
        
    console.print(table)
    
    # Most likely finals
    console.print("\n[bold yellow]Finales más probables:[/bold yellow]")
    for matchup in agg_res.most_likely_final[:3]:
        console.print(f"- {matchup['matchup']}: {matchup['probability']*100:.2f}%")

if __name__ == "__main__":
    app()
