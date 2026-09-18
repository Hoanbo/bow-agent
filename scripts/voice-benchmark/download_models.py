import os
import sys
import io
import json
import urllib.request
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'artifacts', 'voice-benchmark', 'models-cache'))
os.makedirs(CACHE_DIR, exist_ok=True)

CANDIDATES = [
    {
        "id": "voice-01-quang-huy",
        "name": "Quang Huy",
        "gender": "male",
        "language": "vi",
        "repository": "CakeByVPBank/piper-v3-vietnamese-5speakers",
        "modelFile": "vi_VN-csa-voice-piper-v3-medium.onnx",
        "configFile": "vi_VN-csa-voice-piper-v3-medium.onnx.json",
        "modelUrl": "https://huggingface.co/CakeByVPBank/piper-v3-vietnamese-5speakers/resolve/main/vi_VN-csa-voice-piper-v3-medium.onnx",
        "configUrl": "https://huggingface.co/CakeByVPBank/piper-v3-vietnamese-5speakers/resolve/main/vi_VN-csa-voice-piper-v3-medium.onnx.json",
        "speakerId": 2,
        "sampleRate": 22050
    },
    {
        "id": "voice-02-thanh-nien-tu-tin",
        "name": "Thanh niên tự tin",
        "gender": "male",
        "language": "vi",
        "repository": "vongocanhthi/acut-piper-vietnamese",
        "modelFile": "vi_VN-thanh_nien_tu_tin-medium.onnx",
        "configFile": "vi_VN-thanh_nien_tu_tin-medium.onnx.json",
        "modelUrl": "https://huggingface.co/vongocanhthi/acut-piper-vietnamese/resolve/main/piper/vi/vi_VN/thanh_nien_tu_tin/medium/vi_VN-thanh_nien_tu_tin-medium.onnx",
        "configUrl": "https://huggingface.co/vongocanhthi/acut-piper-vietnamese/resolve/main/piper/vi/vi_VN/thanh_nien_tu_tin/medium/vi_VN-thanh_nien_tu_tin-medium.onnx.json",
        "speakerId": None,
        "sampleRate": 22050
    },
    {
        "id": "voice-03-deepman-3909",
        "name": "Deepman 3909",
        "gender": "male",
        "language": "vi",
        "repository": "hoangquocviet/PIPER_MODELS",
        "modelFile": "deepman3909.onnx",
        "configFile": "deepman3909.onnx.json",
        "modelUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/deepman3909.onnx",
        "configUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/deepman3909.onnx.json",
        "speakerId": None,
        "sampleRate": 22050
    },
    {
        "id": "voice-04-manh-dung",
        "name": "Mạnh Dũng",
        "gender": "male",
        "language": "vi",
        "repository": "hoangquocviet/PIPER_MODELS",
        "modelFile": "manhdung.onnx",
        "configFile": "manhdung.onnx.json",
        "modelUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/manhdung.onnx",
        "configUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/manhdung.onnx.json",
        "speakerId": None,
        "sampleRate": 22050
    },
    {
        "id": "voice-05-minh-quang",
        "name": "Minh Quang",
        "gender": "male",
        "language": "vi",
        "repository": "hoangquocviet/PIPER_MODELS",
        "modelFile": "minhquang.onnx",
        "configFile": "minhquang.onnx.json",
        "modelUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/minhquang.onnx",
        "configUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/minhquang.onnx.json",
        "speakerId": None,
        "sampleRate": 22050
    },
    {
        "id": "voice-06-lac-phi",
        "name": "Lạc Phi",
        "gender": "male",
        "language": "vi",
        "repository": "hoangquocviet/PIPER_MODELS",
        "modelFile": "lacphi.onnx",
        "configFile": "lacphi.onnx.json",
        "modelUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/lacphi.onnx",
        "configUrl": "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/lacphi.onnx.json",
        "speakerId": None,
        "sampleRate": 22050
    }
]

def download_file(url, target_path):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        print(f"  [CACHE HIT] {os.path.basename(target_path)} ({os.path.getsize(target_path)} bytes)")
        return "CACHED", os.path.getsize(target_path)
    
    print(f"  [DOWNLOADING] {url} -> {os.path.basename(target_path)}")
    start = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp, open(target_path, 'wb') as out_f:
        data = resp.read()
        out_f.write(data)
    elapsed = time.time() - start
    size = os.path.getsize(target_path)
    print(f"  [DOWNLOAD DONE] {size} bytes in {elapsed:.2f}s")
    return "DOWNLOADED", size

manifest = []
for c in CANDIDATES:
    print(f"=== PROCESSING VOICE: {c['name']} ({c['id']}) ===")
    v_dir = os.path.join(CACHE_DIR, c['id'])
    os.makedirs(v_dir, exist_ok=True)
    
    onnx_dest = os.path.join(v_dir, c['modelFile'])
    json_dest = os.path.join(v_dir, c['configFile'])
    
    onnx_status, onnx_size = download_file(c['modelUrl'], onnx_dest)
    json_status, json_size = download_file(c['configUrl'], json_dest)
    
    manifest_item = {
        "id": c["id"],
        "name": c["name"],
        "gender": c["gender"],
        "language": c["language"],
        "repository": c["repository"],
        "modelFile": c["modelFile"],
        "configFile": c["configFile"],
        "speakerId": c["speakerId"],
        "sampleRate": c["sampleRate"],
        "modelSize": onnx_size,
        "configSize": json_size,
        "accessStatus": "ACCESS_VERIFIED",
        "downloadStatus": "DOWNLOAD_VERIFIED",
        "localModelPath": onnx_dest,
        "localConfigPath": json_dest
    }
    manifest.append(manifest_item)

manifest_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'artifacts', 'voice-benchmark', 'models.json'))
with open(manifest_file, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"\nManifest successfully written to: {manifest_file}")
