import os
import sqlite3
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "elexon_jan_2026.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_db_summary() -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT count(*), min(startTime), max(startTime) FROM fuelhh_wind_actuals")
    act_row = cur.fetchone()
    
    cur.execute("SELECT count(*), min(publishTime), max(publishTime) FROM windfor_forecasts")
    fc_row = cur.fetchone()
    
    cur.execute("SELECT key, value, updated_at FROM sync_metadata")
    meta_rows = [dict(r) for r in cur.fetchall()]
    
    conn.close()
    return {
        "actuals_count": act_row[0] if act_row else 0,
        "actuals_min_date": act_row[1] if act_row else None,
        "actuals_max_date": act_row[2] if act_row else None,
        "forecasts_count": fc_row[0] if fc_row else 0,
        "forecasts_min_publish": fc_row[1] if fc_row else None,
        "forecasts_max_publish": fc_row[2] if fc_row else None,
        "metadata": meta_rows
    }

def get_available_decision_dates() -> List[str]:
    """Returns list of distinct decision dates available in January 2026."""
    dates = []
    # January 2026 decision dates: 2026-01-01 to 2026-01-31
    for day in range(1, 32):
        dates.append(f"2026-01-{day:02d}")
    return dates

def get_day_ahead_forecast_and_actual(
    delivery_date: str,
    decision_cutoff_time: str,
    include_vintages: bool = True
) -> Dict[str, Any]:
    """
    Retrieves the day-ahead forecast available at or before decision_cutoff_time
    for each period of delivery_date, and compares with actuals.
    
    Parameters:
    - delivery_date: 'YYYY-MM-DD'
    - decision_cutoff_time: 'YYYY-MM-DDTHH:MM:SSZ'
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Latest forecast published on or before decision cutoff
    query_latest = """
    WITH latest_fc AS (
        SELECT startTime, generation as forecast_gen, publishTime,
               ROW_NUMBER() OVER (PARTITION BY startTime ORDER BY publishTime DESC) as rn
        FROM windfor_forecasts
        WHERE publishTime <= ? AND startTime LIKE ?
    )
    SELECT startTime, forecast_gen, publishTime
    FROM latest_fc
    WHERE rn = 1
    ORDER BY startTime
    """
    cur.execute(query_latest, (decision_cutoff_time, f"{delivery_date}%"))
    latest_rows = [dict(r) for r in cur.fetchall()]

    # 2. Hourly actuals averaged from half-hourly FUELHH
    query_actuals_hourly = """
    SELECT substr(startTime, 1, 13) || ':00:00Z' as hourStartTime,
           avg(generation) as actual_gen_avg,
           count(*) as sample_count
    FROM fuelhh_wind_actuals
    WHERE startTime LIKE ?
    GROUP BY substr(startTime, 1, 13)
    ORDER BY hourStartTime
    """
    cur.execute(query_actuals_hourly, (f"{delivery_date}%",))
    actual_hourly = {r["hourStartTime"]: dict(r) for r in cur.fetchall()}

    # 3. Raw half-hourly actuals
    cur.execute("""
    SELECT startTime, settlementDate, settlementPeriod, publishTime, generation
    FROM fuelhh_wind_actuals
    WHERE startTime LIKE ?
    ORDER BY startTime
    """, (f"{delivery_date}%",))
    actual_half_hourly = [dict(r) for r in cur.fetchall()]

    # 4. Optional: Forecast vintages (prior updates published leading up to decision)
    vintages = {}
    if include_vintages:
        cur.execute("""
        SELECT publishTime, startTime, generation
        FROM windfor_forecasts
        WHERE startTime LIKE ? AND publishTime <= ?
        ORDER BY publishTime ASC
        """, (f"{delivery_date}%", decision_cutoff_time))
        for r in cur.fetchall():
            pt = r["publishTime"]
            if pt not in vintages:
                vintages[pt] = []
            vintages[pt].append({"startTime": r["startTime"], "generation": r["generation"]})

    conn.close()

    # Merge matched periods
    periods = []
    total_fc = 0.0
    total_act = 0.0
    valid_count = 0

    for fc in latest_rows:
        st = fc["startTime"]
        act_info = actual_hourly.get(st)
        act_gen = act_info["actual_gen_avg"] if act_info else None
        fc_gen = fc["forecast_gen"]
        
        err = (act_gen - fc_gen) if act_gen is not None else None
        abs_err = abs(err) if err is not None else None
        pct_err = ((err / act_gen) * 100) if (err is not None and act_gen and act_gen > 10) else None

        if act_gen is not None:
            total_fc += fc_gen
            total_act += act_gen
            valid_count += 1

        periods.append({
            "startTime": st,
            "hour": int(st[11:13]),
            "forecast_mw": fc_gen,
            "forecast_publish_time": fc["publishTime"],
            "actual_mw": act_gen,
            "error_mw": err, # Actual - Forecast
            "abs_error_mw": abs_err,
            "pct_error": pct_err
        })

    day_summary = {
        "delivery_date": delivery_date,
        "decision_cutoff": decision_cutoff_time,
        "periods_count": len(periods),
        "actual_available_count": valid_count,
        "avg_forecast_mw": (total_fc / valid_count) if valid_count > 0 else 0.0,
        "avg_actual_mw": (total_act / valid_count) if valid_count > 0 else 0.0,
        "day_total_forecast_gwh": (total_fc / 1000.0) if valid_count > 0 else 0.0,
        "day_total_actual_gwh": (total_act / 1000.0) if valid_count > 0 else 0.0,
    }

    return {
        "summary": day_summary,
        "periods": periods,
        "half_hourly_actuals": actual_half_hourly,
        "vintages": vintages
    }
