import pandas as pd
import ssl
import urllib.request

ssl._create_default_https_context = ssl._create_unverified_context
url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read()

tables = pd.read_html(html)

for i, df in enumerate(tables):
    # Try to find a table that contains Match schedule
    # It might have columns like "Match", "Date", "Time", "Group"
    col_str = " ".join(str(c) for c in df.columns).lower()
    if 'match' in col_str and 'group' in col_str:
        df.to_csv(f'scratch/schedule_table.csv', index=False, encoding='utf-8')
        print("Found schedule table!")
        break
