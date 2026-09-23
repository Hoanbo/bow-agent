async function testOllamaChat() {
  const url = 'http://127.0.0.1:11434/api/chat';
  console.log('Testing Ollama /api/chat with model qwen2.5:7b...');
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        messages: [
          { role: 'system', content: 'Bạn là BOWCON - trợ lý AI trung thành của Ngài.' },
          { role: 'user', content: 'Chào bạn, bạn là ai?' }
        ],
        stream: false,
      }),
    });
    console.log(`Duration: ${Date.now() - start}ms, Status: ${res.status}`);
    const data = await res.json();
    console.log('Response content:', data?.message?.content);
  } catch (err: any) {
    console.error('Ollama chat error:', err.message);
  }
}

testOllamaChat();
