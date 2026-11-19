
import React, { useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import {
  FileSpreadsheet, Activity, Database, RefreshCw, BarChart3
} from "lucide-react";

const API = "https://finance-dashboard-200o.onrender.com";

const chartTypes = [
  "bar", "pie", "donut", "line", "area", "scatter"
];

const chartColors = [
  "#38bdf8", "#818cf8", "#c084fc",
  "#34d399", "#fbbf24", "#fb7185",
  "#2dd4bf", "#a3e635"
];

function getDashboardTitle(columns = []) {
  const names = columns.join(" ").toLowerCase();

  if (/employee|department|attrition|job_role|performance rating/.test(names))
    return "HR Analysis";
  if (/withdrawal|deposit|balance|transaction|account no|credit|debit/.test(names))
    return "Finance Analysis";
  if (/revenue|invoice|customer|product|unit_price|sales/.test(names))
    return "Sales Analysis";
  if (/inventory|stock|supplier|warehouse|reorder/.test(names))
    return "Inventory Analysis";

  return "Dataset Analysis";
}

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [customChart, setCustomChart] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState("");

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
      setCustomChart(null);
      setChartError("");

      const input = document.getElementById("file-upload");
      if (input) input.value = "";

      const numeric = response.data.numeric_columns || [];
      const categorical = response.data.categorical_columns || [];
      const allColumns = response.data.columns || [];

      setXColumn(categorical[0] || numeric[0] || allColumns[0] || "");
      setYColumn(numeric[0] || "");
      setChartType("bar");

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "File upload failed. Please check your file."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateChart() {
    if (!xColumn || !yColumn) {
      setChartError("Please select both X and Y columns.");
      return;
    }

    if (chartType === "scatter" &&
        !(dashboard?.numeric_columns || []).includes(xColumn)) {
      setChartError("Scatter chart requires a numeric X column.");
      return;
    }

    try {
      setChartLoading(true);
      setChartError("");

      const response = await axios.get(`${API}/chart`, {
        params: {
          x_column: xColumn,
          y_column: yColumn,
          chart_type: chartType
        }
      });

      setCustomChart(response.data);
    } catch (err) {
      setCustomChart(null);
      setChartError(
        err.response?.data?.detail || "Unable to generate this chart."
      );
    } finally {
      setChartLoading(false);
    }
  }

  function goHome() {
    setDashboard(null);
    setSelectedFile(null);
    setCustomChart(null);
    setError("");
    setSuccess("");
    setChartError("");

    const input = document.getElementById("file-upload");
    if (input) input.value = "";
  }

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });

  const columns = dashboard?.columns || [];
  const preview = dashboard?.preview || [];
  const kpis = dashboard?.kpis || [];
  const numericColumns = dashboard?.numeric_columns || [];

  const xOptions = chartType === "scatter"
    ? numericColumns
    : columns;

  const chartData = customChart?.labels?.map((label, index) => ({
    name: label,
    value: customChart.values[index]
  })) || [];

  function renderSelectedChart() {
    if (!customChart) return null;

    if (chartType === "bar") {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="name" stroke="#cbd5e1" />
          <YAxis stroke="#cbd5e1" />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name={yColumn} fill="#38bdf8" radius={[7, 7, 0, 0]} />
        </BarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="name" stroke="#cbd5e1" />
          <YAxis stroke="#cbd5e1" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" name={yColumn}
            stroke="#38bdf8" strokeWidth={3} />
        </LineChart>
      );
    }

    if (chartType === "area") {
      return (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis dataKey="name" stroke="#cbd5e1" />
          <YAxis stroke="#cbd5e1" />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="value" name={yColumn}
            stroke="#818cf8" fill="#818cf8" fillOpacity={0.35} />
        </AreaChart>
      );
    }

    if (chartType === "pie" || chartType === "donut") {
      return (
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={chartType === "donut" ? 65 : 0}
            label
          >
            {chartData.map((item, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
    }

    if (chartType === "scatter") {
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
          <XAxis type="number" dataKey="x" name={xColumn} stroke="#cbd5e1" />
          <YAxis type="number" dataKey="y" name={yColumn} stroke="#cbd5e1" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={customChart.data || []} fill="#38bdf8" />
        </ScatterChart>
      );
    }

    return null;
  }

  return (
    <div className="app glass-app">
      <header className="topbar glass-card">
        <div>
          <div className="brand">
            {dashboard?.uploaded
              ? getDashboardTitle(columns)
              : "DATA PRO"}
          </div>
          <p>
            {dashboard?.uploaded
              ? `${getDashboardTitle(columns)} Dashboard`
              : "Dynamic Business Intelligence Dashboard"}
          </p>
        </div>

        <button className="refresh" onClick={goHome}>
          <RefreshCw size={16} /> Home
        </button>
      </header>

      <main className="container">
        <section className="panel upload-panel glass-card">
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
              <Activity size={19} />
              {loading ? "Uploading..." : "Generate Dashboard"}
            </button>
          </div>

          {selectedFile && (
            <p className="selected-file">Selected: {selectedFile.name}</p>
          )}
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </section>

        {dashboard?.uploaded && (
          <>
            <section className="welcome glass-card">
              <div>
                <h1>{getDashboardTitle(columns)}</h1>
                <p>Dashboard Overview · Your data at a glance</p>
              </div>
              <span className="live-status">● API Connected</span>
            </section>

            <section className="kpi-grid">
              <div className="kpi-card glass-card">
                <div className="kpi-icon"><Database size={22} /></div>
                <p>Total Records</p>
                <h2>{formatNumber(dashboard.row_count)}</h2>
              </div>

              <div className="kpi-card glass-card">
                <div className="kpi-icon"><Activity size={22} /></div>
                <p>Total Columns</p>
                <h2>{formatNumber(dashboard.column_count)}</h2>
              </div>

              {kpis.map((item) => (
                <div className="kpi-card glass-card" key={item.name}>
                  <div className="kpi-icon"><Activity size={22} /></div>
                  <p>{item.name} · Total</p>
                  <h2>{formatNumber(item.sum)}</h2>
                  <small>Average: {formatNumber(item.average)}</small>
                </div>
              ))}
            </section>

            <section className="panel glass-card chart-builder">
              <div className="section-heading">
                <BarChart3 size={24} />
                <div>
                  <h2>Dynamic Chart Builder</h2>
                  <p>Select your data and chart type</p>
                </div>
              </div>

              <div className="chart-selectors">
                <label>
                  X Axis / Category
                  <select
                    value={xColumn}
                    onChange={(e) => {
                      setXColumn(e.target.value);
                      setCustomChart(null);
                    }}
                  >
                    {xOptions.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Y Axis / Values
                  <select
                    value={yColumn}
                    onChange={(e) => {
                      setYColumn(e.target.value);
                      setCustomChart(null);
                    }}
                  >
                    {numericColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </label>
              </div>

              <h3 className="chart-type-heading">Choose Chart Type</h3>

              <div className="chart-type-buttons">
                {chartTypes.map((type) => (
                  <button
                    key={type}
                    className={chartType === type ? "chart-type active" : "chart-type"}
                    onClick={() => {
                      setChartType(type);
                      setCustomChart(null);
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <button
                className="upload-button generate-chart"
                onClick={generateChart}
                disabled={chartLoading || !xColumn || !yColumn}
              >
                {chartLoading ? "Generating..." : "Generate Selected Chart"}
              </button>

              {chartError && <p className="error">{chartError}</p>}

              {customChart && (
                <div className="custom-chart">
                  <h3>{customChart.title}</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    {renderSelectedChart()}
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="panel glass-card transactions-panel">
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
        )}

        {!dashboard?.uploaded && !loading && (
          <section className="panel empty-dashboard glass-card">
            <FileSpreadsheet size={42} />
            <h3>No Dataset Available</h3>
            <p>Please upload a CSV or XLSX file to view your dashboard.</p>
          </section>
        )}

        <footer>DataPro Dashboard · Powered by FastAPI & React</footer>
      </main>
    </div>
  );
}
