import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, PlainTextResponse
import io
import csv

from backend.data_store import (
    get_db_summary,
    get_available_decision_dates,
    get_day_ahead_forecast_and_actual,
    get_db_connection
)
from backend.analytics import calculate_forecast_accuracy
from backend.simulation import simulate_procurement_strategy
from backend.elexon_client import test_elexon_api_connection, sync_stream_for_range

app = FastAPI(
    title="UK Day-Ahead Wind Forecast & Procurement Analytics",
    description="Professional decision-support platform for UK Energy Utility Day-Ahead Wholesale Power Buying",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    db_info = get_db_summary()
    elexon_test = test_elexon_api_connection()
    return {
        "status": "online",
        "service": "UK Day-Ahead Wind Analytics API",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_info,
        "elexon_api": elexon_test
    }

@app.get("/api/dates")
def available_dates():
    return {
        "decision_dates": get_available_decision_dates(),
        "default_decision_date": "2026-01-15",
        "default_delivery_date": "2026-01-16",
        "default_cutoff_hour": "11:00:00"
    }

@app.get("/api/day-ahead")
def day_ahead_forecast(
    decision_date: Optional[str] = Query(None, description="Decision date YYYY-MM-DD (e.g. 2026-01-15)"),
    delivery_date: Optional[str] = Query(None, description="Delivery date YYYY-MM-DD (e.g. 2026-01-16)"),
    cutoff_hour: str = Query("11:00:00", description="Gate closure time HH:MM:SS (default 11:00:00 GMT)"),
    include_vintages: bool = Query(True, description="Whether to include earlier forecast update runs")
):
    """
    Requirement 1: Provides the latest renewable generation forecasts available
    at gate closure decision time on D-1 for delivery day D, aligned with actuals.
    """
    # If decision_date provided, delivery_date is decision_date + 1 day
    if decision_date and not delivery_date:
        dt = datetime.strptime(decision_date, "%Y-%m-%d")
        delivery_date = (dt + timedelta(days=1)).strftime("%Y-%m-%d")
    elif delivery_date and not decision_date:
        dt = datetime.strptime(delivery_date, "%Y-%m-%d")
        decision_date = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
    elif not decision_date and not delivery_date:
        decision_date = "2026-01-15"
        delivery_date = "2026-01-16"

    decision_cutoff_time = f"{decision_date}T{cutoff_hour}Z"

    result = get_day_ahead_forecast_and_actual(
        delivery_date=delivery_date,
        decision_cutoff_time=decision_cutoff_time,
        include_vintages=include_vintages
    )
    result["decision_date"] = decision_date
    result["cutoff_hour"] = cutoff_hour
    return result

@app.get("/api/accuracy")
def forecast_accuracy(
    start_date: str = Query("2026-01-01", description="Start delivery date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="End delivery date YYYY-MM-DD"),
    cutoff_hour: str = Query("11:00:00", description="Decision gate closure time (HH:MM:SS)")
):
    """
    Requirement 2: Quantitative accuracy evaluation of renewable generation forecasts.
    Calculates MAE, RMSE, Mean Error / Bias, MAPE, Quantile bands, Diurnal profile,
    and Distribution across the evaluation window.
    """
    return calculate_forecast_accuracy(
        start_date=start_date,
        end_date=end_date,
        decision_cutoff_hour=cutoff_hour
    )

@app.get("/api/simulate")
def simulate_procurement(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31"),
    strategy: str = Query("debias", description="Strategy: naive, debias, p75_hedge, p90_hedge, custom"),
    da_price: float = Query(95.0, description="Wholesale Day-Ahead Price (£/MWh)"),
    short_penalty: float = Query(240.0, description="Imbalance System Buy Price (£/MWh)"),
    spill_price: float = Query(45.0, description="System Sell Price (£/MWh)"),
    custom_buffer: float = Query(-1800.0, description="Custom buffer MW")
):
    """
    Decision support tool calculating commercial procurement financial impact:
    Naive unadjusted forecast vs Risk-adjusted / Quantified-error hedged procurement.
    """
    return simulate_procurement_strategy(
        start_date=start_date,
        end_date=end_date,
        strategy_mode=strategy,
        day_ahead_price_per_mwh=da_price,
        imbalance_short_penalty_per_mwh=short_penalty,
        imbalance_long_spill_per_mwh=spill_price,
        custom_buffer_mw=custom_buffer
    )

@app.post("/api/sync")
def sync_elexon(dataset: str = "WINDFOR", days: int = 2):
    """Triggers an on-demand sync from Elexon BMRS API."""
    end_dt = datetime.utcnow()
    start_dt = end_dt - timedelta(days=days)
    count = sync_stream_for_range(dataset, start_dt.isoformat() + "Z", end_dt.isoformat() + "Z")
    return {
        "status": "success",
        "dataset": dataset,
        "records_ingested": count,
        "synced_until": end_dt.isoformat()
    }

@app.get("/api/export/csv")
def export_csv(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31"),
    cutoff_hour: str = Query("11:00:00")
):
    """Exports matched Day-Ahead Forecasts and Actuals to CSV for desk analysts."""
    data = calculate_forecast_accuracy(start_date=start_date, end_date=end_date, decision_cutoff_hour=cutoff_hour)
    if "sample_records" not in data:
        raise HTTPException(status_code=400, detail="No data available for export")
    
    # Query all records
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
    WITH latest_fc AS (
        SELECT startTime, generation as forecast_gen, publishTime,
               ROW_NUMBER() OVER (PARTITION BY startTime ORDER BY publishTime DESC) as rn
        FROM windfor_forecasts
        WHERE publishTime <= date(startTime, '-1 day') || 'T' || ? || 'Z'
          AND startTime >= ? || 'T00:00:00Z'
          AND startTime <= ? || 'T23:59:59Z'
    ),
    hourly_actuals AS (
        SELECT substr(startTime, 1, 13) || ':00:00Z' as hourStartTime,
               avg(generation) as actual_gen_avg
        FROM fuelhh_wind_actuals
        WHERE startTime >= ? || 'T00:00:00Z'
          AND startTime <= ? || 'T23:59:59Z'
        GROUP BY substr(startTime, 1, 13)
    )
    SELECT fc.startTime, fc.forecast_gen, act.actual_gen_avg,
           (act.actual_gen_avg - fc.forecast_gen) as error_mw,
           abs(act.actual_gen_avg - fc.forecast_gen) as abs_error_mw,
           fc.publishTime
    FROM latest_fc fc
    JOIN hourly_actuals act ON fc.startTime = act.hourStartTime
    WHERE fc.rn = 1
    ORDER BY fc.startTime
    """
    cur.execute(query, (cutoff_hour, start_date, end_date, start_date, end_date))
    rows = cur.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Delivery_StartTime_UTC", "DayAhead_Forecast_MW", "Actual_Generation_MW", "Error_MW", "Abs_Error_MW", "Forecast_PublishTime_UTC"])
    for r in rows:
        writer.writerow([r[0], r[1], r[2], r[3], r[4], r[5]])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=elexon_wind_da_{start_date}_to_{end_date}.csv"}
    )

# Static file mount for built React frontend
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
