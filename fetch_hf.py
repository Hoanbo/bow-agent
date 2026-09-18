import urllib.request
import json
import re

url = "https://huggingface.co/quangdung/Piper_checkpoint"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print(f"Status: {response.status}, HTML length: {len(html)}")
        # Look for mp3 links or voice names
        mp3s = re.findall(r'href=["\']([^"\']+\.mp3[^"\']*)["\']', html)
        print("Found MP3 links in HTML:", set(mp3s))
        # Look for voice names mentioned in the prompt
        names = ["Bảo Hân", "Châu Anh", "Chi Nguyễn", "Gia Hiếu", "Lọ Lem", "Mai Linh", "Nguyễn Hiếu", "Nhật"]
        for name in names:
            if name.lower() in html.lower():
                print(f"Found name: {name}")
except Exception as e:
    print(f"Error fetching {url}: {e}")
