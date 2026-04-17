// ============================================================
// CREDITLENS BACKEND SERVER
// Proxies Gemini API calls, keeps API key server-side
// ============================================================
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8042;

// ── Config ────────────────────────────────────────────────────
let API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite'];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Set API Key endpoint ──────────────────────────────────────
app.post('/api/connect', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey || apiKey.trim().length < 10) {
        return res.status(400).json({ error: 'Invalid API key' });
    }
    API_KEY = apiKey.trim();
    res.json({ status: 'connected' });
});

// ── Generate endpoint (streams Gemini response) ───────────────
app.post('/api/generate', async (req, res) => {
    if (!API_KEY) {
        return res.status(401).json({ error: 'API key not set. Connect first.' });
    }

    const { prompt, systemPrompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let success = false;

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const model = GEMINI_MODELS[i];
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${API_KEY}&alt=sse`;
            const body = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { temperature: 0.85, maxOutputTokens: 1400 }
            };

            const geminiRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (geminiRes.status === 429) {
                // Rate limited — try next model
                res.write(`data: ${JSON.stringify({ retry: true, message: `Rate limited on ${model}. Trying ${GEMINI_MODELS[i+1] || 'next'}...` })}\n\n`);
                if (i < GEMINI_MODELS.length - 1) {
                    // Wait before trying next model
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                // All models exhausted
                res.write(`data: ${JSON.stringify({ error: 'Rate limit exceeded on all models. Please wait 60 seconds and try again.' })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            if (geminiRes.status === 404) {
                // Model not available — try next
                if (i < GEMINI_MODELS.length - 1) continue;
                res.write(`data: ${JSON.stringify({ error: `Model ${model} not found. Check your API key permissions.` })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                res.write(`data: ${JSON.stringify({ error: `Gemini ${geminiRes.status}: ${errText.substring(0, 300)}` })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            // Stream the response through
            res.write(`data: ${JSON.stringify({ model })}\n\n`);

            const reader = geminiRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') break;
                        try {
                            const json = JSON.parse(data);
                            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                res.write(`data: ${JSON.stringify({ text })}\n\n`);
                            }
                        } catch {}
                    }
                }
            }

            success = true;
            break; // Success — stop trying models

        } catch (err) {
            if (i < GEMINI_MODELS.length - 1) continue;
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        }
    }

    res.write('data: [DONE]\n\n');
    res.end();
});

// ── Status check ──────────────────────────────────────────────
app.get('/api/status', (req, res) => {
    res.json({
        connected: !!API_KEY,
        keyPreview: API_KEY ? API_KEY.substring(0, 6) + '...' : null
    });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  ◈ CreditLens Dashboard running at http://localhost:${PORT}\n`);
    if (!API_KEY) {
        console.log('  ⚠  No API key set. Enter it in the dashboard or set GEMINI_API_KEY env var.\n');
    } else {
        console.log(`  ✓  API key loaded (${API_KEY.substring(0, 6)}...)\n`);
    }
});
