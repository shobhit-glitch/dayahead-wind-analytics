import sqlite3
import numpy as np
from typing import Dict, Any, List, Optional
from backend.data_store import get_db_connection

def calculate_forecast_accuracy(
    start_date: str = "2026-01-01",
    end_date: str = "2026-01-31",
    decision_cutoff_hour: str = "11:00:00"
) -> Dict[str, Any]:
    """
    Computes rigorous quantitative accuracy metrics for day-ahead wind forecasts
    across the specified delivery date range.
    
    Decision time rule: For delivery day D, the decision cutoff is (D - 1 day) at decision_cutoff_hour.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Query matching each delivery period with the latest forecast published on or before D-1 cutoff
    query = """
    WITH latest_fc AS (
        SELECT startTime, generation as forecast_gen, publishTime,
               ROW_NUMBER() OVER (
                   PARTITION BY startTime 
                   ORDER BY publishTime DESC
               ) as rn
        FROM windfor_forecasts
        WHERE publishTime <= date(startTime, '-1 day') || 'T' || ? || 'Z'
          AND startTime >= ? || 'T00:00:00Z'
          AND startTime <= ? || 'T23:59:59Z'
    ),
    hourly_actuals AS (
        SELECT substr(startTime, 1, 13) || ':00:00Z' as hourStartTime,
               avg(generation) as actual_gen_avg,
               count(*) as sp_count
        FROM fuelhh_wind_actuals
        WHERE startTime >= ? || 'T00:00:00Z'
          AND startTime <= ? || 'T23:59:59Z'
        GROUP BY substr(startTime, 1, 13)
    )
    SELECT fc.startTime,
           fc.forecast_gen,
           act.actual_gen_avg,
           (act.actual_gen_avg - fc.forecast_gen) as error_mw,
           fc.publishTime
    FROM latest_fc fc
    JOIN hourly_actuals act ON fc.startTime = act.hourStartTime
    WHERE fc.rn = 1
    ORDER BY fc.startTime
    """
    cur.execute(query, (decision_cutoff_hour, start_date, end_date, start_date, end_date))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return {"error": "No matched data available for the given range"}

    records = []
    actuals_list = []
    forecasts_list = []
    errors_list = []

    for r in rows:
        st = r["startTime"]
        fc = float(r["forecast_gen"])
        act = float(r["actual_gen_avg"])
        err = act - fc # Error = Actual - Forecast
        records.append({
            "startTime": st,
            "date": st[:10],
            "hour": int(st[11:13]),
            "forecast_mw": fc,
            "actual_mw": act,
            "error_mw": err,
            "abs_error_mw": abs(err),
            "publish_time": r["publishTime"]
        })
        actuals_list.append(act)
        forecasts_list.append(fc)
        errors_list.append(err)

    actuals = np.array(actuals_list)
    forecasts = np.array(forecasts_list)
    errors = np.array(errors_list)
    abs_errors = np.abs(errors)

    n_samples = len(errors)
    mean_act = float(np.mean(actuals))
    mean_fc = float(np.mean(forecasts))
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    bias = float(np.mean(errors)) # Negative means actual < forecast (systematic over-forecast)
    mape = float(np.mean(abs_errors / np.maximum(actuals, 100.0)) * 100.0)
    nmae = float((mae / mean_act) * 100.0) if mean_act > 0 else 0.0

    # Installed UK wind capacity context (~30,000 MW in 2026)
    est_capacity_mw = 30000.0
    nmae_capacity = float((mae / est_capacity_mw) * 100.0)

    # Over vs Under forecasting asymmetry
    over_fc_mask = errors < 0 # Actual < Forecast (desk under-procured thermal, short)
    under_fc_mask = errors > 0 # Actual > Forecast (desk over-procured thermal, long)

    over_count = int(np.sum(over_fc_mask))
    under_count = int(np.sum(under_fc_mask))
    over_pct = float((over_count / n_samples) * 100.0)
    under_pct = float((under_count / n_samples) * 100.0)

    avg_over_mw = float(np.mean(np.abs(errors[over_fc_mask]))) if over_count > 0 else 0.0
    avg_under_mw = float(np.mean(errors[under_fc_mask])) if under_count > 0 else 0.0
    max_over_mw = float(np.max(np.abs(errors[over_fc_mask]))) if over_count > 0 else 0.0
    max_under_mw = float(np.max(errors[under_fc_mask])) if under_count > 0 else 0.0

    # Percentiles / Quantiles
    p10 = float(np.percentile(errors, 10))
    p25 = float(np.percentile(errors, 25))
    p50 = float(np.percentile(errors, 50))
    p75 = float(np.percentile(errors, 75))
    p90 = float(np.percentile(errors, 90))

    # Daily breakdown
    daily_stats = {}
    for r in records:
        d = r["date"]
        if d not in daily_stats:
            daily_stats[d] = {"errors": [], "abs_errors": [], "actuals": [], "forecasts": []}
        daily_stats[d]["errors"].append(r["error_mw"])
        daily_stats[d]["abs_errors"].append(r["abs_error_mw"])
        daily_stats[d]["actuals"].append(r["actual_mw"])
        daily_stats[d]["forecasts"].append(r["forecast_mw"])

    daily_series = []
    for d, v in sorted(daily_stats.items()):
        d_errs = np.array(v["errors"])
        d_abs = np.array(v["abs_errors"])
        d_acts = np.array(v["actuals"])
        d_fcs = np.array(v["forecasts"])
        daily_series.append({
            "date": d,
            "mae": float(np.mean(d_abs)),
            "rmse": float(np.sqrt(np.mean(d_errs ** 2))),
            "bias": float(np.mean(d_errs)),
            "mean_actual": float(np.mean(d_acts)),
            "mean_forecast": float(np.mean(d_fcs)),
            "count": len(d_errs)
        })

    # Diurnal / Hourly profile (Hour 0 to 23)
    hourly_stats = {h: {"errors": [], "abs_errors": [], "actuals": [], "forecasts": []} for h in range(24)}
    for r in records:
        h = r["hour"]
        hourly_stats[h]["errors"].append(r["error_mw"])
        hourly_stats[h]["abs_errors"].append(r["abs_error_mw"])
        hourly_stats[h]["actuals"].append(r["actual_mw"])
        hourly_stats[h]["forecasts"].append(r["forecast_mw"])

    diurnal_profile = []
    for h in range(24):
        h_data = hourly_stats[h]
        if h_data["errors"]:
            h_errs = np.array(h_data["errors"])
            h_abs = np.array(h_data["abs_errors"])
            diurnal_profile.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "mae": float(np.mean(h_abs)),
                "rmse": float(np.sqrt(np.mean(h_errs ** 2))),
                "bias": float(np.mean(h_errs)),
                "mean_actual": float(np.mean(h_data["actuals"])),
                "mean_forecast": float(np.mean(h_data["forecasts"])),
                "is_peak": (7 <= h < 19)
            })

    # Peak vs Off-Peak comparison
    peak_errs = [r["error_mw"] for r in records if 7 <= r["hour"] < 19]
    off_peak_errs = [r["error_mw"] for r in records if r["hour"] < 7 or r["hour"] >= 19]

    peak_mae = float(np.mean(np.abs(peak_errs))) if peak_errs else 0.0
    off_peak_mae = float(np.mean(np.abs(off_peak_errs))) if off_peak_errs else 0.0
    peak_bias = float(np.mean(peak_errs)) if peak_errs else 0.0
    off_peak_bias = float(np.mean(off_peak_errs)) if off_peak_errs else 0.0

    # Error distribution histogram bins (-8000 to +6000 MW in 500 MW bins)
    hist_min = -7000
    hist_max = 5000
    bin_size = 500
    bins = list(range(hist_min, hist_max + bin_size, bin_size))
    hist_counts, bin_edges = np.histogram(errors, bins=bins)

    distribution = []
    for i in range(len(hist_counts)):
        b_start = int(bin_edges[i])
        b_end = int(bin_edges[i+1])
        distribution.append({
            "bin_start": b_start,
            "bin_end": b_end,
            "label": f"{b_start:+d} to {b_end:+d} MW",
            "count": int(hist_counts[i]),
            "percentage": float((hist_counts[i] / n_samples) * 100.0),
            "is_overforecast": b_end <= 0,
            "is_zero_bin": (b_start < 0 and b_end >= 0)
        })

    # Wind Generation Level Breakdown (Stratified by low, mid, high wind)
    # Low: < 6,000 MW, Mid: 6,000 - 15,000 MW, High: > 15,000 MW
    stratified = []
    for tier_label, low, high in [
        ("Low Wind (< 6 GW)", 0, 6000),
        ("Medium Wind (6 - 15 GW)", 6000, 15000),
        ("High Wind (> 15 GW)", 15000, 40000)
    ]:
        tier_errs = [r["error_mw"] for r in records if low <= r["actual_mw"] < high]
        if tier_errs:
            tier_arr = np.array(tier_errs)
            stratified.append({
                "tier": tier_label,
                "count": len(tier_errs),
                "mae": float(np.mean(np.abs(tier_arr))),
                "bias": float(np.mean(tier_arr)),
                "rmse": float(np.sqrt(np.mean(tier_arr ** 2)))
            })

    return {
        "parameters": {
            "start_date": start_date,
            "end_date": end_date,
            "decision_cutoff_hour": decision_cutoff_hour,
            "total_evaluated_hours": n_samples
        },
        "kpis": {
            "mean_actual_mw": mean_act,
            "mean_forecast_mw": mean_fc,
            "mae_mw": mae,
            "nmae_pct": nmae,
            "nmae_capacity_pct": nmae_capacity,
            "rmse_mw": rmse,
            "bias_mw": bias,
            "mape_pct": mape,
            "over_forecast_pct": over_pct,
            "under_forecast_pct": under_pct,
            "avg_over_forecast_mw": avg_over_mw,
            "avg_under_forecast_mw": avg_under_mw,
            "max_over_forecast_mw": max_over_mw,
            "max_under_forecast_mw": max_under_mw,
            "quantiles": {
                "p10": p10,
                "p25": p25,
                "p50": p50,
                "p75": p75,
                "p90": p90
            },
            "peak_vs_off_peak": {
                "peak_mae": peak_mae,
                "peak_bias": peak_bias,
                "off_peak_mae": off_peak_mae,
                "off_peak_bias": off_peak_bias
            }
        },
        "daily_series": daily_series,
        "diurnal_profile": diurnal_profile,
        "distribution": distribution,
        "stratified_by_wind_level": stratified,
        "sample_records": records[:50] # For inspection/export
    }
