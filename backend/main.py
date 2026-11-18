
from io import BytesIO
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dynamic Finance Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

df = pd.DataFrame()


def clean_dataframe(data):
    data.columns = data.columns.astype(str).str.strip()

    # Remove completely empty rows and columns
    data = data.dropna(how="all").dropna(axis=1, how="all")

    if data.empty or len(data.columns) == 0:
        raise ValueError("The uploaded file has no usable data.")

    return data


def make_json_safe(data):
    return data.astype(object).where(pd.notna(data), None)


def get_dashboard_data():
    if df.empty:
        return {
            "uploaded": False,
            "message": "Please upload a CSV or Excel file.",
        }

    numeric_columns = df.select_dtypes(include="number").columns.tolist()

    date_columns = []
    for col in df.columns:
        if any(word in col.lower() for word in ["date", "time"]):
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().sum() > 0:
                date_columns.append(col)

    categorical_columns = [
        col for col in df.columns
        if col not in numeric_columns and col not in date_columns
    ]

    kpis = []
    for col in numeric_columns[:8]:
        values = pd.to_numeric(df[col], errors="coerce").dropna()
        if not values.empty:
            kpis.append({
                "name": col,
                "sum": round(float(values.sum()), 2),
                "average": round(float(values.mean()), 2),
            })

    chart = {
        "title": "Category Summary",
        "labels": [],
        "values": [],
        "value_name": "",
    }

    if numeric_columns and categorical_columns:
        category_col = categorical_columns[0]
        value_col = numeric_columns[0]

        grouped = (
            df.groupby(category_col, dropna=False)[value_col]
            .sum()
            .sort_values(ascending=False)
            .head(10)
        )

        chart = {
            "title": f"{value_col} by {category_col}",
            "labels": [str(x) for x in grouped.index],
            "values": [round(float(x), 2) for x in grouped.values],
            "value_name": value_col,
        }

    elif numeric_columns:
        value_col = numeric_columns[0]
        values = pd.to_numeric(df[value_col], errors="coerce").dropna()

        chart = {
            "title": f"{value_col} Distribution",
            "labels": [str(i + 1) for i in range(len(values.head(10)))],
            "values": [round(float(x), 2) for x in values.head(10)],
            "value_name": value_col,
        }

    preview = make_json_safe(df.head(100)).to_dict(orient="records")

    return {
        "uploaded": True,
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns": df.columns.tolist(),
        "numeric_columns": numeric_columns,
        "date_columns": date_columns,
        "categorical_columns": categorical_columns,
        "kpis": kpis,
        "chart": chart,
        "preview": preview,
    }


@app.get("/")
def home():
    return {"message": "Dynamic Dashboard API is running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global df

    filename = (file.filename or "").lower()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        if filename.endswith(".csv"):
            new_df = pd.read_csv(BytesIO(content))
        elif filename.endswith(".xlsx"):
            new_df = pd.read_excel(BytesIO(content))
        else:
            raise HTTPException(
                status_code=400,
                detail="Please upload a CSV or XLSX file."
            )

        df = clean_dataframe(new_df)

        return get_dashboard_data()

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read this file: {str(error)}"
        )


@app.get("/dashboard")
def dashboard():
    return get_dashboard_data()
