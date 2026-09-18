import os
import sys
import io
import json
import csv
import time
import wave
import subprocess
import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BENCHMARK_FILE = os.path.join(ROOT_DIR, 'benchmarks', 'voice-benchmark.txt')
MODELS_FILE = os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'models.json')
AUDIO_OUT_DIR = os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'audio')
RUNS_DIR = os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'runs')
PIPER_EXE = os.path.join(ROOT_DIR, '.venv-speech', 'Scripts', 'piper.exe')

if not os.path.exists(BENCHMARK_FILE):
    raise FileNotFoundError(f"Missing {BENCHMARK_FILE}")
if not os.path.exists(MODELS_FILE):
    raise FileNotFoundError(f"Missing {MODELS_FILE}")
if not os.path.exists(PIPER_EXE):
    raise FileNotFoundError(f"Missing {PIPER_EXE}")

with open(BENCHMARK_FILE, 'r', encoding='utf-8') as f:
    sentences = [line.strip() for line in f if line.strip()]

with open(MODELS_FILE, 'r', encoding='utf-8') as f:
    models = json.load(f)

timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
current_run_dir = os.path.join(RUNS_DIR, timestamp_str)
os.makedirs(current_run_dir, exist_ok=True)
os.makedirs(AUDIO_OUT_DIR, exist_ok=True)

print(f"=== BOWCON VOICE BENCHMARK RUNNER ===")
print(f"Run directory: {current_run_dir}")
print(f"Total voices: {len(models)}")
print(f"Total sentences: {len(sentences)}")

benchmark_results = {
    "benchmarkVersion": "1.0.0",
    "timestamp": datetime.datetime.now().isoformat(),
    "environment": {
        "os": "Windows 11 (dualXeon)",
        "python": sys.version.split()[0],
        "piperExe": PIPER_EXE
    },
    "voices": []
}

csv_rows = []

for v_idx, model_info in enumerate(models):
    voice_id = model_info["id"]
    voice_name = model_info["name"]
    model_path = model_info["localModelPath"]
    config_path = model_info["localConfigPath"]
    speaker_id = model_info.get("speakerId")

    print(f"\n--- [{v_idx+1}/{len(models)}] BENCHMARKING: {voice_name} ({voice_id}) ---")
    voice_audio_dir = os.path.join(AUDIO_OUT_DIR, voice_id)
    os.makedirs(voice_audio_dir, exist_ok=True)

    voice_entry = {
        "voiceId": voice_id,
        "name": voice_name,
        "repository": model_info["repository"],
        "model": model_info["modelFile"],
        "speakerId": speaker_id,
        "sampleRate": model_info.get("sampleRate"),
        "sentences": [],
        "totalGenerationTimeMs": 0,
        "totalAudioDurationSec": 0,
        "averageRtf": None,
        "status": "IN_PROGRESS"
    }

    voice_success = True

    for s_idx, sentence in enumerate(sentences):
        sent_num = s_idx + 1
        wav_filename = f"{sent_num:02d}.wav"
        wav_path = os.path.join(voice_audio_dir, wav_filename)

        cmd = [
            PIPER_EXE,
            "-m", model_path,
            "-c", config_path,
            "-f", wav_path
        ]
        if speaker_id is not None:
            cmd.extend(["-s", str(speaker_id)])

        print(f"  Sentence {sent_num}: \"{sentence[:40]}...\"")
        
        t0 = time.perf_counter()
        try:
            p = subprocess.run(
                cmd,
                input=sentence.encode('utf-8'),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True
            )
            t1 = time.perf_counter()
            gen_time_sec = t1 - t0
            gen_time_ms = round(gen_time_sec * 1000, 2)

            # Read audio duration & metadata
            with wave.open(wav_path, 'rb') as wf:
                channels = wf.getnchannels()
                sample_width = wf.getsampwidth()
                framerate = wf.getframerate()
                nframes = wf.getnframes()
                duration_sec = round(nframes / float(framerate), 3)

            file_size = os.path.getsize(wav_path)
            rtf = round(gen_time_sec / duration_sec, 4) if duration_sec > 0 else None

            print(f"    -> Done in {gen_time_ms}ms | Duration: {duration_sec}s | RTF: {rtf} | Size: {file_size}B")

            sentence_result = {
                "sentenceId": sent_num,
                "text": sentence,
                "audioFile": f"audio/{voice_id}/{wav_filename}",
                "durationSeconds": duration_sec,
                "generationTimeSeconds": round(gen_time_sec, 4),
                "generationTimeMs": gen_time_ms,
                "rtf": rtf,
                "fileSizeBytes": file_size,
                "channels": channels,
                "bitDepth": sample_width * 8,
                "sampleRate": framerate,
                "status": "VERIFIED"
            }
            voice_entry["sentences"].append(sentence_result)
            voice_entry["totalGenerationTimeMs"] += gen_time_ms
            voice_entry["totalAudioDurationSec"] += duration_sec

            csv_rows.append({
                "Voice": voice_name,
                "VoiceID": voice_id,
                "SentenceID": sent_num,
                "Text": sentence,
                "DurationSec": duration_sec,
                "GenTimeSec": round(gen_time_sec, 4),
                "RTF": rtf,
                "FileSizeBytes": file_size,
                "SampleRate": framerate,
                "Status": "VERIFIED"
            })

        except Exception as e:
            print(f"    -> FAILED: {e}")
            voice_success = False
            voice_entry["sentences"].append({
                "sentenceId": sent_num,
                "text": sentence,
                "status": f"FAILED: {e}"
            })
            csv_rows.append({
                "Voice": voice_name,
                "VoiceID": voice_id,
                "SentenceID": sent_num,
                "Text": sentence,
                "DurationSec": None,
                "GenTimeSec": None,
                "RTF": None,
                "FileSizeBytes": None,
                "SampleRate": None,
                "Status": f"FAILED: {e}"
            })

    if voice_success and voice_entry["totalAudioDurationSec"] > 0:
        voice_entry["averageRtf"] = round(
            (voice_entry["totalGenerationTimeMs"] / 1000.0) / voice_entry["totalAudioDurationSec"],
            4
        )
        voice_entry["status"] = "VERIFIED"
    else:
        voice_entry["status"] = "PARTIALLY_VERIFIED" if any(s.get("status") == "VERIFIED" for s in voice_entry["sentences"]) else "FAILED"

    benchmark_results["voices"].append(voice_entry)

# Write benchmark-results.json
results_json_path = os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'benchmark-results.json')
with open(results_json_path, 'w', encoding='utf-8') as f:
    json.dump(benchmark_results, f, ensure_ascii=False, indent=2)

# Copy to run dir
with open(os.path.join(current_run_dir, 'benchmark-results.json'), 'w', encoding='utf-8') as f:
    json.dump(benchmark_results, f, ensure_ascii=False, indent=2)

# Write benchmark-results.csv
results_csv_path = os.path.join(ROOT_DIR, 'artifacts', 'voice-benchmark', 'benchmark-results.csv')
with open(results_csv_path, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=["Voice", "VoiceID", "SentenceID", "Text", "DurationSec", "GenTimeSec", "RTF", "FileSizeBytes", "SampleRate", "Status"])
    writer.writeheader()
    writer.writerows(csv_rows)

print("\n=== BENCHMARK COMPLETED SUCCESSFULLY ===")
print(f"Results JSON: {results_json_path}")
print(f"Results CSV: {results_csv_path}")
