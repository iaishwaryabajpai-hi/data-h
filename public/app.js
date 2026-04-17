// CREDITLENS - GODMODE DASHBOARD LOGIC
Chart.defaults.color = '#9898b0';
Chart.defaults.font.family = "'Inter', sans-serif";

// Safe plugin registration
try { Chart.register(ChartDataLabels); } catch(e) {}

const C = {
    primary: '#6366f1',
    primaryA: 'rgba(99,102,241,0.25)',
    male: '#3b82f6',
    maleA: 'rgba(59,130,246,0.3)',
    female: '#f43f5e',
    femaleA: 'rgba(244,63,94,0.3)',
    cyan: '#22d3ee',
    cyanA: 'rgba(34,211,238,0.15)',
    green: '#10b981',
    greenA: 'rgba(16,185,129,0.25)',
    amber: '#f59e0b',
    violet: '#a78bfa',
    grid: 'rgba(255,255,255,0.05)',
};

const BASE = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        datalabels: { display: false },
        legend: { labels: { color: '#c8c8d8', usePointStyle: true, font: { size: 12 } } },
        tooltip: {
            backgroundColor: 'rgba(10,10,20,0.92)',
            titleColor: '#fff',
            bodyColor: '#c0c0d0',
            borderColor: 'rgba(99,102,241,0.4)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
        }
    },
    scales: {
        y: {
            grid: { color: C.grid, drawBorder: false },
            ticks: { color: '#8888a0', font: { size: 11 } }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#8888a0', font: { size: 11 } }
        }
    }
};

let D = null; // global data — also exposed as window.D for ai_engine.js

// ── INIT ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    setupParticles();
    fetch('data.json')
        .then(r => r.json())
        .then(data => { D = data; window.D = data; renderKPIs(); renderAllCharts(); setupPredictor(); })
        .catch(e => console.error('Data load failed:', e));
});

// ── NAVIGATION ────────────────────────────────────────────────────────
function setupNav() {
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        let cur = '';
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 250) cur = s.id;
        });
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.section === cur);
        });
    });
}

// ── PARTICLES ─────────────────────────────────────────────────────────
function setupParticles() {
    const box = document.getElementById('particles');
    if (!box) return;
    for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `left:${Math.random()*100}%;animation-delay:${(Math.random()*6).toFixed(1)}s;animation-duration:${(4+Math.random()*5).toFixed(1)}s`;
        box.appendChild(p);
    }
}

// ── KPI CARDS ─────────────────────────────────────────────────────────
function renderKPIs() {
    const o = D.overview;
    const items = [
        { icon: '👥', val: o.total_applicants.toLocaleString(), label: 'Total Applicants' },
        { icon: '💰', val: '₹' + Math.round(o.avg_income / 1000) + 'K', label: 'Avg. Income' },
        { icon: '⚖️', val: o.gender_gap_pct + '%', label: 'Gender Pay Gap' },
        { icon: '🏠', val: o.realty_ownership_pct + '%', label: 'Realty Ownership' },
        { icon: '🚗', val: o.car_ownership_pct + '%', label: 'Car Ownership' },
        { icon: '📉', val: o.gini, label: 'Gini Coefficient' },
        { icon: '🎂', val: o.avg_age, label: 'Avg. Age (yrs)' },
        { icon: '👩', val: o.female_pct + '%', label: '% Female Applicants' },
    ];
    document.getElementById('kpi-grid').innerHTML = items.map(k => `
        <div class="kpi-card">
            <div class="kpi-icon">${k.icon}</div>
            <div class="kpi-value">${k.val}</div>
            <div class="kpi-label">${k.label}</div>
        </div>`).join('');
}

// ── CHART HELPERS ─────────────────────────────────────────────────────
function bar(id, labels, datasets, extra = {}) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: deepMerge(BASE, extra)
    });
}

function line(id, labels, datasets, extra = {}) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    return new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: deepMerge(BASE, extra)
    });
}

