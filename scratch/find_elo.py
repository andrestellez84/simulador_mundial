import httpx
import re

def main():
    resp = httpx.get('https://www.eloratings.net/en.eloratings.net')
    print("en.eloratings.net:", repr(resp.content[:500]))
    
    resp2 = httpx.get('https://www.eloratings.net/')
    print("HTML script tags:", re.findall(r'<script[^>]*src="([^"]+)"', resp2.text))
    
if __name__ == '__main__':
    main()
