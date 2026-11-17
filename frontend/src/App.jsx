import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Landmark,
  RefreshCw,
} from "lucide-react";

const API = "https://finance-dashboard-200o.onrender.com";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const COLORS = ["#2563eb", "#0d9488", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

export default function App() {
  const [filters, setFilters] = useState({
    months: ["All"],
    categories: ["All"],
    transaction_types: ["All"],
  });
  const [month, setMonth] = useState("All");
  const [category, setCategory] = useState("All");
  const [transactionType, setTransactionType] = useState("All");
  const [summary, setSummary] = useState({});
  const [charts, setCharts] = useState({
    monthly_trend: [],
    category_summary: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = { month, category, transaction_type: transactionType };

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, chartsRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/summary`, { params }),
        axios.get(`${API}/charts`, { params }),
        axios.get(`${API}/transactions`, { params }),
      ]);

      setSummary(summaryRes.data);
      setCharts(chartsRes.data);
      setTransactions(transactionsRes.data);
    } catch (err) {
      setError("Unable to load dashboard data. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    axios
      .get(`${API}/filters`)
      .then((res) => setFilters(res.data))
      .catch(() => setError("Unable to load filters."));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [month, category, transactionType]);

  const kpis = [
    {
      title: "Total Transactions",
      value: Number(summary.total_transactions || 0).toLocaleString("en-IN"),
      icon: Activity,
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      title: "Total Deposits",
      value: formatMoney(summary.total_deposits),
      icon: ArrowDownToLine,
      color: "#059669",
      bg: "#ecfdf5",
    },
    {
      title: "Total Withdrawals",
      value: formatMoney(summary.total_withdrawals),
      icon: ArrowUpFromLine,
      color: "#dc2626",
      bg: "#fef2f2",
    },
    {
      title: "Net Cash Flow",
      value: formatMoney(summary.net_cash_flow),
      icon: Wallet,
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      title: "Latest Balance",
      value: formatMoney(summary.latest_balance),
      icon: Landmark,
      color: "#d97706",
      bg: "#fffbeb",
    },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">FINANCE<span>PRO</span></div>
          <p>Personal Banking Analytics Dashboard</p>
        </div>
        <button className="refresh" onClick={loadDashboard}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <main className="container">
        <section className="welcome">
          <div>
            <h1>Finance Overview</h1>
            <p>Track deposits, withdrawals and account activity.</p>
          </div>
          <span className="live-status">● API Connected</span>
        </section>

        <section className="filters">
          <div className="filter-heading">Dashboard Filters</div>
          <label>
            Month
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {filters.months.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {filters.categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Transaction Type
            <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
              {filters.transaction_types.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        {error && <div className="error">{error}</div>}
        {loading && <p className="loading">Loading dashboard data...</p>}

        <section className="kpi-grid">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <div className="kpi-card" key={item.title}>
                <div className="kpi-icon" style={{ background: item.bg, color: item.color }}>
                  <Icon size={22} />
                </div>
                <p>{item.title}</p>
                <h2>{item.value}</h2>
              </div>
            );
          })}
        </section>

        <section className="chart-grid">
          <div className="panel">
            <h3>Monthly Deposits vs Withdrawals</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="MONTH" />
                <YAxis />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
                <Line type="monotone" dataKey="deposits" stroke="#059669" strokeWidth={3} />
                <Line type="monotone" dataKey="withdrawals" stroke="#dc2626" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h3>Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.category_summary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="CATEGORY" />
                <YAxis />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="deposits" fill="#2563eb" radius={[5, 5, 0, 0]} />
                <Bar dataKey="withdrawals" fill="#f59e0b" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h3>Transaction Category Mix</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.category_summary}
                  dataKey="deposits"
                  nameKey="CATEGORY"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {charts.category_summary.map((entry, index) => (
                    <Cell key={entry.CATEGORY} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel transactions-panel">
          <h3>Recent Transactions</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Withdrawal</th>
                  <th>Deposit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item, index) => (
                  <tr key={`${item.DATE}-${index}`}>
                    <td>{item.DATE}</td>
                    <td>{item["TRANSACTION DETAILS"]}</td>
                    <td><span className="category-tag">{item.CATEGORY}</span></td>
                    <td className="withdrawal">{formatMoney(item["WITHDRAWAL AMT"])}</td>
                    <td className="deposit">{formatMoney(item["DEPOSIT AMT"])}</td>
                    <td>{formatMoney(item["BALANCE AMT"])}</td>
                  </tr>
                ))}
                {!loading && transactions.length === 0 && (
                  <tr><td colSpan="6" className="empty">No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>FinancePro Dashboard · Powered by FastAPI & React</footer>
      </main>
    </div>
  );
}
