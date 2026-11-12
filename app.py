
import streamlit as st
import pandas as pd
import plotly.express as px
from io import BytesIO

st.set_page_config(
    page_title="Finance Dashboard",
    page_icon="💰",
    layout="wide"
)

# ---------------- CSS ----------------
st.markdown("""
<style>
div[data-testid="stMetric"] {
    background-color: #F0F4F8;
    padding: 18px;
    border-radius: 10px;
    border: 1px solid #DCE3EA;
}
</style>
""", unsafe_allow_html=True)

st.title("💰 Finance Dashboard")
st.caption("Bank Transaction Analysis")

# ---------------- CACHED DATA LOADING ----------------
@st.cache_data(show_spinner="Loading bank transactions...")
def load_data(file_bytes):

    data = pd.read_excel(
        BytesIO(file_bytes),
        sheet_name="Sheet1"
    )

    data.columns = data.columns.astype(str).str.strip()
    data = data.loc[:, data.columns != "."]

    required = [
        "DATE",
        "TRANSACTION DETAILS",
        "WITHDRAWAL AMT",
        "DEPOSIT AMT",
        "BALANCE AMT"
    ]

    missing = [c for c in required if c not in data.columns]

    if missing:
        raise ValueError(f"Missing columns: {missing}")

    data["DATE"] = pd.to_datetime(
        data["DATE"],
        errors="coerce",
        dayfirst=True
    )

    for col in [
        "WITHDRAWAL AMT",
        "DEPOSIT AMT",
        "BALANCE AMT"
    ]:
        data[col] = pd.to_numeric(
            data[col].astype(str).str.replace(",", "", regex=False),
            errors="coerce"
        ).fillna(0)

    data = data.dropna(subset=["DATE"]).copy()

    data["YEAR"] = data["DATE"].dt.year
    data["MONTH"] = data["DATE"].dt.month
    data["MONTH NAME"] = data["DATE"].dt.strftime("%B")

    data["TRANSACTION DETAILS"] = (
        data["TRANSACTION DETAILS"].fillna("").astype(str)
    )

    data["TRANSACTION AMOUNT"] = (
        data["DEPOSIT AMT"] + data["WITHDRAWAL AMT"]
    )

    return data


# ---------------- FILE UPLOAD ----------------
uploaded_file = st.file_uploader(
    "Upload Bank Excel File",
    type=["xlsx"]
)

