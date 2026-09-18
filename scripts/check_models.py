import sys
import io
import urllib.request
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

test_models = ['deepman3909', 'manhdung', 'minhquang', 'lacphi', 'mattheo', 'chieuthanh']
for m in test_models:
    url = f'https://huggingface.co/hoangquocviet/PIPER_MODELS/raw/main/{m}.onnx.json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as r:
            c = json.loads(r.read().decode('utf-8'))
            sr = c.get('audio', {}).get('sample_rate')
            ns = c.get('num_speakers')
            espeak = c.get('espeak', {}).get('voice')
            print(f'Model: {m:<15} | SampleRate: {sr} | NumSpeakers: {ns} | EspeakVoice: {espeak}')
    except Exception as e:
        print(f'Model: {m:<15} error: {e}')
