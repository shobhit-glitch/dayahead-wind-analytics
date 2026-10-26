# AeroGrid GB: UK Day-Ahead Wind Forecasting & Procurement Terminal

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20(Vite)-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![Docker](https://img.shields.io/badge/Container-Docker%20Ready-2496ED.svg?style=flat&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A commercial-grade decision intelligence platform tailored for a **UK licensed energy utility's Day-Ahead power procurement desk**. The platform enables trading analysts and procurement managers to evaluate national wind generation forecasts, quantify forecast error and systematic bias, and size optimal risk-adjusted purchase buffers to minimize punitive Balancing Mechanism cashout charges.

---
<img width="1457" height="794" alt="Screenshot 2026-10-26 at 11 24 40 PM" src="https://github.com/user-attachments/assets/916ea152-14b0-4e0b-a9c6-1f47c69b4b43" />


## 1. Problem Setting & Market Context

In Great Britain, energy utilities must buy electricity in the wholesale **Day-Ahead Market (DAM)** (EPEX SPOT / Nord Pool GB) to meet customer demand across 48 half-hourly settlement periods. 

- **Gate Closure:** Binding purchase orders must be entered by **11:00 GMT on day $D-1$** (13 to 37 hours before delivery).
- **Renewable Priority:** Renewable wind power operates at near-zero marginal cost, so the utility only procures thermal power (CCGT, gas peakers) for the residual deficit:
  $$\text{Procurement Target}_t = \max(0, \text{Customer Demand}_t - \text{Expected Wind}_t)$$
- **Asymmetric Imbalance Penalties:** 
  - If wind generation is **over-forecasted**, the utility is caught **SHORT** in the Balancing Mechanism and must buy replacement energy at the **System Buy Price (Cashout Price)**, often spiking to **£250 – £1,000+/MWh**.
  - If wind generation is **under-forecasted**, the utility is **LONG** and must spill energy at the discounted **System Sell Price (£30 – £50/MWh)**.

---

## 2. Core Capabilities

### Requirement 1: Day-Ahead Forecast Curve at Decision Time
- **Zero Look-Ahead Bias:** Strictly queries forecasts published on or before the **11:00 GMT Gate Closure cutoff on $D-1$**, preventing predictive leakage.
- **Forecast Vintages:** Allows toggling prior update runs (02:30, 04:30, 07:30, 09:30 GMT) to inspect weather model trajectory leading into gate closure.
- **Interactive Delivery Curve:** Visualizes latest forecast against actual FUELHH generation with color-coded discrepancy areas (Red for shortfall risk, Green for surplus).
- **Settlement Resolution Harmonization:** Seamlessly bridges hourly wholesale blocks with half-hourly settlement periods (SP 1 to 48).

### Requirement 2: Quantitative Accuracy & Quantile Uncertainty Evaluation
Empirical analysis of all **744 hourly delivery periods across January 2026** revealed that Elexon WINDFOR forecasts suffered an **84.4% systematic over-forecasting frequency**:
- **Mean Absolute Error (MAE):** 2,122.8 MW (18.33% of mean generation, 7.08% of installed fleet capacity)
- **Root Mean Square Error (RMSE):** 2,616.7 MW
- **Systematic Bias (Mean Error):** **-1,840.3 MW** (severe, persistent over-forecasting)
- **Over-Forecast Frequency:** 84.4% (628 / 744 hours; Average Shortfall: 2,347.6 MW)
- **Empirical Quantile Uncertainty Bands:**
  - **P10 (Tail Risk):** -4,312.4 MW
  - **P25 (Prudent Buffer):** -3,068.5 MW
  - **P50 (Median):** -1,640.5 MW
  - **P75:** -373.2 MW
  - **P90 (Surplus):** +488.9 MW
- **Diurnal & Stratified Profiles:** Breakdown of error severity during wholesale peak hours (07:00–19:00 GMT) vs off-peak, and across low, medium, and high wind regimes.

### Decision Support: Commercial Procurement & Hedge Simulator
- Models procurement outcomes comparing **Naive Forecasting** (0 MW buffer) against **Risk-Adjusted De-Biased Forecasting** (-1,840 MW buffer) and **Prudent P75 Hedging** (-3,068 MW buffer).
- Demonstrates net monthly utility savings of **£2.5M to £3.3M** by purchasing risk-hedged power in the Day-Ahead wholesale market at £95/MWh instead of paying punitive cashout penalties.

---

## 3. Technology Stack

- **Frontend:** React 18, Vite 5, Lucide React Icons. Bespoke Vanilla CSS design system (dark glassmorphism, responsive SVG charts, zero CSS framework bloat).
- **Backend:** Python 3.9+, FastAPI, Uvicorn (ASGI), Pydantic, NumPy, Pandas.
- **Database & Ingestion:** SQLite 3 with composite B-tree indices (`(startTime, publishTime)`), pre-ingested with 20,440 WINDFOR forecasts and 1,680 FUELHH actual records for January 2026.
- **External API:** Live streaming client for Elexon BMRS API (`/datasets/FUELHH/stream` and `/datasets/WINDFOR/stream`).
- **Containerization:** Docker multi-stage build & Docker Compose.
- **Cloud Ready:** Heroku (`Procfile`) and Vercel (`vercel.json`).

---

## 4. AI Tools Disclosure

> [!NOTE]
> **Explicit AI Tool Disclosure:**  
> In accordance with project requirements, this application was developed with the assistance of **Google Antigravity AI** (Advanced Agentic AI pair programmer). Antigravity assisted in:
> 1. Formulating the data ingestion pipelines and SQL window queries for point-in-time gate closure matching.
> 2. Generating vectorized NumPy mathematical routines for MAE, RMSE, bias, and empirical quantiles.
> 3. Designing the dark glassmorphic Vanilla CSS trading terminal interface and interactive SVG charting components.
> 4. Drafting the commercial client pitch deck and technical architecture review documentation.

---

## 5. Quickstart & Local Installation

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm
- Docker (optional, for containerized run)

### Option A: Native Local Run (Development)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd "Project for Gridbricks"
   ```

2. **Backend Setup:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. **Verify Database:**
   The repository already includes the seeded SQLite database at `data/elexon_jan_2026.db` (3.9 MB). To re-ingest fresh data from Elexon BMRS at any time:
   ```bash
   python3 backend/ingest_jan2026.py
   ```

4. **Run Automated Test Suite:**
   ```bash
   python3 backend/test_app.py
   # Ran 6 tests in 1.15s: OK
   ```

5. **Start Full-Stack Server:**
   ```bash
   # From project root with .venv activated:
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Open **http://127.0.0.1:8000** in your browser. The FastAPI server automatically serves the compiled React SPA and all API endpoints!

6. **Frontend Development Server (Optional Hot-Reload):**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Runs Vite on http://localhost:5173 with proxy to backend
   ```

---

## 6. Docker Containerization

To run the complete full-stack application in a container:

### Using Docker Compose:
```bash
docker compose up --build
```
Access the application at **http://localhost:8000**.

### Using Standalone Docker:
```bash
docker build -t aerogrid-terminal .
docker run -p 8000:8000 aerogrid-terminal
```

---

## 7. Cloud Deployment (Heroku & Vercel)

### Deploying to Heroku
The repository contains a `Procfile`:
```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```
1. Login to Heroku: `heroku login`
2. Create application: `heroku create aerogrid-gb`
3. Push to deploy: `git push heroku main`
4. Open the live app: `heroku open`

### Deploying to Vercel
The repository includes `vercel.json` configured for Vercel Static Builds + Python Serverless Functions:
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`

---

## 8. API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health, database record counts, and live Elexon connectivity |
| `/api/dates` | `GET` | List of available decision dates in January 2026 |
| `/api/day-ahead` | `GET` | Day-Ahead forecast curve at gate closure cutoff vs actuals & vintages |
| `/api/accuracy` | `GET` | Rigorous MAE, RMSE, Bias, quantiles, and diurnal error metrics |
| `/api/simulate` | `GET` | Commercial procurement financial model comparing naive vs hedged strategies |
| `/api/sync` | `POST` | Triggers on-demand live stream sync from Elexon BMRS API |
| `/api/export/csv` | `GET` | Downloads matched forecast and actual records in CSV format |

---

## 9. Project Directory Structure

```
Project for Gridbricks/
├── backend/
│   ├── main.py              # FastAPI application, REST endpoints, and static mount
│   ├── data_store.py        # SQLite queries, window functions, and data models
│   ├── analytics.py         # Vectorized MAE, RMSE, Bias, and Quantile calculations
│   ├── simulation.py        # Commercial Day-Ahead procurement & cashout model
│   ├── elexon_client.py     # Live Elexon BMRS stream API client
│   ├── ingest_jan2026.py    # Batch ingestion script for January 2026 data
│   ├── test_app.py          # Automated integration & unit test suite
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── index.html           # HTML entry point with Google Fonts
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite configuration with backend proxy
│   └── src/
│       ├── App.jsx          # Application root with navigation tabs & modals
│       ├── index.css        # Bespoke modern dark glassmorphism design system
│       ├── api/
│       │   └── client.js    # Client-side API layer
│       └── components/
│           ├── Header.jsx           # Top header, date selector, and gate closure
│           ├── DayAheadForecast.jsx # Requirement 1: Forecast curve, actuals, vintages
│           ├── ForecastAccuracy.jsx # Requirement 2: Quantitative accuracy & bias
│           ├── ProcurementDesk.jsx  # Commercial risk buffer & financial simulator
│           ├── ClientPitchModal.jsx # Embedded executive client pitch presentation
│           └── TechReviewModal.jsx  # Embedded technical design review
├── data/
│   └── elexon_jan_2026.db   # Seeded SQLite database (20.4k forecasts, 1.6k actuals)
├── docs/
│   ├── CLIENT_PITCH.md      # Full client pitch presentation for the utility desk
│   └── TECHNICAL_DESIGN.md  # Detailed architecture document for the technical lead
├── Dockerfile               # Multi-stage production container definition
├── docker-compose.yml       # Docker Compose orchestration
├── Procfile                 # Heroku deployment file
├── vercel.json              # Vercel deployment configuration
└── README.md                # Comprehensive documentation
```

---

## 10. License
This project is licensed under the MIT License.