if uploaded_file is not None:

    try:
        df = load_data(uploaded_file.getvalue())

    except Exception as e:
        st.error(f"File loading error: {e}")
        st.stop()

    if df.empty:
        st.warning("No valid transaction records found.")
        st.stop()

    # ---------------- SIDEBAR SLICERS ----------------
    st.sidebar.header("📌 Dashboard Slicers")

    # 1. Date Range
    min_date = df["DATE"].min().date()
    max_date = df["DATE"].max().date()

    date_range = st.sidebar.date_input(
        "Date Range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )

    # 2. Transaction Type
    transaction_type = st.sidebar.selectbox(
        "Transaction Type",
        ["All", "Deposit", "Withdrawal"]
    )

    # 3. Transaction Details Search
    st.sidebar.subheader("Transaction Search")

    search_text = st.sidebar.text_input(
        "Search Transaction Details",
        placeholder="Type transaction name..."
    )

    all_details = sorted(
        df["TRANSACTION DETAILS"].unique().tolist()
    )

    if search_text:
        available_details = [
            item for item in all_details
            if search_text.casefold() in item.casefold()
        ]
    else:
        available_details = all_details

    selected_details = st.sidebar.multiselect(
        "Select Transaction Details",
        options=available_details,
        default=[],
        help="Search above and select specific transactions. Leave empty for all matching transactions."
    )

    # 4. Year
    years = sorted(df["YEAR"].unique().tolist())

    selected_years = st.sidebar.multiselect(
        "Year",
        options=years,
        default=years
    )

    # 5. Month
    month_names = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December"
    }

    available_months = sorted(df["MONTH"].unique().tolist())

    selected_months = st.sidebar.multiselect(
        "Month",
        options=available_months,
        default=available_months,
        format_func=lambda x: month_names[x]
    )

    # 6. Amount Range
    min_amount = float(df["TRANSACTION AMOUNT"].min())
    max_amount = float(df["TRANSACTION AMOUNT"].max())

    if min_amount < max_amount:
        amount_range = st.sidebar.slider(
            "Amount Range",
            min_value=min_amount,
            max_value=max_amount,
            value=(min_amount, max_amount),
            format="%.2f"
        )
    else:
        amount_range = (min_amount, max_amount)
        st.sidebar.write("Amount Range:", amount_range)

    # 7. Balance Range
    min_balance = float(df["BALANCE AMT"].min())
    max_balance = float(df["BALANCE AMT"].max())

    if min_balance < max_balance:
        balance_range = st.sidebar.slider(
            "Balance Range",
            min_value=min_balance,
            max_value=max_balance,
            value=(min_balance, max_balance),
            format="%.2f"
        )
    else:
        balance_range = (min_balance, max_balance)
        st.sidebar.write("Balance Range:", balance_range)

    # ---------------- FAST FILTERING ----------------
    mask = pd.Series(True, index=df.index)

    # Date filter
    if len(date_range) == 2:
        start_date, end_date = date_range

        mask &= (
            (df["DATE"] >= pd.Timestamp(start_date)) &
            (df["DATE"] < pd.Timestamp(end_date) + pd.Timedelta(days=1))
        )

    # Transaction type filter
    if transaction_type == "Deposit":
        mask &= df["DEPOSIT AMT"] > 0

    elif transaction_type == "Withdrawal":
        mask &= df["WITHDRAWAL AMT"] > 0

    # Transaction search and selection
    if selected_details:
        mask &= df["TRANSACTION DETAILS"].isin(selected_details)
    elif search_text:
        mask &= df["TRANSACTION DETAILS"].str.contains(
            search_text,
            case=False,
            regex=False,
            na=False
        )

    # Year filter
    mask &= df["YEAR"].isin(selected_years)

    # Month filter
    mask &= df["MONTH"].isin(selected_months)

    # Amount filter
    mask &= df["TRANSACTION AMOUNT"].between(
        amount_range[0],
        amount_range[1]
    )

    # Balance filter
    mask &= df["BALANCE AMT"].between(
        balance_range[0],
        balance_range[1]
    )

    filtered_df = df.loc[mask]

    # ---------------- KPI SECTION ----------------
    st.subheader("📊 Key Performance Indicators")

    total_deposits = filtered_df["DEPOSIT AMT"].sum()
    total_withdrawals = filtered_df["WITHDRAWAL AMT"].sum()
    net_amount = total_deposits - total_withdrawals
    total_transactions = len(filtered_df)

    c1, c2, c3, c4 = st.columns(4)

    c1.metric("Total Deposits", f"{total_deposits:,.2f}")
    c2.metric("Total Withdrawals", f"{total_withdrawals:,.2f}")
    c3.metric("Net Amount", f"{net_amount:,.2f}")
    c4.metric("Transactions", f"{total_transactions:,}")

    st.caption(
        f"Showing {total_transactions:,} transactions out of {len(df):,} records"
    )

    st.divider()

    if filtered_df.empty:

        st.warning("No transactions found for selected filters.")

    else:

        # ---------------- MONTHLY CHART ----------------
        st.subheader("📅 Monthly Deposit & Withdrawal")

        monthly = (
            filtered_df.groupby(["YEAR", "MONTH"], as_index=False)
            [["DEPOSIT AMT", "WITHDRAWAL AMT"]]
            .sum()
            .sort_values(["YEAR", "MONTH"])
        )

        monthly["PERIOD"] = (
            monthly["YEAR"].astype(str) + " - " +
            monthly["MONTH"].map(month_names)
        )

        fig1 = px.bar(
            monthly,
            x="PERIOD",
            y=["DEPOSIT AMT", "WITHDRAWAL AMT"],
            barmode="group",
            title="Monthly Deposit vs Withdrawal"
        )

        st.plotly_chart(fig1, use_container_width=True)

        # ---------------- PIE CHART ----------------
        st.subheader("💳 Deposit vs Withdrawal")

        pie_data = pd.DataFrame({
            "Transaction Type": ["Deposit", "Withdrawal"],
            "Amount": [total_deposits, total_withdrawals]
        })

        fig2 = px.pie(
            pie_data,
            names="Transaction Type",
            values="Amount",
            hole=0.45
        )

        st.plotly_chart(fig2, use_container_width=True)

        # ---------------- TOP TRANSACTIONS ----------------
        st.subheader("🏆 Top 10 Transaction Categories")

        top_transactions = (
            filtered_df.groupby("TRANSACTION DETAILS")["DEPOSIT AMT"]
            .sum()
            .sort_values(ascending=False)
            .head(10)
            .reset_index()
        )

        fig3 = px.bar(
            top_transactions,
            x="DEPOSIT AMT",
            y="TRANSACTION DETAILS",
            orientation="h",
            title="Top 10 Categories by Deposit"
        )

        st.plotly_chart(fig3, use_container_width=True)

        # ---------------- BALANCE TREND ----------------
        st.subheader("💰 Account Balance Analysis")

        daily_balance = (
            filtered_df.sort_values("DATE")
            .groupby(filtered_df["DATE"].dt.date)["BALANCE AMT"]
            .last()
            .reset_index()
        )

        daily_balance.columns = ["DATE", "BALANCE AMT"]

        fig4 = px.line(
            daily_balance,
            x="DATE",
            y="BALANCE AMT",
            title="Daily Account Balance Trend"
        )

        st.plotly_chart(fig4, use_container_width=True)

    # ---------------- DATA TABLE ----------------
    st.subheader("📋 Transaction Details")

    show_all = st.checkbox("Show all filtered transactions")

    if show_all:
        st.dataframe(
            filtered_df,
            use_container_width=True,
            height=400
        )
    else:
        st.dataframe(
            filtered_df.head(1000),
            use_container_width=True,
            height=400
        )

        if len(filtered_df) > 1000:
            st.caption("Showing first 1,000 rows. Download for the complete filtered data.")

    # ---------------- DOWNLOAD ----------------
    csv = filtered_df.to_csv(index=False).encode("utf-8")

    st.download_button(
        "⬇️ Download Filtered Data",
        data=csv,
        file_name="finance_filtered_data.csv",
        mime="text/csv"
    )

else:
    st.info("Please upload your bank.xlsx file to view the dashboard.")
