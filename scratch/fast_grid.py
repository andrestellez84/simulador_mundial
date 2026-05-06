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

def run_experiment(mu, elo_den, rho, num_matches=10000):
    elo_diffs = np.random.normal(0, 200, num_matches)
    
    total_goals = 0
    draws = 0
    scores = Counter()
    
    for diff in elo_diffs:
        lam_h = mu * (10 ** (diff / elo_den))
        lam_a = mu * (10 ** (-diff / elo_den))
        
        max_tau = 1 + abs(rho) * max(lam_h, lam_a, 1.0)
        
        # fast rejection sampling
        while True:
            x = np.random.poisson(lam_h)
            y = np.random.poisson(lam_a)
            tau = tau_dixon_coles(x, y, lam_h, lam_a, rho)
            if random.random() < (tau / max_tau):
                total_goals += x + y
                score_str = f"{max(x,y)}-{min(x,y)}"
                scores[score_str] += 1
                if x == y: draws += 1
                break

    avg_goals = total_goals / num_matches
    draw_pct = draws / num_matches * 100
    p_0_0 = scores['0-0'] / num_matches * 100
    p_1_1 = scores['1-1'] / num_matches * 100
    p_1_0 = scores['1-0'] / num_matches * 100
    p_2_1 = scores['2-1'] / num_matches * 100
    p_2_0 = scores['2-0'] / num_matches * 100
    p_3_1 = scores['3-1'] / num_matches * 100
    p_3_0 = scores['3-0'] / num_matches * 100
    
    error = (
        abs(avg_goals - 2.83) * 50 +
        abs(draw_pct - 22.2) * 5 +
        abs(p_0_0 - 8.1) * 3 +
        abs(p_1_1 - 9.5) * 3 +
        abs(p_1_0 - 18.9) * 2 +
        abs(p_2_1 - 15.8) * 2 +
        abs(p_2_0 - 11.5) * 2 +
        abs(p_3_1 - 7.1) * 1 +
        abs(p_3_0 - 5.9) * 1
    )
    return error, (avg_goals, draw_pct, p_0_0, p_1_1, p_1_0, p_2_1, p_2_0, p_3_1, p_3_0)

best_err = float('inf')
best_params = None
best_stats = None

import sys

for mu in [1.3, 1.35, 1.4]:
    for elo_den in [1000.0, 1200.0, 1500.0]:
        for rho in [-0.15, 0.0, 0.15]:
            err, stats = run_experiment(mu, elo_den, rho)
            if err < best_err:
                best_err = err
                best_params = (mu, elo_den, rho)
                best_stats = stats
                print(f"New Best: {best_params} -> {err:.2f}", flush=True)

print(f"FINAL BEST: {best_params}", flush=True)
print(f"Stats: Goals={best_stats[0]:.2f}, Draw%={best_stats[1]:.1f}%, 0-0={best_stats[2]:.1f}%, 1-1={best_stats[3]:.1f}%, 1-0={best_stats[4]:.1f}%, 2-1={best_stats[5]:.1f}%, 2-0={best_stats[6]:.1f}%, 3-1={best_stats[7]:.1f}%, 3-0={best_stats[8]:.1f}%", flush=True)