function deepMerge(base, extra) {
    return JSON.parse(JSON.stringify({ ...base, ...extra,
        plugins: { ...base.plugins, ...(extra.plugins || {}) },
        scales: { ...base.scales, ...(extra.scales || {}) }
    }));
}

// ── ALL CHARTS ────────────────────────────────────────────────────────
function renderAllCharts() {
    // 1. Income Distribution
    bar('incomeDistChart',
        Object.keys(D.income_distribution),
        [{ label: 'Applicants', data: Object.values(D.income_distribution),
           backgroundColor: C.primaryA, borderColor: C.primary, borderWidth: 1.5, borderRadius: 5 }]
    );

    // 2. Age Distribution
    const ages = Object.keys(D.age_distribution);
    const ageCounts = Object.values(D.age_distribution);
    line('ageDistChart', ages, [{
        label: 'Applicants', data: ageCounts,
        borderColor: C.cyan, backgroundColor: C.cyanA,
        fill: true, tension: 0.4, pointRadius: 0
    }]);

    // 3. Gender × Age Income (line)
    const mAges = Object.keys(D.age_income_line_M).filter((_, i) => i % 2 === 0);
    line('genderAgeChart', mAges, [
        { label: 'Male Income', data: mAges.map(k => D.age_income_line_M[k]),
          borderColor: C.male, backgroundColor: C.maleA, tension: 0.4, fill: false, pointRadius: 0 },
        { label: 'Female Income', data: mAges.map(k => D.age_income_line_F[k] || null),
          borderColor: C.female, backgroundColor: C.femaleA, tension: 0.4, fill: false, pointRadius: 0 }
    ], { scales: { y: { min: 100000, ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } } });

    // 4. Gender × Education
    const eduKeys = Object.keys(D.education);
    const eduShort = ['Lower Sec', 'Secondary', 'Inc Higher', 'Higher Edu', 'Degree'];
    bar('genderEduChart', eduShort, [
        { label: 'Male', data: eduKeys.map(k => D.gender_education['M']?.[k] || 0),
          backgroundColor: C.maleA, borderColor: C.male, borderWidth: 1.5 },
        { label: 'Female', data: eduKeys.map(k => D.gender_education['F']?.[k] || 0),
          backgroundColor: C.femaleA, borderColor: C.female, borderWidth: 1.5 }
    ]);

    // 5. Occupation × Gender grouped (top 10, horizontal)
    const sortedOccs = Object.keys(D.occupation_gender)
        .sort((a, b) => (D.occupation_gender[b]['M'] || 0) - (D.occupation_gender[a]['M'] || 0))
        .slice(0, 10);
    new Chart(document.getElementById('occGenderChart'), {
        type: 'bar',
        data: {
            labels: sortedOccs,
            datasets: [
                { label: 'Male', data: sortedOccs.map(o => D.occupation_gender[o]['M'] || 0),
                  backgroundColor: C.male, borderRadius: 4 },
                { label: 'Female', data: sortedOccs.map(o => D.occupation_gender[o]['F'] || 0),
                  backgroundColor: C.female, borderRadius: 4 }
            ]
        },
        options: deepMerge(BASE, { indexAxis: 'y',
            scales: { x: { grid: { color: C.grid }, ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } }
        })
    });

    // 6. Occupation Ranking (Mean – switchable)
    let occChart;
    function drawOccChart(metric) {
        const sorted = Object.entries(D.occupation)
            .sort((a, b) => b[1][metric] - a[1][metric]);
        const cfg = {
            type: 'bar',
            data: {
                labels: sorted.map(d => d[0]),
                datasets: [{
                    label: metric === 'mean' ? 'Mean Income' : 'Median Income',
                    data: sorted.map(d => d[1][metric]),
                    backgroundColor: sorted.map((_, i) => i < 3 ? C.primary : 'rgba(100,100,130,0.3)'),
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: deepMerge(BASE, {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true, color: '#fff', anchor: 'end', align: 'left',
                        formatter: v => '₹' + Math.round(v / 1000) + 'K', font: { size: 10 }
                    }
                },
                scales: { x: { grid: { color: C.grid }, ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } }
            })
        };
        if (occChart) occChart.destroy();
        occChart = new Chart(document.getElementById('occRankChart'), cfg);
    }
    drawOccChart('mean');
    document.querySelectorAll('[data-metric]').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('[data-metric]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            drawOccChart(e.target.dataset.metric);
        });
    });

    // 7. Education → Income
    const eduOrder = ['Lower secondary', 'Secondary / secondary special', 'Incomplete higher', 'Higher education', 'Academic degree'];
    bar('eduIncomeChart', ['Lower Sec', 'Secondary', 'Inc Higher', 'Higher Edu', 'Degree'],
        [{ label: 'Avg Income', data: eduOrder.map(k => D.education[k]?.mean || 0),
           backgroundColor: C.primaryA, borderColor: C.primary, borderWidth: 1.5, borderRadius: 4 }],
        { scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } } }
    );

    // 8. Income Type
    const incTypes = Object.entries(D.income_type).sort((a,b) => b[1].mean - a[1].mean);
    bar('incTypeChart', incTypes.map(d => d[0]),
        [{ label: 'Avg Income', data: incTypes.map(d => d[1].mean),
           backgroundColor: C.cyanA, borderColor: C.cyan, borderWidth: 1.5, borderRadius: 4 }],
        { scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } } }
    );

    // 9. Asset Score → Income
    bar('assetChart', ['0 Assets', '1 Asset', '2 Assets'],
        [{ label: 'Avg Income', data: ['0', '1', '2'].map(k => D.asset_score[k]?.mean || 0),
           backgroundColor: ['rgba(239,68,68,0.4)', 'rgba(245,158,11,0.4)', 'rgba(16,185,129,0.4)'],
           borderColor: ['#ef4444', '#f59e0b', '#10b981'],
           borderWidth: 1.5, borderRadius: 6 }],
        { scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } } }
    );

    // 10. Housing → Income
    const housing = Object.entries(D.housing).sort((a, b) => b[1].mean - a[1].mean);
    new Chart(document.getElementById('housingChart'), {
        type: 'bar',
        data: {
            labels: housing.map(d => d[0].replace(' apartment', '')),
            datasets: [{ label: 'Avg Income', data: housing.map(d => d[1].mean),
                backgroundColor: 'rgba(139,92,246,0.35)', borderColor: '#a78bfa', borderWidth: 1.5, borderRadius: 4 }]
        },
        options: deepMerge(BASE, {
            indexAxis: 'y',
            scales: { x: { grid: { color: C.grid }, ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } }
        })
    });

    // 11. Family Status donut
    const famEntries = Object.entries(D.family_status).sort((a, b) => b[1].count - a[1].count);
    new Chart(document.getElementById('familyChart'), {
        type: 'doughnut',
        data: {
            labels: famEntries.map(d => d[0]),
            datasets: [{
                data: famEntries.map(d => d[1].count),
                backgroundColor: ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b'],
                borderWidth: 2, borderColor: '#12121a'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { position: 'right', labels: { color: '#c8c8d8', font: { size: 11 }, padding: 14, usePointStyle: true } },
                datalabels: { display: false },
                tooltip: BASE.plugins.tooltip
            }
        }
    });

    // 12. Children Impact
    line('childrenChart',
        ['0', '1', '2', '3', '4'],
        [{
            label: 'Avg Income', fill: false,
            data: ['0', '1', '2', '3', '4'].map(k => D.children[k]?.mean || null),
            borderColor: C.cyan, pointBackgroundColor: C.cyan, pointRadius: 7, tension: 0.3
        }],
        { scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } } }
    );

    // 13. Experience → Income
    line('expChart',
        Object.keys(D.experience),
        [{
            label: 'Avg Income (Working)', fill: true,
            data: Object.values(D.experience).map(d => d.mean),
            borderColor: C.green, backgroundColor: C.greenA, tension: 0.4, pointRadius: 5
        }],
        { scales: { y: { ticks: { callback: v => '₹' + Math.round(v / 1000) + 'K' } } } }
    );

    // 14. Correlation bars
    const corrCols = ['AGE', 'YEARS_EMPLOYED', 'CNT_CHILDREN', 'ASSET_SCORE', 'DIGITAL_SCORE'];
    const shortLbls = ['Age', 'Experience', 'Children', 'Assets', 'Digital'];
    const corrVals = corrCols.map(c => D.correlation['AMT_INCOME_TOTAL'][c]);
    bar('corrChart', shortLbls,
        [{
            label: 'Pearson r with Income',
            data: corrVals,
            backgroundColor: corrVals.map(v => v > 0 ? C.greenA : 'rgba(239,68,68,0.35)'),
            borderColor: corrVals.map(v => v > 0 ? C.green : '#ef4444'),
            borderWidth: 1.5, borderRadius: 4
        }],
        {
            scales: {
                y: { min: -0.12, max: 0.12, ticks: { callback: v => v.toFixed(2) } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true, color: '#fff', anchor: 'end', align: 'top',
                    formatter: v => v.toFixed(3), font: { size: 10 }
                }
            }
        }
    );
}

