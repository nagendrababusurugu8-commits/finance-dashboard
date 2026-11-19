
from io import BytesIO

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DataPro Dynamic Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

df = pd.DataFrame()


def clean_dataframe(data):
    data.columns = data.columns.astype(str).str.strip()
    data = data.dropna(how="all").dropna(axis=1, how="all")

    if data.empty or len(data.columns) == 0:
        raise ValueError("The uploaded file has no usable data.")

    return data


def make_json_safe(data):
    return data.astype(object).where(pd.notna(data), None)


def get_column_types():
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

    return numeric_columns, date_columns, categorical_columns


def get_dashboard_data():
    if df.empty:
        return {
            "uploaded": False,
            "message": "Please upload a CSV or Excel file.",
        }

    numeric_columns, date_columns, categorical_columns = get_column_types()

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
    return {"message": "DataPro Dashboard API is running"}


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


@app.get("/chart")
def create_chart(
    x_column: str,
    y_column: str,
    chart_type: str = "bar"
):
    if df.empty:
        raise HTTPException(status_code=400, detail="Please upload a dataset first.")

    if x_column not in df.columns or y_column not in df.columns:
        raise HTTPException(status_code=400, detail="Selected columns were not found.")

    chart_type = chart_type.lower()

    allowed_types = ["bar", "line", "area", "pie", "donut", "scatter"]

    if chart_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported chart type.")

    x_values = df[x_column]
    y_values = pd.to_numeric(df[y_column], errors="coerce")

    if chart_type == "scatter":
        if not pd.api.types.is_numeric_dtype(df[x_column]):
            raise HTTPException(
                status_code=400,
                detail="Scatter chart requires numeric columns for both axes."
            )

        valid = pd.DataFrame({
            "x": pd.to_numeric(x_values, errors="coerce"),
            "y": y_values
        }).dropna()

        data = [
            {"x": float(row.x), "y": float(row.y)}
            for row in valid.head(500).itertuples(index=False)
        ]

        return {
            "title": f"{y_column} vs {x_column}",
            "chart_type": chart_type,
            "data": data,
            "x_column": x_column,
            "y_column": y_column,
        }

    working = pd.DataFrame({
        "category": x_values.fillna("Unknown").astype(str),
        "value": y_values
    }).dropna(subset=["value"])

    grouped = (
        working.groupby("category")["value"]
        .sum()
        .sort_values(ascending=False)
        .head(20)
    )

    return {
        "title": f"{y_column} by {x_column}",
        "chart_type": chart_type,
        "labels": grouped.index.tolist(),
        "values": [round(float(v), 2) for v in grouped.values],
        "x_column": x_column,
        "y_column": y_column,
    }
