import urllib.request
import json
import subprocess

req = urllib.request.Request('https://pypi.org/pypi/piper-tts/json', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode('utf-8'))

for u in data.get('urls', []):
    if 'win_amd64' in u['filename']:
        print('URL:', u['url'])
        print('FILE:', u['filename'])
        cmd = ['curl.exe', '-L', u['url'], '-o', f'.tmp/wheels/{u["filename"]}']
        print('Running curl:', cmd)
        subprocess.run(cmd, check=True)
        break
