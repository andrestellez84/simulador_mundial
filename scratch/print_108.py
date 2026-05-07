from bs4 import BeautifulSoup
import re

with open('scratch/wiki.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

table = soup.find_all('table')[108]
rows = table.find_all('tr')

for r in rows[1:]:
    cols = [c.text.strip().replace(" ", "").replace('\n', '') for c in r.find_all(['td', 'th'])]
    if not cols: continue
    
    if cols[0] == '108':
        print("ROW 108:")
        print("Groups:", cols[1])
        print("Assignments:", cols[2:])
        
    if cols[1] == 'BCEFGHIK':
        print("ROW FOR BCEFGHIK:")
        print("No:", cols[0])
        print("Assignments:", cols[2:])
