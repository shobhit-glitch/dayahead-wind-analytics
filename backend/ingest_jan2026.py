import os
import sys
import json
import sqlite3
import time
import urllib.request
from datetime import datetime, timedelta

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "elexon_jan_2026.db")

def init_db(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS fuelhh_wind_actuals (
        startTime TEXT PRIMARY KEY,
        settlementDate TEXT,
        settlementPeriod INTEGER,
        publishTime TEXT,
        generation REAL
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS windfor_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        publishTime TEXT,
        startTime TEXT,
        generation REAL
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_windfor_start_pub ON windfor_forecasts (startTime, publishTime)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_windfor_pub ON windfor_forecasts (publishTime)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_windfor_start ON windfor_forecasts (startTime)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_actuals_date ON fuelhh_wind_actuals (settlementDate)")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
    )
    """)
    conn.commit()
    conn.close()

def fetch_elexon_stream(dataset, from_iso, to_iso, max_retries=3):
    url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/{dataset}/stream?publishDateTimeFrom={from_iso}&publishDateTimeTo={to_iso}"
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ElexonClient/1.0 (Gridbricks Project)"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception as e:
            print(f"[Warning] Failed {dataset} {from_iso}->{to_iso} (attempt {attempt+1}/{max_retries}): {e}")
            time.sleep(2 * (attempt + 1))
    return []

def ingest_dataset_chunked(dataset, start_dt, end_dt, chunk_days=5):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    curr_start = start_dt
    total_inserted = 0

    while curr_start < end_dt:
        curr_end = min(curr_start + timedelta(days=chunk_days), end_dt)
        start_iso = curr_start.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_iso = curr_end.strftime("%Y-%m-%dT%H:%M:%SZ")
        print(f"Fetching {dataset}: {start_iso} to {end_iso}...")
        
        records = fetch_elexon_stream(dataset, start_iso, end_iso)
        print(f"Received {len(records)} records for {dataset}")

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
            total_inserted += len(wind_actuals)
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
                total_inserted += len(batch)
                conn.commit()

        curr_start = curr_end
        time.sleep(0.5)

    cur.execute("INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?)",
                (f"{dataset}_last_sync", end_dt.isoformat(), datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    print(f"Completed {dataset}: total {total_inserted} records ingested.")

def main():
    print(f"Initializing SQLite database at: {DB_PATH}")
    init_db()

    # January 2026 window: 2025-12-30 to 2026-02-02
    start_dt = datetime(2025, 12, 30, 0, 0, 0)
    end_dt = datetime(2026, 2, 2, 23, 59, 59)

    print("=== Step 1: Ingesting FUELHH WIND actuals ===")
    ingest_dataset_chunked("FUELHH", start_dt, end_dt, chunk_days=5)

    print("=== Step 2: Ingesting WINDFOR forecasts ===")
    ingest_dataset_chunked("WINDFOR", start_dt, end_dt, chunk_days=4)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM fuelhh_wind_actuals")
    c_act = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM windfor_forecasts")
    c_fc = cur.fetchone()[0]
    print(f"\nIngestion Complete!\nTotal WIND Actuals: {c_act}\nTotal WINDFOR Forecasts: {c_fc}")
    conn.close()

if __name__ == "__main__":
    main()
