import multiprocessing
from typing import Dict
from ..core.tournament import WorldCupSimulation

def _run_single_simulation(initial_elos: Dict[str, float], live_results: Dict, seed: int):
    # Set the random seed per worker strictly if needed
    import random
    import numpy as np
    
    # Randomness depends on process, but passing a seed helps.
    random.seed(seed)
    np.random.seed(seed)
    
    sim = WorldCupSimulation(initial_elos, live_results=live_results)
    return sim.simulate()

import concurrent.futures
import time

def run_simulations_parallel(initial_elos: Dict[str, float], n: int, num_workers: int = 0, live_results: Dict = None, progress_callback = None):
    """
    Ejecuta múltiples simulaciones en paralelo usando ProcessPoolExecutor.
    """
    from rich.progress import Progress
    
    if num_workers <= 0:
        import os
        num_workers = os.cpu_count() or 4
        
    results = []
    
    base_seed = int(time.time()) % (2**31 - 1)
    args = [(initial_elos, live_results or {}, base_seed + i) for i in range(n)]
    
    with Progress() as progress_bar:
        task = progress_bar.add_task("[green]Simulando torneos...", total=n)
        
        with concurrent.futures.ProcessPoolExecutor(max_workers=num_workers) as executor:
            # Enviar todas las tareas
            futures = [executor.submit(_run_single_simulation, *arg) for arg in args]
            
            # Recolectar a medida que terminen iterativamente
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
                progress_bar.update(task, advance=1)
                
                if progress_callback:
                    # Update sólo en percent steps para no sobrecargar el assign
                    if len(results) % max(1, n // 100) == 0 or len(results) == n:
                        progress_callback((len(results) / n) * 98.0) # Deja un 2% para aggregator
                
    return results
