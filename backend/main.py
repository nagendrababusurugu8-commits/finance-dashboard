
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Finance Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Excel file is in the main GitHub repository folder
DATA_FILE = Path(__file__).parent.parent / "bank(1).xlsx"

if not DATA_FILE.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")

df = pd.read_excel(DATA_FILE, sheet_name="Sheet1")

# Clean dataset
df.columns = df.columns.astype(str).str.strip()
df["DATE"] = pd.to_datetime(df["DATE"], errors="coerce")
df["WITHDRAWAL AMT"] = pd.to_numeric(
    df["WITHDRAWAL AMT"], errors="coerce"
).fillna(0)
df["DEPOSIT AMT"] = pd.to_numeric(
    df["DEPOSIT AMT"], errors="coerce"
).fillna(0)
df["BALANCE AMT"] = pd.to_numeric(
    df["BALANCE AMT"], errors="coerce"
).fillna(0)
df["TRANSACTION DETAILS"] = (
    df["TRANSACTION DETAILS"].fillna("Other").astype(str)
)


def get_category(description):
    text = description.upper()

    if any(word in text for word in ["SALARY", "PAYROLL"]):
        return "Salary"
    if any(word in text for word in ["ATM", "CASH"]):
        return "Cash"
    if any(word in text for word in ["NEFT", "RTGS", "IMPS", "UPI", "TRF"]):
        return "Transfer"
    if any(word in text for word in ["INTEREST"]):
        return "Interest"
    if any(word in text for word in ["CHARGE", "FEE"]):
        return "Bank Charges"
    if any(word in text for word in ["TAX", "GST"]):
        return "Tax"

    return "Other"


df["CATEGORY"] = df["TRANSACTION DETAILS"].apply(get_category)


def filtered_data(month="All", category="All", transaction_type="All"):
    data = df.copy()

    if month != "All":
        data = data[data["DATE"].dt.strftime("%Y-%m") == month]

    if category != "All":
        data = data[data["CATEGORY"] == category]

    if transaction_type == "Deposit":
        data = data[data["DEPOSIT AMT"] > 0]
    elif transaction_type == "Withdrawal":
        data = data[data["WITHDRAWAL AMT"] > 0]

    return data


@app.get("/")
def home():
    return {"message": "Finance Dashboard API is running"}


@app.get("/filters")
def filters():
    months = sorted(
        df["DATE"].dropna().dt.strftime("%Y-%m").unique().tolist()
    )
    categories = sorted(df["CATEGORY"].dropna().unique().tolist())

    return {
        "months": ["All"] + months,
        "categories": ["All"] + categories,
        "transaction_types": ["All", "Deposit", "Withdrawal"],
    }


@app.get("/summary")
def summary(
    month: str = "All",
    category: str = "All",
    transaction_type: str = "All",
):
    data = filtered_data(month, category, transaction_type)

    total_deposits = float(data["DEPOSIT AMT"].sum())
    total_withdrawals = float(data["WITHDRAWAL AMT"].sum())

    latest_balance = (
        float(data.sort_values("DATE")["BALANCE AMT"].iloc[-1])
        if not data.empty else 0
    )

    return {
        "total_transactions": int(len(data)),
        "total_deposits": round(total_deposits, 2),
        "total_withdrawals": round(total_withdrawals, 2),
        "net_cash_flow": round(total_deposits - total_withdrawals, 2),
        "latest_balance": round(latest_balance, 2),
    }


@app.get("/charts")
def charts(
    month: str = "All",
    category: str = "All",
    transaction_type: str = "All",
):
    data = filtered_data(month, category, transaction_type)

    monthly = data.dropna(subset=["DATE"]).copy()
    monthly["MONTH"] = monthly["DATE"].dt.strftime("%Y-%m")

    monthly_summary = (
        monthly.groupby("MONTH")
        .agg(
            deposits=("DEPOSIT AMT", "sum"),
            withdrawals=("WITHDRAWAL AMT", "sum"),
        )
        .reset_index()
        .sort_values("MONTH")
    )

    category_summary = (
        data.groupby("CATEGORY")
        .agg(
            deposits=("DEPOSIT AMT", "sum"),
            withdrawals=("WITHDRAWAL AMT", "sum"),
        )
        .reset_index()
    )

    return {
        "monthly_trend": monthly_summary.to_dict(orient="records"),
        "category_summary": category_summary.to_dict(orient="records"),
    }


@app.get("/transactions")
def transactions(
    month: str = "All",
    category: str = "All",
    transaction_type: str = "All",
):
    data = filtered_data(month, category, transaction_type)
    data = data.sort_values("DATE", ascending=False).head(100).copy()

    data["DATE"] = data["DATE"].dt.strftime("%Y-%m-%d")
    data = data.fillna("")

    return data[
        [
            "DATE",
            "TRANSACTION DETAILS",
            "CATEGORY",
            "WITHDRAWAL AMT",
            "DEPOSIT AMT",
            "BALANCE AMT",
        ]
    ].to_dict(orient="records")

