#!/usr/bin/env python3
"""
CreditLens — Ad-Hoc Data Analysis
Performs statistical analysis and regression modeling on the cleaned credit dataset.
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

CSV_PATH = '/Users/aishwarya/Downloads/credit_dashboard/application_clean.csv'

def main():
    print("========================================")
    print("      CreditLens Data Analysis          ")
    print("========================================")
    
    try:
        df = pd.read_csv(CSV_PATH)
    except FileNotFoundError:
        print(f"Error: Could not find {CSV_PATH}. Please run clean_data.py first.")
        return

    print(f"\n1. DATASET OVERVIEW")
    print(f"Total records: {len(df):,}")
    print(f"Average Income: ₹{df['AMT_INCOME_TOTAL'].mean():,.2f}")
    print(f"Median Income: ₹{df['AMT_INCOME_TOTAL'].median():,.2f}")
    print(f"Average Age: {df['AGE'].mean():.1f} years")

    print("\n2. GENDER DISPARITY ANALYSIS")
    gender_group = df.groupby('CODE_GENDER')['AMT_INCOME_TOTAL'].agg(['mean', 'median', 'count'])
    print(gender_group)
    
    if 'M' in gender_group.index and 'F' in gender_group.index:
        diff = gender_group.loc['M', 'mean'] - gender_group.loc['F', 'mean']
        pct = (diff / gender_group.loc['M', 'mean']) * 100
        print(f"-> The gender pay gap is ₹{diff:,.2f} ({pct:.1f}%)")

    print("\n3. EDUCATION VS INCOME")
    if 'NAME_EDUCATION_TYPE' in df.columns:
        edu_group = df.groupby('NAME_EDUCATION_TYPE')['AMT_INCOME_TOTAL'].mean().sort_values(ascending=False)
        for edu, inc in edu_group.items():
            print(f"{edu:30s} : ₹{inc:,.2f}")

    print("\n4. LINEAR REGRESSION: PREDICTING INCOME")
    print("Training simple regression model...")
    
    # Prepare features
    features = ['AGE', 'ASSET_SCORE', 'CNT_CHILDREN']
    if 'YEARS_EMPLOYED' in df.columns:
        features.append('YEARS_EMPLOYED')
        
    model_df = df.dropna(subset=features + ['AMT_INCOME_TOTAL']).copy()
    
    X = model_df[features]
    y = model_df['AMT_INCOME_TOTAL']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    reg = LinearRegression()
    reg.fit(X_train, y_train)
    y_pred = reg.predict(X_test)
    
    print("\nModel Coefficients:")
    for feature, coef in zip(features, reg.coef_):
        print(f"  {feature:15s}: ₹{coef:,.2f}")
        
    print(f"  Intercept      : ₹{reg.intercept_:,.2f}")
    
    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    print(f"\nModel Performance:")
    print(f"  R² Score : {r2:.4f}")
    print(f"  RMSE     : ₹{rmse:,.2f}")
    
    print("\nNote: Low R² indicates that income is highly dependent on factors")
    print("like occupation and education, which were excluded from this simple numeric model.")
    print("========================================")

if __name__ == "__main__":
    main()
