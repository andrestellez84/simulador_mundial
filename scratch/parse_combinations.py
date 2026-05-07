from bs4 import BeautifulSoup

with open('scratch/wiki.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

# Find the "Combinations of matches in the Round of 32" table
table = soup.find(lambda tag: tag.name == 'table' and '1A' in tag.text and '1B' in tag.text and '1D' in tag.text)

if table:
    rows = table.find_all('tr')
    for row in rows[2:]: # skip headers
        cols = [c.text.strip() for c in row.find_all(['td', 'th'])]
        if not cols: continue
        
        groups_str = cols[0].replace(' ', '')
        if set(groups_str) == set(['B', 'C', 'E', 'F', 'G', 'H', 'I', 'K']):
            print("FOUND COMBINATION in Wikipedia!")
            print(groups_str)
            print("Assignments for 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L:")
            print(cols[1:])
else:
    print("Table not found")
