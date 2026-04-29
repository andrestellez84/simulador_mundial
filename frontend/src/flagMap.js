export const FLAG_MAP = {
    "MEX": "mx", "RSA": "za", "KOR": "kr", "CZE": "cz",
    "CAN": "ca", "BIH": "ba", "QAT": "qa", "SUI": "ch",
    "BRA": "br", "MAR": "ma", "HAI": "ht", "SCO": "gb-sct",
    "USA": "us", "PAR": "py", "CIV": "ci", "ECU": "ec",
    "ARG": "ar", "AUS": "au", "TUN": "tn", "ESP": "es",
    "SRB": "rs", "JPN": "jp", "PER": "pe", "BEL": "be",
    "SEN": "sn", "NZL": "nz", "ENG": "gb-eng", "URU": "uy",
    "VEN": "ve", "CPV": "cv", "GER": "de", "PAN": "pa",
    "NGA": "ng", "CHI": "cl", "COL": "co", "ITA": "it",
    "CRC": "cr", "ALG": "dz", "FRA": "fr", "HON": "hn",
    "GHA": "gh", "NED": "nl", "POR": "pt", "EGY": "eg",
    "IRQ": "iq", "COD": "cd", "SWE": "se", "TUR": "tr", 
    "UZB": "uz", "JOR": "jo", "CUW": "cw", "IRN": "ir",
    "KSA": "sa", "NOR": "no", "AUT": "at", "CRO": "hr"
};

export function getFlagUrl(teamCode) {
    const iso2 = FLAG_MAP[teamCode] || "un";
    return `https://flagcdn.com/w40/${iso2}.png`;
}
