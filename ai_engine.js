// ============================================================
// AI CO-ANALYST ENGINE — CreditLens
// Supports: Google Gemini API & OpenAI API
// ============================================================

// ── STATE ────────────────────────────────────────────────────
let aiState = {
    provider: 'gemini',
    apiKey: localStorage.getItem('cl_ai_key') || '',
    connected: false,
    persona: 'mckinsey',
    topic: 'gender_gap',
    generating: false,
};

// ── PERSONA DEFINITIONS ──────────────────────────────────────
const PERSONAS = {
    mckinsey: {
        label: '🏢 McKinsey Consultant',
        system: `You are a Senior Partner at McKinsey & Company with 20 years of experience in financial services strategy. 
Your communication style is:
- Structured with clear frameworks (MECE, 2x2 matrices, issue trees)
- Data-driven: always cite specific numbers from the dataset
- Executive-ready: use crisp, high-impact language
- Action-oriented: every insight ends with a concrete recommendation
- Format responses with ### headers, **bold key numbers**, and bullet points
- Keep it tight: no fluff, maximum signal per sentence`
    },
    risk: {
        label: '⚠️ Chief Risk Officer',
        system: `You are a Chief Risk Officer at a major financial institution with deep expertise in credit risk modeling.
Your communication style is:
- Skeptical and conservative — you stress-test everything
- Focused on tail risks, model biases, and systemic vulnerabilities
- Regulatory-minded: reference Basel III, ECOA, Fair Lending guidelines
- Use probability language: "with 95% confidence", "stress scenario"
- Format responses with ### headers and explicit RISK LEVEL callouts (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW)
- Always end with what could go catastrophically wrong`
    },
    sociologist: {
        label: '🌍 Sociologist',
        system: `You are a leading sociologist specializing in economic inequality and financial inclusion.
Your communication style is:
- Human-centered: connect data to real human lives and systemic structures
- Intersectional: consider gender, class, family structure interactions
- Policy-minded: reference real-world research and policy interventions
- Use empathetic but rigorous language
- Format responses with ### headers, narrative prose, and concrete human examples
- Always ground statistics in their human consequence`
    },
    devil: {
        label: '😈 Devil\'s Advocate',
        system: `You are a brilliant contrarian analyst who aggressively challenges assumptions.
Your communication style is:
- Combative but intellectually rigorous — every claim is questioned
- Focus on what the data CANNOT tell us, confounds, selection bias, p-hacking
- Ask uncomfortable questions: "But what if we're measuring the wrong thing?"
- Use Socratic questioning and counterexamples
- Format with ### headers and 🔥 CHALLENGE callouts
- Your job is to make the analysis bulletproof by attacking every weakness first`
    }
};

// ── TOPIC DEFINITIONS ────────────────────────────────────────
const TOPICS = {
    gender_gap: 'The 20.4% Gender Pay Gap',
    occupation_trap: 'The Occupation Data Gap (30% Missing)',
    wealth_paradox: 'The Wealth-Access Paradox',
    parenthood_penalty: 'The Parenthood Penalty',
    dual_cohort: 'The Dual-Cohort Age Pattern',
    edu_premium: 'Education Return Gap (34%)',
    income_inequality: 'Income Inequality (Gini 0.276)',
    full: 'Full Dataset Executive Brief',
};

