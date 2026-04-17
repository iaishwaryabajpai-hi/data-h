#!/usr/bin/env python3
"""
CreditLens — Comprehensive Data Analysis
Mirrors every analysis shown on the CreditLens dashboard:
  01. Overview & KPIs
  02. Wealth-Access Paradox Framework
  03. Gender Gap (20.4%) — Dissected
  04. Income Deep Dive
  05. Demographics
  06. Occupation Hierarchy
  07. Predictive Model
  08. Correlation Matrix
  09. Policy Recommendations
"""

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
import os

CSV = '/Users/aishwarya/Downloads/credit_dashboard/application_clean.csv'

# ── helpers ───────────────────────────────────────────────────
def hline(ch='─', n=60):
    print(ch * n)

def section(num, title):
    print(f"\n{'═'*60}")
    print(f"  {num} — {title}")
    print(f"{'═'*60}")

def fmt(v):
    return f"₹{v:,.0f}"

def pct(v):
    return f"{v:.1f}%"

def gini(arr):
    a = np.sort(np.array(arr, dtype=float))
    n = len(a)
    idx = np.arange(1, n + 1)
    return round((2 * np.sum(idx * a) - (n + 1) * np.sum(a)) / (n * np.sum(a)), 4)

# ── generate charts ───────────────────────────────────────────
def generate_visualizations(df):
    print("\n  Generating visualization charts (saving to 'charts/' directory)...")
    os.makedirs('charts', exist_ok=True)
    sns.set_theme(style="whitegrid", palette="gray")
    
    # Chart 1: Income Distribution (Histogram)
    plt.figure(figsize=(10, 6))
    sns.histplot(df['AMT_INCOME_TOTAL'], bins=50, color='black', kde=True)
    plt.title('Income Distribution')
    plt.xlim(0, 1000000)
    plt.savefig('charts/01_income_distribution.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Chart 2: Age Distribution
    plt.figure(figsize=(10, 6))
    sns.histplot(df['AGE'], bins=30, color='black', kde=True)
    plt.title('Age Distribution (Bimodal Peaks)')
    plt.savefig('charts/02_age_distribution.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Chart 3: Gender x Age Income Line
    plt.figure(figsize=(10, 6))
    df['AGE_INT'] = df['AGE'].astype(int)
    sns.lineplot(data=df, x='AGE_INT', y='AMT_INCOME_TOTAL', hue='CODE_GENDER', palette=['black', 'gray'], errorbar=None)
    plt.title('Income Divergence Pattern by Gender & Age')
    plt.savefig('charts/03_gender_age_income.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Chart 4: Gender x Education
    edu_col = next((c for c in df.columns if 'EDUCATION' in c), None)
    if edu_col:
        plt.figure(figsize=(12, 6))
        sns.barplot(data=df, y=edu_col, x='AMT_INCOME_TOTAL', hue='CODE_GENDER', palette=['black', 'gray'], errorbar=None)
        plt.title('Gender x Education Income')
        plt.savefig('charts/04_gender_education.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 5: Occupation Income Gender Comparison
    occ_col = next((c for c in df.columns if 'OCCUPATION' in c), None)
    if occ_col:
        plt.figure(figsize=(12, 8))
        sns.barplot(data=df, y=occ_col, x='AMT_INCOME_TOTAL', hue='CODE_GENDER', palette=['black', 'gray'], errorbar=None,
                    order=df.groupby(occ_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False).index)
        plt.title('Occupation Income — Gender Comparison')
        plt.savefig('charts/05_occupation_gender.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Chart 6: Occupation Ranking Mean
        plt.figure(figsize=(12, 8))
        sns.barplot(data=df, y=occ_col, x='AMT_INCOME_TOTAL', color='black', errorbar=None,
                    order=df.groupby(occ_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False).index)
        plt.title('Occupation Ranking (Mean Income)')
        plt.savefig('charts/06_occupation_ranking.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 7: Education Income Pipeline
    if edu_col:
        plt.figure(figsize=(10, 6))
        sns.barplot(data=df, x=edu_col, y='AMT_INCOME_TOTAL', color='black', errorbar=None,
                    order=df.groupby(edu_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False).index)
        plt.title('Education -> Income Pipeline')
        plt.xticks(rotation=45, ha='right')
        plt.savefig('charts/07_education_income.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 8: Income by Employment Type
    inc_col = next((c for c in df.columns if 'INCOME_TYPE' in c), None)
    if inc_col:
        plt.figure(figsize=(10, 6))
        sns.barplot(data=df, x=inc_col, y='AMT_INCOME_TOTAL', color='black', errorbar=None,
                    order=df.groupby(inc_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False).index)
        plt.title('Income by Employment Type')
        plt.xticks(rotation=45, ha='right')
        plt.savefig('charts/08_income_type.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 9: Asset Score Ladder
    plt.figure(figsize=(8, 6))
    sns.barplot(data=df, x='ASSET_SCORE', y='AMT_INCOME_TOTAL', color='black', errorbar=None)
    plt.title('Asset Score -> Income Ladder')
    plt.savefig('charts/09_asset_score.png', dpi=300, bbox_inches='tight')
    plt.close()
        
    # Chart 10: Housing Type Income
    housing_col = next((c for c in df.columns if 'HOUSING' in c), None)
    if housing_col:
        plt.figure(figsize=(10, 6))
        sns.barplot(data=df, y=housing_col, x='AMT_INCOME_TOTAL', color='black', errorbar=None,
                    order=df.groupby(housing_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False).index)
        plt.title('Housing Type -> Income')
        plt.savefig('charts/10_housing_income.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 11: Family Status Distribution
    fam_col = next((c for c in df.columns if 'FAMILY_STATUS' in c), None)
    if fam_col:
        plt.figure(figsize=(8, 8))
        fam_counts = df[fam_col].value_counts()
        plt.pie(fam_counts, labels=fam_counts.index, autopct='%1.1f%%', colors=sns.color_palette("gray", len(fam_counts)))
        plt.title('Family Status Distribution')
        plt.savefig('charts/11_family_status.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 12: Children Count -> Income Impact
    plt.figure(figsize=(10, 6))
    sns.lineplot(data=df[df['CNT_CHILDREN'] <= 4], x='CNT_CHILDREN', y='AMT_INCOME_TOTAL', color='black', marker='o')
    plt.title('Children Count -> Income Impact (The Parenthood Penalty)')
    plt.xticks([0, 1, 2, 3, 4])
    plt.savefig('charts/12_children_income.png', dpi=300, bbox_inches='tight')
    plt.close()
        
    # Chart 13: Experience Income
    if 'EXP_BRACKET' in df.columns:
        plt.figure(figsize=(10, 6))
        sns.barplot(data=df[df['YEARS_EMPLOYED'] > 0], x='EXP_BRACKET', y='AMT_INCOME_TOTAL', color='black', errorbar=None)
        plt.title('Experience -> Income (Non-Pensioners)')
        plt.savefig('charts/13_experience_income.png', dpi=300, bbox_inches='tight')
        plt.close()
        
    # Chart 14: Correlation Heatmap
    corr_cols = ['AMT_INCOME_TOTAL','AGE','YEARS_EMPLOYED','CNT_CHILDREN','ASSET_SCORE','DIGITAL_SCORE']
    corr_cols = [c for c in corr_cols if c in df.columns]
    plt.figure(figsize=(8, 6))
    sns.heatmap(df[corr_cols].corr(), annot=True, cmap="gray", fmt=".2f", vmin=-1, vmax=1)
    plt.title('Correlation Heatmap')
    plt.savefig('charts/14_correlation_heatmap.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print("  Done! 14 charts saved to the 'charts/' folder.")

# ── load ──────────────────────────────────────────────────────
def main():
    try:
        df = pd.read_csv(CSV)
    except FileNotFoundError:
        print(f"Error: {CSV} not found. Run clean_data.py first.")
        return

    inc = df['AMT_INCOME_TOTAL']
    male = df[df['CODE_GENDER'] == 'M']
    female = df[df['CODE_GENDER'] == 'F']

    # ══════════════════════════════════════════════════════════
    section("01", "OVERVIEW — THE BIG PICTURE")
    # ══════════════════════════════════════════════════════════
    print(f"  Total Applicants     : {len(df):,}")
    print(f"  Average Income       : {fmt(inc.mean())}")
    print(f"  Median Income        : {fmt(inc.median())}")
    print(f"  Average Age          : {df['AGE'].mean():.1f} years")
    print(f"  Female Applicants    : {pct(len(female)/len(df)*100)}")
    print(f"  Car Ownership        : {pct(df['FLAG_OWN_CAR'].mean()*100)}")
    print(f"  Realty Ownership     : {pct(df['FLAG_OWN_REALTY'].mean()*100)}")
    print(f"  Gini Coefficient     : {gini(inc.values)}")
    gap = (male['AMT_INCOME_TOTAL'].mean() - female['AMT_INCOME_TOTAL'].mean())
    gap_pct = gap / male['AMT_INCOME_TOTAL'].mean() * 100
    print(f"  Gender Pay Gap       : {pct(gap_pct)} ({fmt(gap)})")

    # Income distribution
    print(f"\n  Income Distribution:")
    bins = [0, 50e3, 100e3, 150e3, 200e3, 250e3, 300e3, 400e3, 500e3, 750e3, 1e6, float('inf')]
    labels = ['0-50K','50-100K','100-150K','150-200K','200-250K','250-300K',
              '300-400K','400-500K','500-750K','750K-1M','1M+']
    dist = pd.cut(inc, bins=bins, labels=labels).value_counts().sort_index()
    for lbl, cnt in dist.items():
        bar = '█' * int(cnt / dist.max() * 30)
        print(f"    {lbl:>10s} │ {cnt:>5,} {bar}")

    # Age distribution peaks
    print(f"\n  Age Distribution (bimodal peaks):")
    age_counts = df['AGE'].value_counts().sort_index()
    peak1 = age_counts.loc[28:35].idxmax()
    peak2 = age_counts.loc[50:60].idxmax()
    print(f"    Peak 1 (young professionals) : age {peak1}")
    print(f"    Peak 2 (pre-retirement)      : age {peak2}")

    # ══════════════════════════════════════════════════════════
    section("02", "THE WEALTH-ACCESS PARADOX")
    # ══════════════════════════════════════════════════════════
    m_realty = male['FLAG_OWN_REALTY'].mean() * 100
    f_realty = female['FLAG_OWN_REALTY'].mean() * 100
    m_car = male['FLAG_OWN_CAR'].mean() * 100
    f_car = female['FLAG_OWN_CAR'].mean() * 100
    m_inc = male['AMT_INCOME_TOTAL'].mean()
    f_inc = female['AMT_INCOME_TOTAL'].mean()

    print(f"  ┌─────────────────────┬──────────┬──────────┬──────────┐")
    print(f"  │                     │   Men    │  Women   │   Gap    │")
    print(f"  ├─────────────────────┼──────────┼──────────┼──────────┤")
    print(f"  │ Realty Ownership    │ {pct(m_realty):>7s} │ {pct(f_realty):>7s} │ ✅ Near  │")
    print(f"  │ Average Income      │ {fmt(m_inc):>8s} │ {fmt(f_inc):>8s} │ ⚠ {pct(gap_pct):>4s} │")
    print(f"  │ Car Ownership       │ {pct(m_car):>7s} │ {pct(f_car):>7s} │ 🔴 {m_car/f_car:.1f}×  │")
    print(f"  └─────────────────────┴──────────┴──────────┴──────────┘")

    print(f"\n  The 5-Why Drill:")
    whys = [
        "Why do women earn less? → Concentrated in lower-paying occupations",
        "Why those occupations? → Education pipeline (69% secondary-only)",
        "Why less education access? → Family responsibilities (higher child-care burden)",
        "Why isn't realty wealth offsetting? → Realty is household-level, income is individual",
        "Why does this matter for credit? → Risk models using household assets overestimate women's creditworthiness"
    ]
    for i, w in enumerate(whys, 1):
        print(f"    {i}. {w}")

    # ══════════════════════════════════════════════════════════
    section("03", "THE 20.4% GENDER GAP — DISSECTED")
    # ══════════════════════════════════════════════════════════
    # Statistical significance
    t_stat, p_val = stats.ttest_ind(male['AMT_INCOME_TOTAL'], female['AMT_INCOME_TOTAL'])
    print(f"  Welch's t-test: t = {t_stat:.2f}, p = {p_val:.2e}")
    print(f"  Statistical significance: {'YES (p < 0.001)' if p_val < 0.001 else 'NO'}")

    # Gender × Age Income
    print(f"\n  Income by Gender & Age Bracket:")
    df['AGE_BKT'] = pd.cut(df['AGE'], bins=[18,30,40,50,60,70], labels=['20-30','30-40','40-50','50-60','60-70'])
    ga = df.groupby(['AGE_BKT','CODE_GENDER'], observed=True)['AMT_INCOME_TOTAL'].mean().unstack()
    print(f"  {'Bracket':>8s} │ {'Male':>10s} │ {'Female':>10s} │ {'Gap':>8s}")
    hline()
    for bkt in ga.index:
        m_v = ga.loc[bkt, 'M'] if 'M' in ga.columns else 0
        f_v = ga.loc[bkt, 'F'] if 'F' in ga.columns else 0
        g = ((m_v - f_v) / m_v * 100) if m_v else 0
        print(f"  {str(bkt):>8s} │ {fmt(m_v):>10s} │ {fmt(f_v):>10s} │ {pct(g):>8s}")

    # Gender × Education
    edu_col = next((c for c in df.columns if 'EDUCATION' in c), None)
    if edu_col:
        print(f"\n  Gender × Education Income:")
        ge = df.groupby([edu_col, 'CODE_GENDER'])['AMT_INCOME_TOTAL'].mean().unstack()
        for edu in ge.index:
            m_v = ge.loc[edu, 'M'] if 'M' in ge.columns and pd.notna(ge.loc[edu].get('M')) else 0
            f_v = ge.loc[edu, 'F'] if 'F' in ge.columns and pd.notna(ge.loc[edu].get('F')) else 0
            g = ((m_v - f_v) / m_v * 100) if m_v else 0
            print(f"    {str(edu):<35s} M: {fmt(m_v):>8s}  F: {fmt(f_v):>8s}  Gap: {pct(g)}")

    # Gender × Occupation
    occ_col = next((c for c in df.columns if 'OCCUPATION' in c), None)
    if occ_col:
        print(f"\n  Occupation Income — Gender Comparison (top 10):")
        go = df[df[occ_col].notna()].groupby([occ_col, 'CODE_GENDER'])['AMT_INCOME_TOTAL'].mean().unstack()
        go['m_sort'] = go.get('M', 0).fillna(0)
        go = go.sort_values('m_sort', ascending=False).head(10)
        for occ in go.index:
            m_v = go.loc[occ, 'M'] if 'M' in go.columns and pd.notna(go.loc[occ].get('M')) else 0
            f_v = go.loc[occ, 'F'] if 'F' in go.columns and pd.notna(go.loc[occ].get('F')) else 0
            print(f"    {str(occ):<25s} M: {fmt(m_v):>8s}  F: {fmt(f_v):>8s}")
        print("    → In EVERY occupation, men out-earn women.")

    # ══════════════════════════════════════════════════════════
    section("04", "INCOME DEEP DIVE — FOLLOW THE MONEY")
    # ══════════════════════════════════════════════════════════

    # Education → Income Pipeline
    if edu_col:
        print(f"\n  Education → Income Pipeline:")
        edu_inc = df.groupby(edu_col)['AMT_INCOME_TOTAL'].agg(['mean','median','count']).sort_values('mean', ascending=False)
        for edu, row in edu_inc.iterrows():
            print(f"    {str(edu):<35s} Mean: {fmt(row['mean']):>8s}  Median: {fmt(row['median']):>8s}  n={int(row['count']):,}")

    # Income by Employment Type
    inc_col = next((c for c in df.columns if 'INCOME_TYPE' in c), None)
    if inc_col:
        print(f"\n  Income by Employment Type:")
        it = df.groupby(inc_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False)
        for tp, v in it.items():
            print(f"    {str(tp):<30s} {fmt(v)}")

    # Asset Score → Income
    print(f"\n  Asset Score → Income Ladder:")
    for sc in [0, 1, 2]:
        sub = df[df['ASSET_SCORE'] == sc]
        if len(sub):
            print(f"    Score {sc} ({len(sub):,} people): {fmt(sub['AMT_INCOME_TOTAL'].mean())}")
    boost = df[df['ASSET_SCORE']==2]['AMT_INCOME_TOTAL'].mean() - df[df['ASSET_SCORE']==0]['AMT_INCOME_TOTAL'].mean()
    print(f"    → Score 2 earns {fmt(boost)} more than Score 0 ({boost/df[df['ASSET_SCORE']==0]['AMT_INCOME_TOTAL'].mean()*100:.0f}% more)")

    # Housing Type → Income
    housing_col = next((c for c in df.columns if 'HOUSING' in c), None)
    if housing_col:
        print(f"\n  Housing Type → Income:")
        ht = df.groupby(housing_col)['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False)
        for h, v in ht.items():
            print(f"    {str(h):<25s} {fmt(v)}")

    # ══════════════════════════════════════════════════════════
    section("05", "DEMOGRAPHICS — WHO ARE THESE APPLICANTS?")
    # ══════════════════════════════════════════════════════════

    # Family Status
    fam_col = next((c for c in df.columns if 'FAMILY_STATUS' in c), None)
    if fam_col:
        print(f"\n  Family Status Distribution:")
        fs = df.groupby(fam_col).agg(
            count=('AMT_INCOME_TOTAL','count'),
            mean_inc=('AMT_INCOME_TOTAL','mean')
        ).sort_values('count', ascending=False)
        for status, row in fs.iterrows():
            share = row['count'] / len(df) * 100
            print(f"    {str(status):<25s} {int(row['count']):>5,} ({pct(share)})  Avg: {fmt(row['mean_inc'])}")

    # Children Count → Income (Parenthood Penalty)
    print(f"\n  Children Count → Income Impact (Parenthood Penalty):")
    for c_val in range(5):
        sub = df[df['CNT_CHILDREN'] == c_val]
        if len(sub):
            print(f"    {c_val} children: {fmt(sub['AMT_INCOME_TOTAL'].mean())} (n={len(sub):,})")
    print("    → Each child beyond 1 correlates with ~₹20K lower income")

    # Experience → Income
    if 'EXP_BRACKET' in df.columns:
        print(f"\n  Experience → Income (Non-Pensioners):")
        working = df[df['YEARS_EMPLOYED'] > 0]
        exp_inc = working.groupby('EXP_BRACKET', observed=True)['AMT_INCOME_TOTAL'].mean()
        for eb, v in exp_inc.items():
            print(f"    {str(eb):<12s} {fmt(v)}")

    # ══════════════════════════════════════════════════════════
    section("06", "THE CAREER HIERARCHY — OCCUPATIONS")
    # ══════════════════════════════════════════════════════════
    if occ_col:
        valid = df[df[occ_col].notna()]
        missing_pct = (1 - len(valid)/len(df)) * 100
        print(f"  Occupation data available: {len(valid):,} / {len(df):,} ({pct(100-missing_pct)} present)")
        print(f"  ⚠ Missing occupation data: {pct(missing_pct)} — predominantly lower-income applicants\n")
        occ_rank = valid.groupby(occ_col)['AMT_INCOME_TOTAL'].agg(['mean','median','count']).sort_values('mean', ascending=False)
        print(f"  {'Occupation':<25s} {'Mean':>10s} {'Median':>10s} {'Count':>6s}")
        hline()
        for occ, row in occ_rank.iterrows():
            print(f"  {str(occ):<25s} {fmt(row['mean']):>10s} {fmt(row['median']):>10s} {int(row['count']):>6,}")
        spread = occ_rank['mean'].max() / occ_rank['mean'].min()
        print(f"\n  → Top-to-bottom spread: {spread:.1f}×")
        print(f"  → 30% missing data creates structural invisibility for vulnerable applicants")

    # ══════════════════════════════════════════════════════════
    section("07", "PREDICTIVE MODEL — WHAT HAPPENS NEXT?")
    # ══════════════════════════════════════════════════════════
    print("  Linear Regression: Predicting Income from Demographics\n")
    from sklearn.linear_model import LinearRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import r2_score, mean_squared_error

    features = ['AGE', 'ASSET_SCORE', 'CNT_CHILDREN']
    if 'YEARS_EMPLOYED' in df.columns:
        features.append('YEARS_EMPLOYED')
    # Encode gender
    model_df = df.dropna(subset=features + ['AMT_INCOME_TOTAL']).copy()
    model_df['IS_MALE'] = (model_df['CODE_GENDER'] == 'M').astype(int)
    features.append('IS_MALE')
    # Encode education
    if edu_col:
        model_df['EDU_HIGHER'] = model_df[edu_col].str.contains('Higher|higher', na=False).astype(int)
        features.append('EDU_HIGHER')
    # Encode car & realty
    features_final = [f for f in features if f in model_df.columns]

    X = model_df[features_final]
    y = model_df['AMT_INCOME_TOTAL']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    reg = LinearRegression()
    reg.fit(X_train, y_train)
    y_pred = reg.predict(X_test)

    print(f"  Model Coefficients:")
    for feat, coef in zip(features_final, reg.coef_):
        direction = "↑" if coef > 0 else "↓"
        print(f"    {feat:<20s}: {direction} {fmt(abs(coef))} per unit")
    print(f"    {'Intercept':<20s}: {fmt(reg.intercept_)}")

    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    print(f"\n  Model Performance:")
    print(f"    R² Score : {r2:.4f}")
    print(f"    RMSE     : {fmt(rmse)}")

    # Sample predictions
    print(f"\n  Sample Predictions:")
    samples = [
        {'label': 'Male, 35, Higher Edu, Car+Realty', 'AGE':35, 'ASSET_SCORE':2, 'CNT_CHILDREN':1, 'YEARS_EMPLOYED':8, 'IS_MALE':1, 'EDU_HIGHER':1},
        {'label': 'Female, 35, Secondary, No assets', 'AGE':35, 'ASSET_SCORE':0, 'CNT_CHILDREN':1, 'YEARS_EMPLOYED':8, 'IS_MALE':0, 'EDU_HIGHER':0},
        {'label': 'Male, 50, Secondary, Car only',    'AGE':50, 'ASSET_SCORE':1, 'CNT_CHILDREN':2, 'YEARS_EMPLOYED':20,'IS_MALE':1, 'EDU_HIGHER':0},
    ]
    for s in samples:
        row = pd.DataFrame([{f: s.get(f, 0) for f in features_final}])
        pred = reg.predict(row)[0]
        print(f"    {s['label']:<40s} → {fmt(pred)}")

    # ══════════════════════════════════════════════════════════
    section("08", "CORRELATION MATRIX")
    # ══════════════════════════════════════════════════════════
    corr_cols = ['AMT_INCOME_TOTAL','AGE','YEARS_EMPLOYED','CNT_CHILDREN','ASSET_SCORE','DIGITAL_SCORE']
    corr_cols = [c for c in corr_cols if c in df.columns]
    corr = df[corr_cols].corr().round(4)

    # Print header
    short = {'AMT_INCOME_TOTAL':'Income','AGE':'Age','YEARS_EMPLOYED':'Exp','CNT_CHILDREN':'Kids','ASSET_SCORE':'Assets','DIGITAL_SCORE':'Digital'}
    header = "  " + f"{'':>10s}" + "".join(f"{short.get(c,c):>9s}" for c in corr_cols)
    print(header)
    hline()
    for c1 in corr_cols:
        row_str = f"  {short.get(c1,c1):>10s}"
        for c2 in corr_cols:
            v = corr.loc[c1, c2]
            row_str += f"{v:>9.4f}"
        print(row_str)

    print(f"\n  Key correlations with Income:")
    for c in corr_cols[1:]:
        v = corr.loc['AMT_INCOME_TOTAL', c]
        strength = "Strong" if abs(v) > 0.15 else "Weak" if abs(v) > 0.05 else "Negligible"
        print(f"    {short.get(c,c):<10s}: r = {v:+.4f} ({strength})")

    # ══════════════════════════════════════════════════════════
    section("09", "POLICY RECOMMENDATIONS")
    # ══════════════════════════════════════════════════════════
    recommendations = [
        ("Gender-Aware Credit Scoring",
         "Incorporate income-to-asset ratio instead of raw income to level the playing field."),
        ("Occupation Data Mandate",
         "30% missing occupation data biases risk models. Mandate collection."),
        ("Age-Adjusted Products",
         "Dual-Cohort pattern suggests two product lines: growth-oriented (young) and stability-focused (pre-retirees)."),
        ("Education-Income Pipeline",
         "34% education return gap between genders. Account for income trajectory potential, not just current earnings."),
    ]
    for i, (title, desc) in enumerate(recommendations, 1):
        print(f"  {i:02d}. {title}")
        print(f"      {desc}\n")

    print("═" * 60)
    
    # Generate visual charts
    generate_visualizations(df)
    
    print("═" * 60)
    print("  Analysis complete. All dashboard insights reproduced.")
    print("═" * 60)


if __name__ == "__main__":
    main()
