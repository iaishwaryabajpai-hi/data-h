#!/usr/bin/env python3
"""
CreditLens — Dataset Cleaner
Removes duplicates, handles outliers, regenerates data.json
"""
import pandas as pd
import numpy as np
import json, shutil, os

SRC   = '/Users/aishwarya/Downloads/application_record.xlsx'
OUT_J = '/Users/aishwarya/Downloads/credit_dashboard/public/data.json'

# ── 1. LOAD ───────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_excel(SRC)
raw_n = len(df)
print(f"  Raw records: {raw_n:,}")
print(f"  Columns: {list(df.columns)}")
print(f"  Dtypes:\n{df.dtypes}\n")

# ── 2. STANDARDISE COLUMN NAMES ───────────────────────────────
df.columns = [c.strip().upper().replace(' ', '_') for c in df.columns]

# ── 3. REPORT BEFORE ─────────────────────────────────────────
print("=== BEFORE CLEANING ===")
print(f"  Rows              : {len(df):,}")
print(f"  Full duplicates   : {df.duplicated().sum():,}")
if 'ID' in df.columns:
    print(f"  Duplicate IDs     : {df.duplicated(subset='ID').sum():,}")
print(f"  Nulls per column  :\n{df.isnull().sum()[df.isnull().sum()>0]}\n")

# ── 4. DROP EXACT DUPLICATES ──────────────────────────────────
before = len(df)
df.drop_duplicates(inplace=True)
print(f"  Dropped exact duplicates: {before - len(df):,}")

# ── 5. DROP DUPLICATE IDs (keep first) ───────────────────────
if 'ID' in df.columns:
    before = len(df)
    df.drop_duplicates(subset='ID', keep='first', inplace=True)
    print(f"  Dropped duplicate IDs   : {before - len(df):,}")

df.reset_index(drop=True, inplace=True)

# ── 6. CLEAN INCOME ───────────────────────────────────────────
# Remove impossible values
before = len(df)
df = df[df['AMT_INCOME_TOTAL'] > 0]
df = df[df['AMT_INCOME_TOTAL'] < 10_000_000]   # cap at 10M
print(f"  Dropped invalid incomes : {before - len(df):,}")

# ── 7. FIX DAYS COLUMNS (DAYS_BIRTH / DAYS_EMPLOYED) ─────────
# DAYS_BIRTH is negative (days before application) → convert to age
if 'DAYS_BIRTH' in df.columns:
    df['AGE'] = (-df['DAYS_BIRTH'] / 365.25).astype(int)
    df = df[(df['AGE'] >= 18) & (df['AGE'] <= 80)]

# DAYS_EMPLOYED: positive outlier (365243) means unemployed/pensioner
if 'DAYS_EMPLOYED' in df.columns:
    df['YEARS_EMPLOYED'] = np.where(
        df['DAYS_EMPLOYED'] > 0,          # XNA / unemployed flag
        0,
        (-df['DAYS_EMPLOYED'] / 365.25).round(1)
    )

# ── 8. STANDARDISE CATEGORICALS ──────────────────────────────
cat_maps = {
    'CODE_GENDER': {'M': 'M', 'F': 'F'},
    'FLAG_OWN_CAR': {'Y': 1, 'N': 0},
    'FLAG_OWN_REALTY': {'Y': 1, 'N': 0},
}
for col, mapping in cat_maps.items():
    if col in df.columns:
        df[col] = df[col].map(mapping)

# Drop rows where gender is ambiguous/null
if 'CODE_GENDER' in df.columns:
    before = len(df)
    df = df[df['CODE_GENDER'].isin(['M', 'F'])]
    print(f"  Dropped ambiguous gender: {before - len(df):,}")

# ── 9. FEATURE ENGINEERING ───────────────────────────────────
df['ASSET_SCORE']   = df['FLAG_OWN_CAR'].fillna(0) + df['FLAG_OWN_REALTY'].fillna(0)
df['DIGITAL_SCORE'] = df.get('FLAG_EMAIL', pd.Series(0, index=df.index)).fillna(0) + df.get('FLAG_WORK_PHONE', pd.Series(0, index=df.index)).fillna(0)
if 'FLAG_EMAIL' in df.columns and 'FLAG_WORK_PHONE' in df.columns:
    df['DIGITAL_SCORE'] = df['FLAG_EMAIL'].fillna(0) + df['FLAG_WORK_PHONE'].fillna(0)