// ── DATA CONTEXT BUILDER ─────────────────────────────────────
function buildDataContext() {
    if (!window.D) return 'Dataset: 5,537 credit card applicants (data not yet loaded)';
    const D = window.D;
    const o = D.overview;
    return `
CREDIT CARD APPLICATION DATASET — KEY STATISTICS:

OVERVIEW:
- Total applicants: ${o.total_applicants.toLocaleString()}
- Average income: ₹${o.avg_income.toLocaleString()}
- Median income: ₹${o.median_income.toLocaleString()}
- Average age: ${o.avg_age} years (range: 20–68)
- Female applicants: ${o.female_pct}% (n=3,711)
- Male applicants: ${(100 - o.female_pct).toFixed(1)}% (n=1,826)

GENDER PAY GAP:
- Male avg income: ₹${D.gender.income['M'].toLocaleString()}
- Female avg income: ₹${D.gender.income['F'].toLocaleString()}
- Gap: ${o.gender_gap_pct}% (statistically significant: p = 4.86 × 10⁻⁴⁷, Welch's t-test)
- Male car ownership: ${D.gender.car_ownership['M']}%
- Female car ownership: ${D.gender.car_ownership['F']}%
- Male realty ownership: ${D.gender.realty_ownership['M']}%
- Female realty ownership: ${D.gender.realty_ownership['F']}%

INCOME DISTRIBUTION:
- Below ₹100K: ${D.income_distribution['0-50K'] + D.income_distribution['50-100K']} applicants
- ₹100K–₹200K: ${D.income_distribution['100-150K'] + D.income_distribution['150-200K']} applicants (core majority)
- ₹200K–₹300K: ${D.income_distribution['200-250K'] + D.income_distribution['250-300K']} applicants
- Above ₹500K: ${(D.income_distribution['500-750K'] || 0) + (D.income_distribution['750K-1M'] || 0) + (D.income_distribution['1M+'] || 0)} applicants
- Income inequality (Gini coefficient): ${o.gini}

EDUCATION INCOME LADDER:
- Lower secondary: ₹126,495 avg (n=50)
- Secondary/secondary special: ₹178,649 avg (n=3,830 — 69% of all applicants)
- Incomplete higher: ₹231,398 avg (n=266)
- Higher education: ₹236,848 avg (n=1,388)
- Education premium (lower → higher): +87% income increase
- Education return gap by gender: Men gain 34% more from higher education than women

OCCUPATION TOP 5 (by income):
1. Managers: ₹308,469 (n=463)
2. Realty agents: ₹296,156 (n=16)
3. HR staff: ₹213,469 (n=16)
4. Private service: ₹210,250 (n=54)
5. Accountants: ₹207,364 (n=173)
- MISSING OCCUPATION DATA: 1,657 records (30%) — concentrated in lower-income brackets

FAMILY & DEMOGRAPHICS:
- Married: 68.6% | Single: 12.2% | Civil marriage: 8.4% | Separated: 6.3% | Widow: 4.5%
- 0 children: 69.8% | 1 child: 21.3% | 2 children: 8% | 3+: <1%
- Children→income: 0 children (₹194K) → 1 child (₹205K) → 2 children (₹184K) → 3 children (₹165K)
- Parenthood penalty: each child beyond 1 correlates with ~₹20K income reduction

ASSET OWNERSHIP:
- 0 assets (no car, no realty): ₹165,714 avg income (16.8% of applicants)
- 1 asset: ₹187,122 avg income (53.5% of applicants)
- 2 assets (car + realty): ₹226,737 avg income (29.7% of applicants)
- Asset wealth correlates with 37% higher income at maximum vs zero

HOUSING:
- House/apartment: 89.3% (₹193,874 avg)
- With parents: 4.9% (₹178,110 avg)
- Office apartment: 0.36% (₹359,325 avg — highest earners)
- Rented apartment: 2.3% (₹231,883 avg)

KEY CORRELATIONS WITH INCOME (Pearson r):
- Asset score: r = ${D.correlation['AMT_INCOME_TOTAL']['ASSET_SCORE'].toFixed(3)} (strongest predictor)
- Age: r = ${D.correlation['AMT_INCOME_TOTAL']['AGE'].toFixed(3)} (slight negative — older applicants earn less)
- Children: r = ${D.correlation['AMT_INCOME_TOTAL']['CNT_CHILDREN'].toFixed(3)}
- Experience: r = ${D.correlation['AMT_INCOME_TOTAL']['YEARS_EMPLOYED'].toFixed(3)}

THE WEALTH-ACCESS PARADOX (key finding):
Women own realty at nearly identical rates to men (73.5% vs 72.4%) but earn 20.4% less.
Realty ownership is a household/shared metric; income and car ownership are individual agency metrics.
Credit models over-weighting shared assets may systematically misprice female applicants' individual risk.
`;
}

