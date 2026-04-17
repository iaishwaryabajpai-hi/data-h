// ============================================================
// AI CO-ANALYST ENGINE — CreditLens (Backend Mode)
// Calls local Express server which proxies to Gemini
// ============================================================

let aiState = {
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

// ── DATA CONTEXT ─────────────────────────────────────────────
function buildDataContext() {
    if (!window.D) return 'Dataset: 5,537 credit card applicants';
    const D = window.D, o = D.overview;
    return `CREDIT CARD APPLICATION DATASET — KEY STATISTICS:

OVERVIEW: ${o.total_applicants.toLocaleString()} applicants, Avg income ₹${o.avg_income.toLocaleString()}, Median ₹${o.median_income.toLocaleString()}, Avg age ${o.avg_age}yrs (20-68), ${o.female_pct}% female.

GENDER GAP: Male avg ₹${D.gender.income['M'].toLocaleString()}, Female avg ₹${D.gender.income['F'].toLocaleString()}, Gap ${o.gender_gap_pct}% (p=4.86×10⁻⁴⁷). Male car ${D.gender.car_ownership['M']}%, Female car ${D.gender.car_ownership['F']}%. Male realty ${D.gender.realty_ownership['M']}%, Female realty ${D.gender.realty_ownership['F']}%.

INCOME DIST: Below ₹100K: ${D.income_distribution['0-50K']+D.income_distribution['50-100K']}. ₹100-200K: ${D.income_distribution['100-150K']+D.income_distribution['150-200K']}. ₹200-300K: ${D.income_distribution['200-250K']+D.income_distribution['250-300K']}. Gini: ${o.gini}.

EDUCATION: Lower sec ₹126K(n=50), Secondary ₹179K(n=3830,69%), Inc higher ₹231K(n=266), Higher edu ₹237K(n=1388). Men gain 34% more income from higher education than women.

OCCUPATION TOP 5: Managers ₹308K(n=463), Realty agents ₹296K(n=16), HR ₹213K(n=16), Private svc ₹210K(n=54), Accountants ₹207K(n=173). MISSING: 1,657 records (30%) in lower-income brackets.

FAMILY: Married 68.6%, Single 12.2%. Children→income: 0(₹194K)→1(₹205K)→2(₹184K)→3(₹165K). ~₹20K drop per child beyond 1.

ASSETS: 0 assets ₹166K(17%), 1 asset ₹187K(54%), 2 assets ₹227K(30%). 37% income gap between 0 and 2 assets.

HOUSING: House/apt 89%(₹194K), With parents 5%(₹178K), Office apt 0.4%(₹359K), Rented 2.3%(₹232K).

CORRELATIONS WITH INCOME: Asset score r=${D.correlation['AMT_INCOME_TOTAL']['ASSET_SCORE'].toFixed(3)}, Age r=${D.correlation['AMT_INCOME_TOTAL']['AGE'].toFixed(3)}, Children r=${D.correlation['AMT_INCOME_TOTAL']['CNT_CHILDREN'].toFixed(3)}.

WEALTH-ACCESS PARADOX: Women own realty at 73.5% vs men 72.4% (near parity), but earn 20.4% less and own cars at 2.5× lower rates. Realty = household metric; income/car = individual agency. Credit models over-weighting shared assets misprice female applicants.`;
}

function buildPrompt(topic, dataContext) {
    const map = {
        gender_gap: `Analyze the 20.4% gender pay gap (p=4.86×10⁻⁴⁷). Root causes, credit risk implications, 3 recommendations, pre-empt 3 objections.`,
        occupation_trap: `Analyze 30% missing occupation data. Who's missing? What bias in credit models? Data-quality framework to fix it.`,
        wealth_paradox: `Analyze the "Wealth-Access Paradox": equal realty ownership but 20.4% income gap and 2.5× car gap. Credit scoring implications.`,
        parenthood_penalty: `Analyze parenthood penalty: ~₹20K drop per child beyond 1. Correlation vs causation? Credit product solutions.`,
        dual_cohort: `Analyze bimodal age distribution (peaks 28-35, 50-58). Two cohort risk profiles. Design two credit product strategies.`,
        edu_premium: `Analyze 34% education return gap between genders. Why do men capture more? Credit risk implications.`,
        income_inequality: `Analyze Gini 0.276. Compare national benchmarks. Distribution shape implications. Credit risk concentration.`,
        full: `Executive brief: Summary (3 sentences), Top 3 Findings, Strategic Implications, Action Items, Risks. Board presentation format.`,
    };
    return `${dataContext}\n\nANALYSIS REQUEST:\n${map[topic]}\n\nFORMAT IN MARKDOWN with ### headers. Be specific with numbers. Maximum 600 words.`;
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
    // Check if already connected on server
    fetch('/api/status').then(r => r.json()).then(data => {
        if (data.connected) {
            aiState.connected = true;
            document.getElementById('ai-api-key').value = '••••••' + (data.keyPreview || '');
            markConnected();
        }
    }).catch(() => {});

    // Connect button — sends key to backend
    document.getElementById('ai-key-save').addEventListener('click', async () => {
        const key = document.getElementById('ai-api-key').value.trim();
        if (!key || key.startsWith('••')) return;
        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: key })
            });
            const data = await res.json();
            if (data.status === 'connected') {
                aiState.connected = true;
                markConnected();
            } else {
                alert(data.error || 'Connection failed');
            }
        } catch (e) {
            alert('Server not reachable. Make sure server.js is running.');
        }
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

    // Hide provider dropdown (backend handles it)
    const providerSelect = document.getElementById('ai-provider');
    if (providerSelect) {
        providerSelect.closest('.ai-key-group').style.display = 'none';
    }
}

