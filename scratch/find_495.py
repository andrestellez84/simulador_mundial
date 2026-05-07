from bs4 import BeautifulSoup
import re

with open('scratch/wiki.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

tables = soup.find_all('table')
print(f"Total tables: {len(tables)}")

for i, table in enumerate(tables):
    rows = table.find_all('tr')
    # The official table has 495 rows (plus headers).
    if 490 < len(rows) < 500:
        print(f"Found table {i} with {len(rows)} rows!")
        # Print headers
        headers = [th.text.strip() for th in rows[0].find_all(['th', 'td'])]
        print("Headers:", headers)
        
        # Find the row for BCEFGHIK
        for r in rows:
            cols = [c.text.strip().replace(" ", "") for c in r.find_all(['td', 'th'])]
            if cols and cols[0] == 'BCEFGHIK':
                print("FOUND BCEFGHIK:", cols)
