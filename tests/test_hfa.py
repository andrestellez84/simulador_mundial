import pytest
from worldcup_sim.core.home_advantage import get_net_hfa

def test_get_net_hfa():
    # Match 1: Estadio Azteca, Mexico City -> venue key: mexico_city
    # Mexico (MEX) vs anyone
    # Expected: 100 - 0 = 100
    assert get_net_hfa(1, "MEX", "ARG") == 100.0 - 15.0
    assert get_net_hfa(1, "ARG", "MEX") == 15.0 - 100.0
    
    # Match 9: SoFi Stadium, Inglewood -> venue key: los_angeles
    # USA: 100, MEX: 35, KOR: 35, ARG: 15
    assert get_net_hfa(9, "MEX", "KOR") == 35.0 - 35.0
    assert get_net_hfa(9, "USA", "MEX") == 100.0 - 35.0
    
    # Match 7: BMO Field, Toronto -> venue key: toronto
    # CAN: 100, POR: 15, CRO: 15
    assert get_net_hfa(7, "CAN", "POR") == 100.0 - 15.0
    
    # Match 14: Gillette Stadium, Foxborough -> boston
    # POR: 35, CPV: 35, BRA: 35, HAI: 15
    assert get_net_hfa(14, "POR", "HAI") == 35.0 - 15.0
    
    # Unknown match
    assert get_net_hfa(999, "MEX", "ARG") == 0.0