df['EXP_BRACKET']   = pd.cut(df['YEARS_EMPLOYED'],
                              bins=[-1, 0, 2, 5, 10, 20, 100],
                              labels=['Unemployed','<2yr','2-5yr','5-10yr','10-20yr','20+yr'])

# ── 10. REPORT AFTER ─────────────────────────────────────────
print(f"\n=== AFTER CLEANING ===")
print(f"  Rows remaining    : {len(df):,}  (removed {raw_n - len(df):,} rows, {(raw_n-len(df))/raw_n*100:.1f}%)")
print(f"  Nulls per column  :\n{df.isnull().sum()[df.isnull().sum()>0]}\n")

# ── 11. COMPUTE STATS FOR data.json ──────────────────────────
def safe_round(v, d=2):
    try: return round(float(v), d)
    except: return 0

def income_stats(sub):
    return {'mean': int(sub['AMT_INCOME_TOTAL'].mean()),
            'median': int(sub['AMT_INCOME_TOTAL'].median()),
            'count': int(len(sub))}

# Gender
gender_income = df.groupby('CODE_GENDER')['AMT_INCOME_TOTAL'].mean().to_dict()
male_inc   = gender_income.get('M', 0)
female_inc = gender_income.get('F', 0)
gap_pct = safe_round(abs(male_inc - female_inc) / max(male_inc,1) * 100, 1)

def gini(arr):
    a = np.sort(np.array(arr, dtype=float))
    n = len(a)
    if n == 0: return 0
    idx = np.arange(1, n+1)
    return safe_round((2*np.sum(idx*a) - (n+1)*np.sum(a)) / (n*np.sum(a)), 3)

inc = df['AMT_INCOME_TOTAL'].values

# Occupation income
occ_col = next((c for c in df.columns if 'OCCUPATION' in c), None)
occupation = {}
if occ_col:
    for occ, grp in df[df[occ_col].notna()].groupby(occ_col):
        occupation[str(occ)] = income_stats(grp)

# Education
edu_col = next((c for c in df.columns if 'EDUCATION' in c), None)
education = {}
if edu_col:
    for edu, grp in df.groupby(edu_col):
        education[str(edu)] = income_stats(grp)

# Income type
inc_type_col = next((c for c in df.columns if 'INCOME_TYPE' in c), None)
income_type = {}
if inc_type_col:
    for it, grp in df.groupby(inc_type_col):
        income_type[str(it)] = income_stats(grp)

# Housing
housing_col = next((c for c in df.columns if 'HOUSING' in c), None)
housing = {}
if housing_col:
    for h, grp in df.groupby(housing_col):
        housing[str(h)] = income_stats(grp)

# Family status
fam_col = next((c for c in df.columns if 'FAMILY_STATUS' in c), None)
family_status = {}
if fam_col:
    for fs, grp in df.groupby(fam_col):
        family_status[str(fs)] = income_stats(grp)

# Gender × education
gender_education = {}
if edu_col and 'CODE_GENDER' in df.columns:
    for g, gdf in df.groupby('CODE_GENDER'):
        gender_education[g] = {str(edu): int(grp['AMT_INCOME_TOTAL'].mean())
                                for edu, grp in gdf.groupby(edu_col)}

# Gender × occupation
occupation_gender = {}
if occ_col and 'CODE_GENDER' in df.columns:
    for occ, odf in df[df[occ_col].notna()].groupby(occ_col):
        occupation_gender[str(occ)] = {g: int(grp['AMT_INCOME_TOTAL'].mean())
                                       for g, grp in odf.groupby('CODE_GENDER')}

# Asset score
asset_score = {}
for sc, grp in df.groupby('ASSET_SCORE'):
    asset_score[str(int(sc))] = income_stats(grp)

# Children
children = {}
if 'CNT_CHILDREN' in df.columns:
    for c, grp in df[df['CNT_CHILDREN'] <= 5].groupby('CNT_CHILDREN'):
        children[str(int(c))] = income_stats(grp)

# Experience brackets
experience = {}
if 'EXP_BRACKET' in df.columns:
    for eb, grp in df[df['YEARS_EMPLOYED'] > 0].groupby('EXP_BRACKET', observed=True):
        experience[str(eb)] = income_stats(grp)

# Age distribution (5-year buckets)
df['AGE_BIN'] = pd.cut(df['AGE'], bins=range(18, 75, 5), right=False)
age_distribution = df.groupby('AGE_BIN', observed=True).size().to_dict()
age_distribution = {str(k): int(v) for k, v in age_distribution.items()}

