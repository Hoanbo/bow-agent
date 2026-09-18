import os
import sys
import io
import json
import wave
import subprocess
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PIPER_EXE = os.path.join(ROOT_DIR, '.venv-speech', 'Scripts', 'piper.exe')
BENCHMARK_FILE = os.path.join(ROOT_DIR, 'benchmarks', 'voice-benchmark.txt')

with open(BENCHMARK_FILE, 'r', encoding='utf-8') as f:
    sentences = [line.strip() for line in f if line.strip()]

MODELS = [
    {
        "id": "voice-07-duy-oryx",
        "name": "Duy Oryx (Nam siêu trầm)",
        "onnx": os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'models-cache', 'voice-07-duy-oryx', 'duyoryx3175.onnx'),
        "json": os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'models-cache', 'voice-07-duy-oryx', 'duyoryx3175.onnx.json')
    },
    {
        "id": "voice-08-minh-khang",
        "name": "Minh Khang",
        "onnx": os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'models-cache', 'voice-08-minh-khang', 'minhkhang.onnx'),
        "json": os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'models-cache', 'voice-08-minh-khang', 'minhkhang.onnx.json')
    }
]

for m in MODELS:
    print(f"\n=== SYNTHESIZING: {m['name']} ({m['id']}) ===")
    out_dir = os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'audio', m['id'])
    os.makedirs(out_dir, exist_ok=True)
    
    for idx, sentence in enumerate(sentences):
        sent_num = idx + 1
        wav_path = os.path.join(out_dir, f"{sent_num:02d}.wav")
        cmd = [PIPER_EXE, "-m", m['onnx'], "-c", m['json'], "-f", wav_path]
        
        t0 = time.perf_counter()
        try:
            subprocess.run(cmd, input=sentence.encode('utf-8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            elapsed = round((time.perf_counter() - t0) * 1000, 2)
            with wave.open(wav_path, 'rb') as wf:
                dur = round(wf.getnframes() / float(wf.getframerate()), 3)
            size = os.path.getsize(wav_path)
            print(f"  Sentence {sent_num}: DONE in {elapsed}ms | Dur: {dur}s | Size: {size}B")
        except Exception as e:
            print(f"  Sentence {sent_num}: FAILED ({e})")
