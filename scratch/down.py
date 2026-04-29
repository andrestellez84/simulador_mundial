import httpx

with open('scratch/ratings.js', 'wb') as f:
    f.write(httpx.get('https://www.eloratings.net/scripts/ratings.js').content)

with open('scratch/World.tsv', 'wb') as f:
    f.write(httpx.get('https://www.eloratings.net/World.tsv').content)

print("Downloaded")
