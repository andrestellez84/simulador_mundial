import httpx

def main():
    try:
        r = httpx.get("https://www.eloratings.net/2026_results.tsv")
        if r.status_code == 200:
            with open("storage/2026_results.tsv", "w", encoding="utf-8") as f:
                f.write(r.text)
            print("Saved 2026_results.tsv")
    except Exception as e:
        print(e)
        
    try:
        r = httpx.get("https://www.eloratings.net/latest.tsv")
        if r.status_code == 200:
            with open("storage/latest.tsv", "w", encoding="utf-8") as f:
                f.write(r.text)
            print("Saved latest.tsv")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    main()
