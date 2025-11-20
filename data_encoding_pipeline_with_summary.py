# ============================================
# DATA ENCODING + AUTOMATIC SUMMARY PIPELINE
# For: Image_Verification_Results.csv
# Task: Clean + Encode categorical columns + Export to CSV, Excel, JSON + Auto Summary
# ============================================

import pandas as pd
import numpy as np
import re
from pathlib import Path
from sklearn.preprocessing import LabelEncoder

# --- File paths ---
base_path = Path(__file__).parent
csv_path = base_path / "Image_Verification_Results.csv"

# Output paths
out_clean_csv = base_path / "Image_Verification_Results_cleaned.csv"
out_encoded_csv = base_path / "Image_Verification_Results_encoded.csv"
out_excel = base_path / "Image_Verification_Results_cleaned.xlsx"
out_json = base_path / "Image_Verification_Results_cleaned.json"
out_summary = base_path / "data_summary.txt"

# --- 1. Load dataset ---
print("📂 Loading dataset...")
df = pd.read_csv(csv_path)
print(f"✅ Loaded dataset with {df.shape[0]} rows and {df.shape[1]} columns")

# --- 2. Clean column names and string values ---
df.columns = [re.sub(r'\s+', '_', c.strip().lower()) for c in df.columns]

for c in df.select_dtypes(include="object").columns:
    df[c] = df[c].astype(str).str.strip().replace({'nan': np.nan})

# Replace placeholder text values with NaN
unknowns = ['other', 'unknown', 'n/a', 'na', '-', 'none', 'null']
for c in df.select_dtypes(include="object").columns:
    df[c] = df[c].replace({v: np.nan for v in unknowns})

# Drop duplicate rows
df = df.drop_duplicates().reset_index(drop=True)
print("🧹 Cleaned data: removed duplicates and standardized text")

# --- 3. Save cleaned data in multiple formats ---
df.to_csv(out_clean_csv, index=False)
df.to_excel(out_excel, index=False)
df.to_json(out_json, orient='records', force_ascii=False)
print("💾 Cleaned data saved as:")
print("-", out_clean_csv.name)
print("-", out_excel.name)
print("-", out_json.name)

# --- 4. Encode categorical columns ---
print("\n⚙️ Encoding categorical features...")
df_encoded = df.copy()
categorical_cols = df_encoded.select_dtypes(include=['object']).columns.tolist()

le = LabelEncoder()

for c in categorical_cols:
    nunique = df_encoded[c].nunique(dropna=True)
    if nunique == 2:
        df_encoded[c] = le.fit_transform(df_encoded[c].astype(str))
    elif 2 < nunique <= 20:
        df_encoded = pd.get_dummies(df_encoded, columns=[c], dummy_na=True, drop_first=False)
    elif nunique > 200:
        df_encoded[c + "_hash"] = df_encoded[c].astype(str).apply(lambda x: hash(x) % (10**8))
        df_encoded.drop(columns=[c], inplace=True)

df_encoded.to_csv(out_encoded_csv, index=False)
print(f"✅ Encoded dataset saved as: {out_encoded_csv.name}")

# --- 5. Automatic Summary / EDA ---
summary_lines = []
summary_lines.append("==== AUTOMATIC DATA SUMMARY ====")
summary_lines.append(f"Rows: {df.shape[0]}, Columns: {df.shape[1]}\n")
summary_lines.append("Column Data Types:")
summary_lines.append(str(df.dtypes))
summary_lines.append("\nMissing Values (Top 20):")
summary_lines.append(str(df.isnull().sum().sort_values(ascending=False).head(20)))

# Categorical summaries
summary_lines.append("\nCategorical Column Sample Values:")
for c in df.select_dtypes(include=['object']).columns[:10]:
    summary_lines.append(f"\nColumn: {c}")
    summary_lines.append(str(df[c].value_counts(dropna=False).head(5)))

# Numeric summaries
summary_lines.append("\nNumeric Summary:")
summary_lines.append(str(df.describe(include=[np.number]).transpose().head(10)))

# Save summary to file
with open(out_summary, "w", encoding="utf-8") as f:
    f.write("\n".join(summary_lines))

print(f"📊 Automatic summary saved as: {out_summary.name}")

# --- 6. Completion Message ---
print("\n🎉 Encoding + Summary pipeline complete.")
print("Files generated:")
print("-", out_clean_csv)
print("-", out_excel)
print("-", out_json)
print("-", out_encoded_csv)
print("-", out_summary)
