async function probe() {
  const urls = [
    'http://127.0.0.1:11434',
    'http://localhost:11434',
    process.env.BRAIN_OLLAMA_BASE_URL,
    process.env.LOCAL_LLM_URL
  ].filter(Boolean);

  for (const u of urls) {
    try {
      const res = await fetch(`${u}/api/tags`, { signal: AbortSignal.timeout(2500) });
      const data = await res.json();
      console.log(`[OLLAMA PROBE] ${u} -> ONLINE. Models:`, data?.models?.map((m: any) => m.name));
    } catch (err: any) {
      console.log(`[OLLAMA PROBE] ${u} -> OFFLINE / Error:`, err.message);
    }
  }
}

probe();
