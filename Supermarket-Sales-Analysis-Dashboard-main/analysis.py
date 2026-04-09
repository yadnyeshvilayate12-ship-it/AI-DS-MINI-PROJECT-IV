import pandas as pd
import numpy as np
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# ================================================================
# LOAD AND CLEAN DATA
# ================================================================
print("📊 Loading Supermarket Analysis Dataset...")
df = pd.read_csv("SuperMarket Analysis.csv")

print(f"✓ Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"✓ Columns: {', '.join(df.columns.tolist())}")

# Handle missing values
missing_values = df.isnull().sum()
if missing_values.sum() > 0:
    print(f"⚠️  Found {missing_values.sum()} missing values. Removing rows with NaN...")
    df = df.dropna()

# Convert Date column (handle mixed formats)
print("🔄 Processing Date column...")
df['Date'] = pd.to_datetime(df['Date'], format='mixed')

# Ensure numeric columns
print("🔄 Converting numeric columns...")
numeric_cols = ['Unit price', 'Quantity', 'Tax 5%', 'Sales', 'Rating']
for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
df = df.dropna(subset=numeric_cols)

# Extract time features
df['Year'] = df['Date'].dt.year
df['Month'] = df['Date'].dt.month
df['Month_Name'] = df['Date'].dt.strftime('%B')
df['Day'] = df['Date'].dt.day
df['Date_str'] = df['Date'].dt.strftime('%Y-%m-%d')

print(f"✓ Data cleaned and processed: {df.shape[0]} clean records")

# ================================================================
# EXPLORATORY DATA ANALYSIS
# ================================================================
print("\n" + "="*60)
print("📈 EXPLORATORY DATA ANALYSIS")
print("="*60)

# 1. DESCRIPTIVE STATISTICS
print("\n1️⃣  DESCRIPTIVE STATISTICS")
print("-" * 60)
descriptive_stats = {
    "Sales": {
        "mean": float(df['Sales'].mean()),
        "median": float(df['Sales'].median()),
        "std": float(df['Sales'].std()),
        "min": float(df['Sales'].min()),
        "max": float(df['Sales'].max()),
        "count": int(df['Sales'].count())
    },
    "Quantity": {
        "mean": float(df['Quantity'].mean()),
        "median": float(df['Quantity'].median()),
        "std": float(df['Quantity'].std()),
        "min": float(df['Quantity'].min()),
        "max": float(df['Quantity'].max()),
        "count": int(df['Quantity'].count())
    },
    "Rating": {
        "mean": float(df['Rating'].mean()),
        "median": float(df['Rating'].median()),
        "std": float(df['Rating'].std()),
        "min": float(df['Rating'].min()),
        "max": float(df['Rating'].max()),
        "count": int(df['Rating'].count())
    }
}

for metric, stats in descriptive_stats.items():
    print(f"\n{metric}:")
    for key, val in stats.items():
        if key == "count":
            print(f"  {key}: {val}")
        else:
            print(f"  {key}: ₹{val:.2f}" if metric == "Sales" else f"  {key}: {val:.2f}")

# 2. OVERALL SUMMARY
print("\n2️⃣  OVERALL SUMMARY")
print("-" * 60)
total_sales = df['Sales'].sum()
avg_sales = df['Sales'].mean()
total_transactions = len(df)
avg_rating = df['Rating'].mean()

print(f"Total Sales: ₹{total_sales:,.2f}")
print(f"Average Sales per Transaction: ₹{avg_sales:.2f}")
print(f"Total Transactions: {total_transactions:,}")
print(f"Average Customer Rating: {avg_rating:.2f}/10")

# 3. SALES BY CITY
print("\n3️⃣  SALES BY CITY")
print("-" * 60)
city_sales = df.groupby('City')['Sales'].agg(['sum', 'mean', 'count']).round(2)
city_sales.columns = ['Total Sales', 'Avg Sales', 'Transactions']
print(city_sales)

city_sales_dict = df.groupby('City')['Sales'].sum().to_dict()
top_city = max(city_sales_dict, key=city_sales_dict.get)
print(f"✓ Top City: {top_city} (₹{city_sales_dict[top_city]:,.2f})")

# 4. SALES BY PRODUCT LINE
print("\n4️⃣  SALES BY PRODUCT LINE")
print("-" * 60)
product_sales = df.groupby('Product line')['Sales'].agg(['sum', 'mean', 'count']).round(2)
product_sales.columns = ['Total Sales', 'Avg Sales', 'Transactions']
print(product_sales)

product_sales_dict = df.groupby('Product line')['Sales'].sum().to_dict()
top_product = max(product_sales_dict, key=product_sales_dict.get)
print(f"✓ Top Product Line: {top_product} (₹{product_sales_dict[top_product]:,.2f})")

# 5. PAYMENT METHOD DISTRIBUTION
print("\n5️⃣  PAYMENT METHOD DISTRIBUTION")
print("-" * 60)
payment_dist = df['Payment'].value_counts().to_dict()
payment_pct = (df['Payment'].value_counts() / len(df) * 100).round(2).to_dict()
for method, count in payment_dist.items():
    print(f"{method}: {count} transactions ({payment_pct[method]}%)")

# 6. CUSTOMER TYPE DISTRIBUTION
print("\n6️⃣  CUSTOMER TYPE DISTRIBUTION")
print("-" * 60)
customer_dist = df['Customer type'].value_counts().to_dict()
for ctype, count in customer_dist.items():
    pct = (count / len(df) * 100)
    print(f"{ctype}: {count} ({pct:.1f}%)")

# 7. RATING DISTRIBUTION
print("\n7️⃣  CUSTOMER RATING DISTRIBUTION")
print("-" * 60)
rating_bins = [0, 2, 4, 6, 8, 10]
rating_labels = ['Very Poor (0-2)', 'Poor (2-4)', 'Average (4-6)', 'Good (6-8)', 'Excellent (8-10)']
rating_dist = pd.cut(df['Rating'], bins=rating_bins, labels=rating_labels).value_counts().sort_index()
for label, count in rating_dist.items():
    pct = (count / len(df) * 100)
    print(f"{label}: {count} ({pct:.1f}%)")

# 8. SALES TREND OVER TIME
print("\n8️⃣  SALES TREND BY MONTH")
print("-" * 60)
monthly_sales = df.groupby('Month_Name')['Sales'].agg(['sum', 'mean', 'count'])
month_order = ['January', 'February', 'March', 'April', 'May', 'June', 
               'July', 'August', 'September', 'October', 'November', 'December']
monthly_sales = monthly_sales.reindex([m for m in month_order if m in monthly_sales.index])
print(monthly_sales.round(2))

# 9. BRANCH/CITY ANALYSIS
print("\n9️⃣  BRANCH ANALYSIS")
print("-" * 60)
if 'Branch' in df.columns:
    branch_analysis = df.groupby('Branch').agg({
        'Sales': ['sum', 'mean'],
        'Rating': 'mean',
        'Quantity': 'sum'
    }).round(2)
    print(branch_analysis)

# 10. GENDER DISTRIBUTION AND SALES
print("\n🔟 GENDER-BASED ANALYSIS")
print("-" * 60)
gender_stats = df.groupby('Gender').agg({
    'Sales': ['sum', 'mean', 'count'],
    'Rating': 'mean'
}).round(2)
print(gender_stats)

# 11. CORRELATION ANALYSIS
print("\n1️⃣1️⃣ CORRELATION ANALYSIS")
print("-" * 60)
corr_cols = ['Unit price', 'Quantity', 'Tax 5%', 'Sales', 'Rating']
correlation_matrix = df[corr_cols].corr().round(3)
print(correlation_matrix)

# ================================================================
# PREPARE DATA FOR FRONTEND
# ================================================================
print("\n" + "="*60)
print("📦 PREPARING DATA FOR FRONTEND")
print("="*60)

# Monthly trend data
monthly_trend = df.groupby(['Year', 'Month', 'Month_Name']).agg({
    'Sales': ['sum', 'count'],
    'Rating': 'mean'
}).reset_index()
monthly_trend.columns = ['Year', 'Month', 'Month_Name', 'Total_Sales', 'Transactions', 'Avg_Rating']
monthly_trend = monthly_trend.sort_values(['Year', 'Month'])
monthly_trend['Date'] = monthly_trend['Month_Name'] + ' ' + monthly_trend['Year'].astype(str)

# City-Product matrix for advanced filtering
city_product_matrix = df.pivot_table(
    values='Sales',
    index='City',
    columns='Product line',
    aggfunc='sum',
    fill_value=0
).round(2).to_dict()

# Cleaned raw data for frontend filtering
raw_data = df[['Invoice ID', 'Branch', 'City', 'Customer type', 'Gender', 
                'Product line', 'Unit price', 'Quantity', 'Sales', 'Date_str', 
                'Payment', 'Rating']].copy()
raw_data['Unit price'] = raw_data['Unit price'].round(2)
raw_data['Quantity'] = raw_data['Quantity'].astype(int)
raw_data['Sales'] = raw_data['Sales'].round(2)
raw_data['Rating'] = raw_data['Rating'].round(1)
raw_data = raw_data.to_dict(orient='records')

# Rating distribution for histogram
rating_ranges = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10)]
rating_histogram = []
for lower, upper in rating_ranges:
    count = len(df[(df['Rating'] >= lower) & (df['Rating'] < upper)])
    rating_histogram.append({
        'range': f'{lower}-{upper}',
        'count': count,
        'label': f'{lower}-{upper} Stars'
    })

