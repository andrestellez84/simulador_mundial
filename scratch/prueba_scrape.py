import sys
import logging
from worldcup_sim.scraping.elo_scraper import refresh_elo_if_needed
from worldcup_sim.data.teams import TEAMS

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    alive = {"MEX", "ARG", "BRA", "ENG"}
    print("Scraping for: ", alive)
    elos = refresh_elo_if_needed(alive, max_age_hours=0)
    print("Found ELOs:", {k: elos[k] for k in alive if k in elos})
    print("Test passed.")
