import 'dotenv/config';
import { geminiToolDeclarations } from '../src/gemini/geminiTools.js';
import { BOW_CON_SYSTEM_PROMPT } from '../src/gemini/geminiPrompt.js';

const key = process.env.GEMINI_API_KEY;

async function testFetch() {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
  console.log('Sending request with tools and systemInstruction...');
  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: BOW_CON_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: 'Bạn có thể làm được những gì?' }] }],
        tools: [{ functionDeclarations: geminiToolDeclarations }],
        generationConfig: { temperature: 0.3 },
      }),
    });
    console.log(`Duration: ${Date.now() - start}ms, Status: ${res.status}`);
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testFetch();