# ================================================================
# EXPORT TO JSON
# ================================================================
print("\n📊 Exporting to JSON...")

dashboard_data = {
    "timestamp": datetime.now().isoformat(),
    "summary": {
        "total_sales": float(total_sales),
        "average_sales": float(avg_sales),
        "total_transactions": int(total_transactions),
        "average_rating": float(avg_rating),
        "top_city": top_city,
        "top_product": top_product
    },
    "descriptive_stats": descriptive_stats,
    "city_sales": {k: float(v) for k, v in city_sales_dict.items()},
    "product_sales": {k: float(v) for k, v in product_sales_dict.items()},
    "payment_methods": {k: int(v) for k, v in payment_dist.items()},
    "customer_types": {k: int(v) for k, v in customer_dist.items()},
    "rating_distribution": rating_dist.to_dict() if isinstance(rating_dist, pd.Series) else rating_dist,
    "monthly_trend": monthly_trend[[
        'Month_Name', 'Total_Sales', 'Transactions', 'Avg_Rating', 'Date'
    ]].to_dict(orient='records'),
    "correlation_matrix": correlation_matrix.to_dict(),
    "cities": sorted(df['City'].unique().tolist()),
    "product_lines": sorted(df['Product line'].unique().tolist()),
    "payment_types": sorted(df['Payment'].unique().tolist()),
    "rating_histogram": rating_histogram,
    "raw_data": raw_data[:500]  # Limit to first 500 for performance, but include enough for filtering
}

