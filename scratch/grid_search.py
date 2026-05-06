import numpy as np
import random
from collections import Counter
import math

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

def run_experiment(mu, elo_den, rho, num_matches=25000):
    elo_diffs = np.random.normal(0, 200, num_matches)
    
    total_goals = 0
    draws = 0
    wins = 0
    
    scores = Counter()
    
    for diff in elo_diffs:
        lam_h = mu * (10 ** (diff / elo_den))
        lam_a = mu * (10 ** (-diff / elo_den))
        
        x, y = simulate_match_exact(lam_h, lam_a, rho)
        
        total_goals += x + y
        score_str = f"{max(x,y)}-{min(x,y)}"
        scores[score_str] += 1
        
        if x == y:
            draws += 1
        else:
            wins += 1
            
    avg_goals = total_goals / num_matches
    draw_pct = draws / num_matches * 100
    
    p_0_0 = scores['0-0'] / num_matches * 100
    p_1_1 = scores['1-1'] / num_matches * 100
    p_1_0 = scores['1-0'] / num_matches * 100
    p_2_1 = scores['2-1'] / num_matches * 100
    p_2_0 = scores['2-0'] / num_matches * 100
    p_3_1 = scores['3-1'] / num_matches * 100
    p_3_0 = scores['3-0'] / num_matches * 100
    
    # Target values
    error = 0
    error += abs(avg_goals - 2.83) * 50
    error += abs(draw_pct - 22.2) * 5
    error += abs(p_0_0 - 8.1) * 3
    error += abs(p_1_1 - 9.5) * 3
    error += abs(p_1_0 - 18.9) * 2
    error += abs(p_2_1 - 15.8) * 2
    error += abs(p_2_0 - 11.5) * 2
    error += abs(p_3_1 - 7.1) * 1
    error += abs(p_3_0 - 5.9) * 1
    
    return error, (avg_goals, draw_pct, p_0_0, p_1_1, p_1_0, p_2_1, p_2_0, p_3_1, p_3_0)

best_err = float('inf')
best_params = None
best_stats = None

for mu in np.arange(1.3, 1.45, 0.02):
    for elo_den in np.arange(1000.0, 1800.0, 100.0):
        for rho in np.arange(-0.15, 0.05, 0.02):
            err, stats = run_experiment(mu, elo_den, rho)
            if err < best_err:
                best_err = err
                best_params = (mu, elo_den, rho)
                best_stats = stats
                print(f"New Best! MU={mu:.2f}, DEN={elo_den}, RHO={rho:.2f} -> Err: {err:.2f}")

print("FINAL BEST:", best_params)
print("Stats:", best_stats)
