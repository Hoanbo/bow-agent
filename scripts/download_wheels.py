import urllib.request
import json
import os
import sys

def download_pypi_pkg(pkg_name, target_dir):
    os.makedirs(target_dir, exist_ok=True)
    api_url = f"https://pypi.org/pypi/{pkg_name}/json"
    print(f"Querying PyPI for {pkg_name}...")
    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode('utf-8'))
    
    urls = data.get('urls', [])
    win_wheel = None
    for u in urls:
        filename = u['filename']
        if 'win_amd64' in filename and ('cp39-abi3' in filename or 'cp312' in filename or 'py3' in filename):
            win_wheel = u
            break
        if filename.endswith('py3-none-any.whl'):
            win_wheel = u
    
    if not win_wheel:
        for u in urls:
            if 'win_amd64' in u['filename']:
                win_wheel = u
                break
                
    if not win_wheel:
        raise Exception(f"No suitable wheel found for {pkg_name}")
        
    whl_url = win_wheel['url']
    whl_filename = win_wheel['filename']
    dest = os.path.join(target_dir, whl_filename)
    
    if os.path.exists(dest) and os.path.getsize(dest) == win_wheel['size']:
        print(f"Already downloaded: {whl_filename} ({win_wheel['size']} bytes)")
        return dest
        
    print(f"Downloading {whl_filename} ({win_wheel['size']} bytes)...")
    req_whl = urllib.request.Request(whl_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_whl) as resp, open(dest, 'wb') as out_f:
        downloaded = 0
        total = win_wheel['size']
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out_f.write(chunk)
            downloaded += len(chunk)
            print(f"\rDownloaded {downloaded}/{total} bytes ({(downloaded/total)*100:.1f}%)", end="")
    print(f"\nFinished {whl_filename}")
    return dest

dest_dir = os.path.abspath(".tmp/wheels")
for p in ["piper-tts", "onnxruntime"]:
    download_pypi_pkg(p, dest_dir)
