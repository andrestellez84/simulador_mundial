import urllib.request
from bs4 import BeautifulSoup
import re
import json

url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
html = urllib.request.urlopen(req).read()
soup = BeautifulSoup(html, 'html.parser')

results = []

# Find all football boxes
for box in soup.find_all('div', class_='footballbox'):
    date_el = box.find('div', class_='fdate')
    time_el = box.find('div', class_='ftime')
    home_el = box.find('th', class_='fhome')
    away_el = box.find('th', class_='faway')
    
    if not (date_el and time_el and home_el and away_el):
        continue
        
    date_str = date_el.text.strip()
    time_str = time_el.text.strip()
    home_str = home_el.text.strip()
    away_str = away_el.text.strip()
    
    results.append({
        'date': date_str,
        'time': time_str,
        'home': home_str,
        'away': away_str
    })

with open('scratch/wiki_parsed_teams.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(f"Dumped {len(results)} matches.")
