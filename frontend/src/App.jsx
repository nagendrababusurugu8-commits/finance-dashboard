
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Upload,
  FileSpreadsheet,
  Activity,
  Database,
  RefreshCw,
} from "lucide-react";

const API = "https://finance-dashboard-200o.onrender.com";

function getDashboardTitle(columns = []) {
  const names = columns.join(" ").toLowerCase();

  if (
    /employee|department|attrition|job_role|performance rating/.test(names)
  ) return "HR Analysis";

  if (
    /withdrawal|deposit|balance|transaction|account no|credit|debit/.test(names)
  ) return "Finance Analysis";

  if (
    /revenue|invoice|customer|product|unit_price|sales/.test(names)
  ) return "Sales Analysis";

  if (
    /inventory|stock|supplier|warehouse|reorder/.test(names)
  ) return "Inventory Analysis";

  return "Dataset Analysis";
}


export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API}/dashboard`);
      setDashboard(response.data);
    } catch (err) {
      setError("Unable to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function uploadFile() {
    if (!selectedFile) {
      setError("Please select a CSV or XLSX file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.post(`${API}/upload`, formData);

      setDashboard(response.data);
      setSuccess("File uploaded successfully!");
      setSelectedFile(null);

      const input = document.getElementById("file-upload");
      if (input) input.value = "";
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "File upload failed. Please check your file."
      );
    } finally {
      setLoading(false);
    }
  }

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const columns = dashboard?.columns || [];
  const preview = dashboard?.preview || [];
  const kpis = dashboard?.kpis || [];
  const chart = dashboard?.chart;

  return (
    <div className="app">
      <header className="topbar">
        <div>
        <div className="brand">
  {dashboard?.uploaded
    ? getDashboardTitle(dashboard.columns)
    : "DATA PRO"}
</div>

<p>
  {dashboard?.uploaded
    ? `${getDashboardTitle(dashboard.columns)} Dashboard`
    : "Upload your dataset to get started"}
</p>
        </div>

        <button className="refresh" onClick={loadDashboard}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <main className="container">
        <section className="welcome">
          <div>
            <h1>Dynamic Dashboard</h1>
            <p>Upload your data and explore automatic insights.</p>
          </div>
          <span className="live-status">● API Connected</span>
        </section>

        <section className="panel upload-panel">
          <div className="upload-heading">
            <FileSpreadsheet size={25} />
            <div>
              <h3>Upload Your Dataset</h3>
              <p>Supported formats: CSV and Excel (.xlsx)</p>
            </div>
          </div>

          <div className="upload-controls">
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
            />

            <button
              className="upload-button"
              onClick={uploadFile}
              disabled={loading || !selectedFile}
            >
              <Upload size={17} />
              Upload Dataset
            </button>
          </div>

          {selectedFile && (
            <p className="selected-file">
              Selected: {selectedFile.name}
            </p>
          )}

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          {loading && <p className="loading">Please wait...</p>}
        </section>

        {dashboard?.uploaded ? (
          <>
           <section className="welcome">
  <div>
    <h1>{dashboard?.uploaded
      ? getDashboardTitle(dashboard.columns)
      : "Welcome"}
    </h1>
    <p>
      {dashboard?.uploaded
        ? `${getDashboardTitle(dashboard.columns)} Dashboard Overview`
        : "Upload your dataset to get started."}
    </p>
  </div>
  <span className="live-status">● API Connected</span>
</section>

            <section className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                  <Database size={22} />
                </div>
                <p>Total Records</p>
                <h2>{formatNumber(dashboard.row_count)}</h2>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
                  <Activity size={22} />
                </div>
                <p>Total Columns</p>
                <h2>{formatNumber(dashboard.column_count)}</h2>
              </div>

              {kpis.map((item) => (
                <div className="kpi-card" key={item.name}>
                  <div className="kpi-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                    <Activity size={22} />
                  </div>
                  <p>{item.name} · Total</p>
                  <h2>{formatNumber(item.sum)}</h2>
                  <small>Average: {formatNumber(item.average)}</small>
                </div>
              ))}
            </section>

            {chart && chart.labels.length > 0 && (
              <section className="panel">
                <h3>{chart.title}</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={chart.labels.map((label, index) => ({
                      name: label,
                      value: chart.values[index],
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name={chart.value_name}
                      fill="#2563eb"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            )}

            <section className="panel transactions-panel">
              <h3>Dataset Preview</h3>
              <p className="preview-info">
                Showing up to 100 records from your uploaded file.
              </p>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column}>
                            {row[column] === null || row[column] === undefined
                              ? "-"
                              : typeof row[column] === "object"
                              ? JSON.stringify(row[column])
                              : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          !loading && (
            <section className="panel empty-dashboard">
              <FileSpreadsheet size={42} />
              <h3>No Dataset Available</h3>
              <p>Please upload a CSV or XLSX file to view your dashboard.</p>
            </section>
          )
        )}

        <footer>DataPro Dashboard · Powered by FastAPI & React</footer>
      </main>
    </div>
  );
}
