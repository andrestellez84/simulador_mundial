# Grafo de la fase final determinístico
BRACKET = {
    # Match_id: (winner_of_A, winner_of_B)
    # R16
    89: (74, 77),
    90: (73, 75),
    91: (76, 78),
    92: (79, 80),
    93: (83, 84),
    94: (81, 82),
    95: (86, 88),
    96: (85, 87),
    
    # R16 -> Cuartos
    97: (89, 90),
    98: (93, 94),
    99: (91, 92),
    100: (95, 96),
    
    # Cuartos -> Semis
    101: (97, 98),
    102: (99, 100),
    
    # 3er lugar
    103: ("loser_101", "loser_102"),
    
    # Final
    104: (101, 102),
}