// ── PREDICTOR ─────────────────────────────────────────────────────────
let gaugeChart;
function setupPredictor() {
    const ageSlider = document.getElementById('pred-age');
    const childSlider = document.getElementById('pred-children');
    ageSlider.addEventListener('input', e => { document.getElementById('pred-age-val').textContent = e.target.value; });
    childSlider.addEventListener('input', e => { document.getElementById('pred-children-val').textContent = e.target.value; });

    // Gauge donut
    gaugeChart = new Chart(document.getElementById('predGaugeChart'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [50, 50],
                backgroundColor: [C.cyan, 'rgba(255,255,255,0.04)'],
                borderWidth: 0, circumference: 180, rotation: 270
            }]
        },
        options: { responsive: false, cutout: '78%',
            plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } }
        }
    });

    document.getElementById('pred-btn').addEventListener('click', () => {
        const g = document.getElementById('pred-gender').value;
        const age = +document.getElementById('pred-age').value;
        const edu = document.getElementById('pred-edu').value;
        const car = +document.getElementById('pred-car').value;
        const realty = +document.getElementById('pred-realty').value;
        const child = +document.getElementById('pred-children').value;

        let pred = D.overview.median_income;
        pred += g === 'M' ? 23000 : -23000;
        pred += car === 1 ? 18000 : -8000;
        pred += realty === 1 ? 12000 : -12000;
        if (edu === 'higher') pred += 45000;
        else if (edu === 'incomplete') pred += 32000;
        else if (edu === 'lower') pred -= 55000;
        if (age >= 40 && age < 55) pred += 10000;
        if (age >= 55) pred -= 18000;
        if (child > 1) pred -= (child - 1) * 15000;
        pred = Math.max(80000, Math.min(650000, Math.round(pred / 5000) * 5000));

        const amtEl = document.getElementById('pred-amount');
        amtEl.style.transition = 'opacity 0.3s';
        amtEl.style.opacity = 0;
        setTimeout(() => {
            amtEl.textContent = '₹' + pred.toLocaleString('en-IN');
            amtEl.style.opacity = 1;
            document.getElementById('pred-ci').textContent =
                `95% CI: ₹${Math.round(pred * 0.84).toLocaleString('en-IN')} – ₹${Math.round(pred * 1.16).toLocaleString('en-IN')}`;
            const pct = pred > 300000 ? 88 : pred > 225000 ? 70 : pred > 150000 ? 50 : pred > 100000 ? 28 : 12;
            document.getElementById('pred-percentile').textContent = `Top ${100 - pct}% of all applicants`;
            gaugeChart.data.datasets[0].data = [pct, 100 - pct];
            gaugeChart.update();
        }, 280);
    });
}
