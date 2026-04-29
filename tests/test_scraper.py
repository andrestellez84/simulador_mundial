import pytest
from unittest.mock import patch, MagicMock
from worldcup_sim.scraping.elo_scraper import parse_eloratings_table

MOCK_TSV = "1\\t1\\tBR\\t2100\\n2\\t2\\tMX\\t1800\\n"

def test_parse_eloratings_table():
    elos = parse_eloratings_table(MOCK_TSV)
    
    assert "BRA" in elos
    assert elos["BRA"] == 2100
    
    assert "MEX" in elos
    assert elos["MEX"] == 1800
    
    # Un equipo inexistente no debe estar
    assert "ARG" not in elos
