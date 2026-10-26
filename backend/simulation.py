import numpy as np
from typing import Dict, Any, List, Optional
from backend.data_store import get_db_connection

def simulate_procurement_strategy(
    start_date: str = "2026-01-01",
    end_date: str = "2026-01-31",
    strategy_mode: str = "debias", # 'naive', 'debias', 'p75_hedge', 'p90_hedge', 'custom'
    day_ahead_price_per_mwh: float = 95.0, # £/MWh
    imbalance_short_penalty_per_mwh: float = 240.0, # £/MWh (System Buy Price)
    imbalance_long_spill_per_mwh: float = 45.0, # £/MWh (System Sell Price)
    custom_buffer_mw: float = -1800.0,
    assumed_consumer_load_factor: float = 1.3 # Consumer load as multiple of mean wind
) -> Dict[str, Any]:
    """
    Simulates Day-Ahead procurement outcomes for an energy utility desk
    comparing Naive Forecast procurement vs Quantified-Error-Adjusted procurement.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Query all matched periods in Jan 2026
    query = """
    WITH latest_fc AS (
        SELECT startTime, generation as forecast_gen,
               ROW_NUMBER() OVER (PARTITION BY startTime ORDER BY publishTime DESC) as rn
        FROM windfor_forecasts
        WHERE publishTime <= date(startTime, '-1 day') || 'T11:00:00Z'
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
    SELECT fc.startTime, fc.forecast_gen, act.actual_gen_avg
    FROM latest_fc fc
    JOIN hourly_actuals act ON fc.startTime = act.hourStartTime
    WHERE fc.rn = 1
    ORDER BY fc.startTime
    """
    cur.execute(query, (start_date, end_date, start_date, end_date))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return {"error": "No data for simulation"}

    forecasts = np.array([float(r["forecast_gen"]) for r in rows])
    actuals = np.array([float(r["actual_gen_avg"]) for r in rows])
    errors = actuals - forecasts # Actual - Forecast

    # Benchmark metrics
    historical_bias = float(np.mean(errors)) # ~ -1840 MW
    p25_error = float(np.percentile(errors, 25)) # ~ -3000 MW
    p10_error = float(np.percentile(errors, 10)) # ~ -4300 MW

    # Determine adjustment buffer
    if strategy_mode == "naive":
        buffer_mw = 0.0
        strategy_name = "Naive (100% Trust in Forecast)"
    elif strategy_mode == "debias":
        buffer_mw = historical_bias # Subtract systematic bias (~ -1840 MW)
        strategy_name = "De-biased Forecast (Correct Systematic Error)"
    elif strategy_mode == "p75_hedge":
        # Cover 75% of shortfall risk
        buffer_mw = p25_error
        strategy_name = "Prudent Risk Hedge (75% Shortfall Protection)"
    elif strategy_mode == "p90_hedge":
        # Cover 90% of shortfall risk
        buffer_mw = p10_error
        strategy_name = "Conservative Risk Hedge (90% Shortfall Protection)"
    else: # custom
        buffer_mw = custom_buffer_mw
        strategy_name = f"Custom Buffer ({custom_buffer_mw:+.0f} MW)"

    # Base consumer load profile (illustrative utility serving ~1.3x mean wind)
    mean_load = np.mean(actuals) * assumed_consumer_load_factor
    # Diurnal shape: higher in peak hours
    n_hours = len(rows)
    hours = np.array([int(r["startTime"][11:13]) for r in rows])
    diurnal_multiplier = 1.0 + 0.25 * np.sin((hours - 6) * np.pi / 12)
    consumer_demand = mean_load * diurnal_multiplier

    # 1. NAIVE STRATEGY (Procure = Demand - Forecast)
    naive_procured = np.maximum(0, consumer_demand - forecasts)
    naive_short_vol = np.maximum(0, (forecasts - actuals)) # Over-forecast -> short in market
    naive_long_vol = np.maximum(0, (actuals - forecasts))  # Under-forecast -> long in market

    naive_da_cost = np.sum(naive_procured) * day_ahead_price_per_mwh
    naive_short_cost = np.sum(naive_short_vol) * imbalance_short_penalty_per_mwh
    naive_long_revenue = np.sum(naive_long_vol) * imbalance_long_spill_per_mwh
    naive_net_cost = naive_da_cost + naive_short_cost - naive_long_revenue

    # 2. RISK-ADJUSTED STRATEGY (Procure = Demand - (Forecast + Buffer))
    adjusted_wind_estimate = np.maximum(0, forecasts + buffer_mw)
    adjusted_procured = np.maximum(0, consumer_demand - adjusted_wind_estimate)
    
    # Imbalance under adjusted strategy:
    # Delivered power = Adjusted_procured + Actual_wind
    # Net balance = Delivered - Demand
    imbalance = (adjusted_procured + actuals) - consumer_demand
    adj_short_vol = np.maximum(0, -imbalance)
    adj_long_vol = np.maximum(0, imbalance)

    adj_da_cost = np.sum(adjusted_procured) * day_ahead_price_per_mwh
    adj_short_cost = np.sum(adj_short_vol) * imbalance_short_penalty_per_mwh
    adj_long_revenue = np.sum(adj_long_vol) * imbalance_long_spill_per_mwh
    adj_net_cost = adj_da_cost + adj_short_cost - adj_long_revenue

    cost_difference = naive_net_cost - adj_net_cost # Positive = savings
    short_vol_reduction = np.sum(naive_short_vol) - np.sum(adj_short_vol)

    return {
        "parameters": {
            "start_date": start_date,
            "end_date": end_date,
            "strategy_mode": strategy_mode,
            "strategy_name": strategy_name,
            "applied_buffer_mw": buffer_mw,
            "historical_mean_bias_mw": historical_bias,
            "day_ahead_price_gbp": day_ahead_price_per_mwh,
            "imbalance_short_penalty_gbp": imbalance_short_penalty_per_mwh,
            "imbalance_long_spill_gbp": imbalance_long_spill_per_mwh
        },
        "comparison": {
            "naive": {
                "day_ahead_procured_mwh": float(np.sum(naive_procured)),
                "short_imbalance_mwh": float(np.sum(naive_short_vol)),
                "long_imbalance_mwh": float(np.sum(naive_long_vol)),
                "da_procurement_cost_gbp": float(naive_da_cost),
                "imbalance_penalty_cost_gbp": float(naive_short_cost),
                "spill_revenue_gbp": float(naive_long_revenue),
                "total_net_cost_gbp": float(naive_net_cost),
                "cost_per_mwh_demand": float(naive_net_cost / np.sum(consumer_demand))
            },
            "adjusted": {
                "day_ahead_procured_mwh": float(np.sum(adjusted_procured)),
                "short_imbalance_mwh": float(np.sum(adj_short_vol)),
                "long_imbalance_mwh": float(np.sum(adj_long_vol)),
                "da_procurement_cost_gbp": float(adj_da_cost),
                "imbalance_penalty_cost_gbp": float(adj_short_cost),
                "spill_revenue_gbp": float(adj_long_revenue),
                "total_net_cost_gbp": float(adj_net_cost),
                "cost_per_mwh_demand": float(adj_net_cost / np.sum(consumer_demand))
            },
            "benefit": {
                "net_savings_gbp": float(cost_difference),
                "savings_percentage": float((cost_difference / naive_net_cost) * 100.0) if naive_net_cost > 0 else 0.0,
                "short_imbalance_mwh_avoided": float(short_vol_reduction),
                "shortfall_exposure_reduction_pct": float((short_vol_reduction / np.sum(naive_short_vol)) * 100.0) if np.sum(naive_short_vol) > 0 else 0.0
            }
        }
    }