// ── PROMPT BUILDER ───────────────────────────────────────────
function buildPrompt(persona, topic, dataContext) {
    const topicMap = {
        gender_gap: `Analyze the 20.4% statistically-significant gender pay gap (p=4.86×10⁻⁴⁷). Include: root causes, business implications for credit risk, 3 actionable recommendations, and pre-empt the 3 most likely objections a skeptic would raise.`,
        occupation_trap: `Analyze the 30% missing occupation data problem. Who are the missing applicants? What bias does this create in credit risk models? What are the systemic consequences? Provide a data-quality framework to fix it.`,
        wealth_paradox: `Analyze the "Wealth-Access Paradox": women own realty at equal rates but earn 20.4% less and own cars at 2.5× lower rates. Why does equal asset ownership not equal equal financial stability? What does this mean for credit scoring methodology?`,
        parenthood_penalty: `Analyze the parenthood penalty: income drops ~₹20K for each child beyond the first. Is this correlation or causation? What are the financial access implications for families? What credit products could address this?`,
        dual_cohort: `Analyze the bimodal age distribution (peaks at 28-35 and 50-58). What do these two cohorts represent economically? What are their different risk profiles? Design two distinct credit product strategies for each cohort.`,
        edu_premium: `Analyze the education-income ladder and specifically the 34% education return gap between genders. Why do men capture more income value from the same education? What are the credit risk implications?`,
        income_inequality: `Analyze income inequality (Gini coefficient 0.276). Compare this to national benchmarks. What does the distribution shape tell us about the applicant pool quality? What credit risk concentration risks does this create?`,
        full: `Provide a comprehensive executive brief on this credit card application dataset. Structure it as: Executive Summary (3 sentences), Top 3 Findings with evidence, Strategic Implications, Immediate Action Items, and Risks to Watch. This is for a board presentation.`,
    };

    return `${dataContext}

ANALYSIS REQUEST:
${topicMap[topic]}

FORMAT YOUR RESPONSE IN MARKDOWN with clear ### headers. Be specific with numbers. Be decisive. Maximum 600 words.`;
}

// ── API CALLS ─────────────────────────────────────────────────
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-8b'];

async function callGemini(apiKey, prompt, systemPrompt, onChunk, retryCount = 0) {
    const modelIdx = Math.min(retryCount, GEMINI_MODELS.length - 1);
    const model = GEMINI_MODELS[modelIdx];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.85, maxOutputTokens: 1200 }
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    // Handle rate limit with retry
    if (res.status === 429 && retryCount < 3) {
        const waitSec = 18 + retryCount * 5;
        const nextModel = GEMINI_MODELS[Math.min(retryCount + 1, GEMINI_MODELS.length - 1)];
        onChunk(`⏳ Rate limited on ${model}. Retrying with ${nextModel} in ${waitSec}s...\n\n`);
        // Countdown
        for (let i = waitSec; i > 0; i--) {
            await new Promise(r => setTimeout(r, 1000));
        }
        // Clear the retry message from accumulated text
        return callGemini(apiKey, prompt, systemPrompt, (chunk) => {
            // Reset the text on first chunk of retry
            onChunk(chunk);
        }, retryCount + 1);
    }

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) {
            throw new Error('Rate limit exceeded on all models. Please wait 1 minute and try again.');
        }
        throw new Error(`Gemini error ${res.status}: ${errText.substring(0, 200)}`);
    }

    // Stream response
    const reader = res.body.getReader();
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
                if (data === '[DONE]') return;
                try {
                    const json = JSON.parse(data);
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) onChunk(text);
                } catch {}
            }
        }
    }
}

