import pandas as pd
import ssl
import urllib.request

ssl._create_default_https_context = ssl._create_unverified_context
url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read()

tables = pd.read_html(html)

for i, df in enumerate(tables):
    if len(df) > 50:
        print(f"Table {i} has {len(df)} rows. Columns: {df.columns.tolist()}")
        if 'Match' in df.columns or len(df) == 104 or len(df) == 72:
            df.to_csv(f'scratch/table_{i}.csv', index=False, encoding='utf-8')
