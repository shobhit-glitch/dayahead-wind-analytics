import urllib.request
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List
import os

from backend.data_store import DB_PATH, get_db_connection

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

def test_elexon_api_connection() -> Dict[str, Any]:
    """Tests connectivity to Elexon BMRS API stream endpoints."""
    url = f"{ELEXON_BASE}/FUELHH/stream"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Gridbricks-DayAhead/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "status": "online",
                "http_status": resp.status,
                "sample_count": len(data) if isinstance(data, list) else 0,
                "message": "Connected to Elexon BMRS Stream API successfully"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

def sync_stream_for_range(dataset: str, from_iso: str, to_iso: str) -> int:
    """Fetches a stream range and upserts into local SQLite DB."""
    url = f"{ELEXON_BASE}/{dataset}/stream?publishDateTimeFrom={from_iso}&publishDateTimeTo={to_iso}"
    req = urllib.request.Request(url, headers={"User-Agent": "Gridbricks-DayAhead/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        records = json.loads(resp.read().decode("utf-8"))
    
    conn = get_db_connection()
    cur = conn.cursor()
    inserted = 0

    if dataset == "FUELHH":
        wind_actuals = [r for r in records if r.get("fuelType") == "WIND"]
        for r in wind_actuals:
            cur.execute("""
            INSERT INTO fuelhh_wind_actuals (startTime, settlementDate, settlementPeriod, publishTime, generation)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(startTime) DO UPDATE SET
                settlementDate=excluded.settlementDate,
                settlementPeriod=excluded.settlementPeriod,
                publishTime=excluded.publishTime,
                generation=excluded.generation
            """, (
                r.get("startTime"),
                r.get("settlementDate"),
                r.get("settlementPeriod"),
                r.get("publishTime"),
                float(r.get("generation", 0.0))
            ))
            inserted += 1
        conn.commit()

    elif dataset == "WINDFOR":
        batch = []
        for r in records:
            st = r.get("startTime")
            pt = r.get("publishTime")
            gen = r.get("generation")
            if st and pt and gen is not None:
                batch.append((pt, st, float(gen)))
        if batch:
            cur.executemany("""
            INSERT INTO windfor_forecasts (publishTime, startTime, generation)
            VALUES (?, ?, ?)
            """, batch)
            inserted += len(batch)
            conn.commit()

    conn.close()
    return inserted