async function callOpenAI(apiKey, prompt, systemPrompt, onChunk) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o',
            stream: true,
            max_tokens: 1200,
            temperature: 0.85,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        })
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${err}`);
    }
    const reader = res.body.getReader();
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
                if (data === '[DONE]') return;
                try {
                    const json = JSON.parse(data);
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) onChunk(delta);
                } catch {}
            }
        }
    }
}

// ── MARKDOWN → HTML ───────────────────────────────────────────
function mdToHtml(md) {
    return md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hublp])(.+)$/gm, '$1');
}

// ── UI CONTROLLER ─────────────────────────────────────────────
function initAI() {
    // Restore saved key
    if (aiState.apiKey) {
        document.getElementById('ai-api-key').value = aiState.apiKey;
        markConnected();
    }

    // Provider selector
    document.getElementById('ai-provider').addEventListener('change', e => {
        aiState.provider = e.target.value;
    });

    // Connect button
    document.getElementById('ai-key-save').addEventListener('click', () => {
        const key = document.getElementById('ai-api-key').value.trim();
        if (!key) return;
        aiState.apiKey = key;
        localStorage.setItem('cl_ai_key', key);
        markConnected();
    });

    // Persona buttons
    document.querySelectorAll('.persona-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            aiState.persona = btn.dataset.persona;
            document.getElementById('ai-persona-label').textContent = PERSONAS[aiState.persona].label;
        });
    });

    // Topic buttons
    document.querySelectorAll('.topic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            aiState.topic = btn.dataset.topic;
            document.getElementById('ai-topic-label').textContent = TOPICS[aiState.topic];
        });
    });

    // Generate button
    document.getElementById('ai-generate-btn').addEventListener('click', generateInsight);
}

function markConnected() {
    aiState.connected = true;
    const btn = document.getElementById('ai-key-save');
    btn.textContent = '✓ Connected';
    btn.classList.add('connected');
}

async function generateInsight() {
    if (aiState.generating) return;
    if (!aiState.apiKey) {
        flashSetup();
        return;
    }

    aiState.generating = true;
    const genBtn = document.getElementById('ai-generate-btn');
    genBtn.disabled = true;
    genBtn.innerHTML = '<span class="spinner"></span> Analyzing...';

    const box = document.getElementById('ai-response-box');
    box.classList.add('streaming');
    box.innerHTML = '<div class="ai-scanning"></div><div class="ai-content" id="ai-content-div"></div>';
    const contentDiv = document.getElementById('ai-content-div');

    document.getElementById('ai-persona-label').textContent = PERSONAS[aiState.persona].label;
    document.getElementById('ai-topic-label').textContent = TOPICS[aiState.topic];

    const dataCtx = buildDataContext();
    const prompt = buildPrompt(aiState.persona, aiState.topic, dataCtx);
    const system = PERSONAS[aiState.persona].system;

    let rawText = '';
    const startTime = Date.now();

    const onChunk = (chunk) => {
        rawText += chunk;
        contentDiv.innerHTML = mdToHtml(rawText) + '<span class="cursor"></span>';
        box.scrollTop = box.scrollHeight;
    };

    try {
        if (aiState.provider === 'gemini') {
            await callGemini(aiState.apiKey, prompt, system, onChunk);
        } else {
            await callOpenAI(aiState.apiKey, prompt, system, onChunk);
        }
        // Remove cursor on finish
        contentDiv.innerHTML = mdToHtml(rawText);
        box.classList.remove('streaming');
        // Remove scanning overlay
        box.querySelector('.ai-scanning')?.remove();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const wordCount = rawText.split(' ').length;
        document.getElementById('ai-meta').textContent =
            `Generated in ${elapsed}s · ${wordCount} words · ${PERSONAS[aiState.persona].label} · ${TOPICS[aiState.topic]}`;
    } catch (err) {
        box.classList.remove('streaming');
        contentDiv.innerHTML = `<div style="color:#f43f5e;padding:1rem">
            <strong>⚠️ Error:</strong> ${err.message}<br><br>
            <small>Check your API key and make sure the selected provider is correct.</small>
        </div>`;
    } finally {
        aiState.generating = false;
        genBtn.disabled = false;
        genBtn.innerHTML = '<span id="ai-btn-text">⚡ Generate AI Insight</span>';
    }
}

function flashSetup() {
    const setup = document.getElementById('ai-setup');
    setup.style.border = '1px solid #f43f5e';
    setup.style.boxShadow = '0 0 20px rgba(244,63,94,0.2)';
    setTimeout(() => {
        setup.style.border = '';
        setup.style.boxShadow = '';
    }, 1500);
    document.getElementById('ai-api-key').focus();
}

// ── BOOTSTRAP ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAI);
