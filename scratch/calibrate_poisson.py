import numpy as np
import random
from collections import Counter

def tau_dixon_coles(x, y, lam_h, lam_a, rho):
    if x == 0 and y == 0:
        return max(0.0, 1.0 - lam_h * lam_a * rho)
    elif x == 0 and y == 1:
        return max(0.0, 1.0 + lam_h * rho)
    elif x == 1 and y == 0:
        return max(0.0, 1.0 + lam_a * rho)
    elif x == 1 and y == 1:
        return max(0.0, 1.0 - rho)
    else:
        return 1.0

def simulate_match_exact(lam_h, lam_a, rho):
    max_tau = 1 + abs(rho) * max(lam_h, lam_a, 1.0) 
    while True:
        x = np.random.poisson(lam_h)
        y = np.random.poisson(lam_a)
        tau = tau_dixon_coles(x, y, lam_h, lam_a, rho)
        if random.random() < (tau / max_tau):
            return int(x), int(y)

def run_experiment(mu, elo_den, rho, num_matches=100000):
    # Simulate typical ELO diffs in a World Cup
    # World Cup teams range roughly from 1400 to 2100 ELO.
    # Diff distribution is roughly normal with mean=0 (random pairing) and std=200
    elo_diffs = np.random.normal(0, 200, num_matches)
    
    total_goals = 0
    draws = 0
    wins = 0
    
    draw_goals = 0
    win_goals = 0
    winner_goals = 0
    loser_goals = 0
    
    scores = Counter()
    
    for diff in elo_diffs:
        # Randomly assign home/away advantage = 0 for neutral
        lam_h = mu * (10 ** (diff / elo_den))
        lam_a = mu * (10 ** (-diff / elo_den))
        
        x, y = simulate_match_exact(lam_h, lam_a, rho)
        
        total_goals += x + y
        
        score_str = f"{max(x,y)}-{min(x,y)}"
        scores[score_str] += 1
        
        if x == y:
            draws += 1
            draw_goals += x + y
        else:
            wins += 1
            win_goals += x + y
            winner_goals += max(x, y)
            loser_goals += min(x, y)
            
    print(f"--- Params: MU={mu}, DENOM={elo_den}, RHO={rho} ---")
    print(f"Avg Goals: {total_goals / num_matches:.2f}")
    print(f"Draw%: {draws / num_matches * 100:.1f}%")
    if draws > 0:
        print(f"Avg Draw Goals: {draw_goals / draws:.2f}")
        print(f"  0-0 %: {scores['0-0'] / num_matches * 100:.1f}%")
        print(f"  1-1 %: {scores['1-1'] / num_matches * 100:.1f}%")
        print(f"  2-2 %: {scores['2-2'] / num_matches * 100:.1f}%")
    if wins > 0:
        print(f"Avg Win Goals: {win_goals / wins:.2f} ({winner_goals/wins:.2f} - {loser_goals/wins:.2f})")
        print(f"  1-0 %: {scores['1-0'] / num_matches * 100:.1f}%")
        print(f"  2-1 %: {scores['2-1'] / num_matches * 100:.1f}%")
        print(f"  2-0 %: {scores['2-0'] / num_matches * 100:.1f}%")
        print(f"  3-1 %: {scores['3-1'] / num_matches * 100:.1f}%")
        print(f"  3-0 %: {scores['3-0'] / num_matches * 100:.1f}%")
    print()

run_experiment(mu=1.35, elo_den=1500.0, rho=0.1) # Current baseline
run_experiment(mu=1.2, elo_den=1500.0, rho=-0.1)
run_experiment(mu=1.25, elo_den=1200.0, rho=0.2)
run_experiment(mu=1.3, elo_den=1000.0, rho=-0.05)
