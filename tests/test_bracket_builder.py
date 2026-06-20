import pytest
import json
from worldcup_sim.core.bracket_builder import resolve_r32_3rd_matchups, build_r32_bracket, load_annex_c
from worldcup_sim.data.bracket.r32_skeleton import R32_MATCHES

def test_rule_108():
    """
    Test Rule 108: When third-placed teams advance from groups B, C, E, F, G, H, I, K
    Expected assignments according to the user's truth matrix:
    1A -> 3E
    1B -> 3G
    1D -> 3B
    1E -> 3C
    1G -> 3H
    1I -> 3F
    1K -> 3I
    1L -> 3K
    """
    thirds_set = {'B', 'C', 'E', 'F', 'G', 'H', 'I', 'K'}
    resolved = resolve_r32_3rd_matchups(thirds_set)
    
    assert resolved['1A'] == '3E'
    assert resolved['1B'] == '3G'
    assert resolved['1D'] == '3B'
    assert resolved['1E'] == '3C'
    assert resolved['1G'] == '3H'
    assert resolved['1I'] == '3F'
    assert resolved['1K'] == '3I'
    assert resolved['1L'] == '3K'

def test_rule_116():
    """
    Test Rule 116: When third-placed teams advance from groups A, C, D, E, H, I, J, K
    We can verify the assignment matches what is present in annex_c.json for these groups.
    """
    thirds_set = {'A', 'C', 'D', 'E', 'H', 'I', 'J', 'K'}
    resolved = resolve_r32_3rd_matchups(thirds_set)
    
    # We don't have the exact screenshot text for 116, but we can verify it returns 8 unique mappings
    assert len(resolved) == 8
    # Validate the assigned thirds are exactly the ones provided in thirds_set
    assigned_thirds = {val[-1] for val in resolved.values()}
    assert assigned_thirds == thirds_set

def test_all_495_combinations():
    """
    Test that every single one of the 495 combinations in Annex C is structurally valid:
    - Returns exactly 8 wildcard matchups.
    - Uses exactly the 8 third-place teams specified.
    - No two group winners play the same third-place team.
    """
    annex = load_annex_c()
    assert len(annex) == 495, "El Anexo C debe contener exactamente 495 combinaciones"
    
    expected_wildcard_homes = {'1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'}
    
    for combo in annex:
        groups = combo['groups']
        thirds_set = set(groups)
        
        resolved = resolve_r32_3rd_matchups(thirds_set)
        
        # 1. Exact 8 wildcard matchups
        assert set(resolved.keys()) == expected_wildcard_homes
        
        # 2. Uses exactly the 8 third-place teams specified
        assigned_thirds = {val[-1] for val in resolved.values()}
        assert assigned_thirds == thirds_set

def test_build_r32_bracket_structural_integrity():
    """
    Test that build_r32_bracket creates a perfectly valid bracket (no team duplicates, 16 matches).
    """
    # Mock some teams
    group_winners = {f"1{c}": f"W_{c}" for c in "ABCDEFGHIJKL"}
    runners_up = {f"2{c}": f"R_{c}" for c in "ABCDEFGHIJKL"}
    # Pick arbitrary 8 third places (e.g. from groups A, B, C, D, E, F, G, H)
    third_places = {f"3{c}": f"T_{c}" for c in "ABCDEFGH"}
    
    matches = build_r32_bracket(group_winners, runners_up, third_places)
    
    # 1. 16 matches
    assert len(matches) == 16
    
    # 2. 32 unique teams playing
    teams_playing = set()
    for match_id, (home, away) in matches.items():
        assert home not in teams_playing, f"Team {home} is playing twice!"
        teams_playing.add(home)
        assert away not in teams_playing, f"Team {away} is playing twice!"
        teams_playing.add(away)
        
    assert len(teams_playing) == 32
