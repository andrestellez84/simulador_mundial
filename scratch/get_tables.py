import pandas as pd
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
tables = pd.read_html(url, match="Match")

for i, df in enumerate(tables):
    if "Match" in df.columns and "Group" in df.columns:
        print(f"Table {i} has Match and Group columns!")
        df.to_csv(f"scratch/table_{i}.csv", index=False)