# Save to JSON
with open("data.json", "w") as f:
    json.dump(dashboard_data, f, indent=4)

print("✅ Successfully exported to data.json")
print(f"✓ File size: {len(json.dumps(dashboard_data, indent=4)) / 1024:.2f} KB")

# ================================================================
# EXPORT FULL DATASET FOR FILTERING (Separate file for optimization)
# ================================================================
print("\n📊 Exporting full dataset...")

# Full dataset with all records
full_dataset = {
    "total_records": len(raw_data),
    "data": raw_data
}

with open("data_full.json", "w") as f:
    json.dump(full_dataset, f, indent=4)

print("✅ Successfully exported full dataset to data_full.json")
print(f"✓ Total records available: {len(raw_data)}")

# ================================================================
# FINAL SUMMARY
# ================================================================
print("\n" + "="*60)
print("✨ ANALYSIS COMPLETE ✨")
print("="*60)
print(f"""
📊 Analysis Summary:
   • Dataset: {len(df):,} records
   • Date Range: {df['Date'].min().date()} to {df['Date'].max().date()}
   • Cities: {', '.join(sorted(df['City'].unique()))}
   • Product Lines: {len(df['Product line'].unique())} categories
   • Payment Methods: {', '.join(sorted(df['Payment'].unique()))}

💰 Sales Insights:
   • Total Sales: ₹{total_sales:,.2f}
   • Average Transaction: ₹{avg_sales:.2f}
   • Top Performer: {top_city} (₹{city_sales_dict[top_city]:,.2f})
   • Best Product: {top_product} (₹{product_sales_dict[top_product]:,.2f})

⭐ Customer Insights:
   • Average Rating: {avg_rating:.2f}/10
   • Total Customers: {total_transactions:,}

📁 Output Files:
   ✓ data.json (Dashboard summary + sample data)
   ✓ data_full.json (Complete dataset for filtering)

🚀 Ready to launch dashboard!
   Run: python -m http.server 8000
   Then open: http://localhost:8000
""")