# Age × gender income line (yearly)
age_income_line_M, age_income_line_F = {}, {}
if 'CODE_GENDER' in df.columns:
    for g, sub in df.groupby('CODE_GENDER'):
        by_age = sub.groupby('AGE')['AMT_INCOME_TOTAL'].mean().to_dict()
        if g == 'M':
            age_income_line_M = {str(k): int(v) for k, v in by_age.items()}
        else:
            age_income_line_F = {str(k): int(v) for k, v in by_age.items()}

# Income distribution buckets
bins = [0, 50_000, 100_000, 150_000, 200_000, 250_000, 300_000,
        400_000, 500_000, 750_000, 1_000_000, float('inf')]
labels = ['0-50K','50-100K','100-150K','150-200K','200-250K','250-300K',
          '300-400K','400-500K','500-750K','750K-1M','1M+']
df['INC_BIN'] = pd.cut(df['AMT_INCOME_TOTAL'], bins=bins, labels=labels)
income_distribution = df.groupby('INC_BIN', observed=True).size().to_dict()
income_distribution = {str(k): int(v) for k, v in income_distribution.items()}

# Correlations
corr_cols = [c for c in ['AGE','YEARS_EMPLOYED','CNT_CHILDREN','ASSET_SCORE','DIGITAL_SCORE'] if c in df.columns]
correlation = {}
for c1 in ['AMT_INCOME_TOTAL']:
    correlation[c1] = {}
    for c2 in corr_cols:
        try:
            correlation[c1][c2] = safe_round(df[c1].corr(df[c2]), 4)
        except:
            correlation[c1][c2] = 0

# Gender summary
gender = {
    'income': {g: int(v) for g,v in df.groupby('CODE_GENDER')['AMT_INCOME_TOTAL'].mean().items()},
    'car_ownership': {g: safe_round(grp['FLAG_OWN_CAR'].mean()*100, 1)
                     for g, grp in df.groupby('CODE_GENDER') if 'FLAG_OWN_CAR' in df.columns},
    'realty_ownership': {g: safe_round(grp['FLAG_OWN_REALTY'].mean()*100, 1)
                        for g, grp in df.groupby('CODE_GENDER') if 'FLAG_OWN_REALTY' in df.columns},
}

# ── 12. ASSEMBLE OUTPUT ───────────────────────────────────────
female_count = int((df['CODE_GENDER'] == 'F').sum()) if 'CODE_GENDER' in df.columns else 0
total = len(df)

data = {
    'overview': {
        'total_applicants': total,
        'avg_income': int(df['AMT_INCOME_TOTAL'].mean()),
        'median_income': int(df['AMT_INCOME_TOTAL'].median()),
        'avg_age': safe_round(df['AGE'].mean(), 1) if 'AGE' in df.columns else 0,
        'female_pct': safe_round(female_count / total * 100, 1),
        'gender_gap_pct': gap_pct,
        'gini': gini(inc),
        'realty_ownership_pct': safe_round(df['FLAG_OWN_REALTY'].mean()*100, 1) if 'FLAG_OWN_REALTY' in df.columns else 0,
        'car_ownership_pct': safe_round(df['FLAG_OWN_CAR'].mean()*100, 1) if 'FLAG_OWN_CAR' in df.columns else 0,
        'records_removed': raw_n - total,
        'pct_cleaned': safe_round((raw_n - total) / raw_n * 100, 1),
    },
    'gender': gender,
    'income_distribution': income_distribution,
    'age_distribution': age_distribution,
    'age_income_line_M': age_income_line_M,
    'age_income_line_F': age_income_line_F,
    'education': education,
    'gender_education': gender_education,
    'income_type': income_type,
    'occupation': occupation,
    'occupation_gender': occupation_gender,
    'housing': housing,
    'family_status': family_status,
    'asset_score': asset_score,
    'children': children,
    'experience': experience,
    'correlation': correlation,
}

# ── 13. WRITE FILES ───────────────────────────────────────────
with open(OUT_J, 'w') as f:
    json.dump(data, f, indent=2)
print(f"✅  data.json written → {OUT_J}")

# Also export cleaned CSV for reference
csv_path = '/Users/aishwarya/Downloads/credit_dashboard/application_clean.csv'
df.to_csv(csv_path, index=False)
print(f"✅  Clean CSV written → {csv_path}")
print(f"\n{'='*50}")
print(f"  Original: {raw_n:,} records")
print(f"  Cleaned : {total:,} records")
print(f"  Removed : {raw_n - total:,} rows ({(raw_n-total)/raw_n*100:.1f}%)")
print(f"{'='*50}\n")