function markConnected() {
    const btn = document.getElementById('ai-key-save');
    btn.textContent = '✓ Connected';
    btn.classList.add('connected');
}

async function generateInsight() {
    if (aiState.generating) return;
    if (!aiState.connected) {
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
    const prompt = buildPrompt(aiState.topic, dataCtx);
    const systemPrompt = PERSONAS[aiState.persona].system;

    let rawText = '';
    const startTime = Date.now();

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, systemPrompt })
        });

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
                    if (data === '[DONE]') break;
                    try {
                        const json = JSON.parse(data);
                        if (json.error) {
                            contentDiv.innerHTML = `<div style="color:#f43f5e;padding:1rem"><strong>⚠️</strong> ${json.error}</div>`;
                            box.classList.remove('streaming');
                            box.querySelector('.ai-scanning')?.remove();
                            return;
                        }
                        if (json.retry) {
                            contentDiv.innerHTML = `<div style="color:#f59e0b;padding:1rem">⏳ ${json.message}</div>`;
                            continue;
                        }
                        if (json.model) {
                            contentDiv.innerHTML = ''; // Clear retry messages
                            continue;
                        }
                        if (json.text) {
                            rawText += json.text;
                            contentDiv.innerHTML = mdToHtml(rawText) + '<span class="cursor"></span>';
                            box.scrollTop = box.scrollHeight;
                        }
                    } catch {}
                }
            }
        }

        // Finalize
        contentDiv.innerHTML = mdToHtml(rawText);
        box.classList.remove('streaming');
        box.querySelector('.ai-scanning')?.remove();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const wordCount = rawText.split(' ').length;
        document.getElementById('ai-meta').textContent =
            `Generated in ${elapsed}s · ${wordCount} words · ${PERSONAS[aiState.persona].label} · ${TOPICS[aiState.topic]}`;

    } catch (err) {
        box.classList.remove('streaming');
        contentDiv.innerHTML = `<div style="color:#f43f5e;padding:1rem">
            <strong>⚠️ Error:</strong> ${err.message}<br><br>
            <small>Make sure server.js is running: <code>node server.js</code></small>
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
    setTimeout(() => { setup.style.border = ''; setup.style.boxShadow = ''; }, 1500);
    document.getElementById('ai-api-key').focus();
}

document.addEventListener('DOMContentLoaded', initAI);
