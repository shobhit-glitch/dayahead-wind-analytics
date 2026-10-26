import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app

class TestElexonAnalyticsAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "online")
        self.assertGreater(data["database"]["forecasts_count"], 10000)
        self.assertGreater(data["database"]["actuals_count"], 1000)

    def test_available_dates(self):
        resp = self.client.get("/api/dates")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("2026-01-15", data["decision_dates"])

    def test_day_ahead_endpoint(self):
        resp = self.client.get("/api/day-ahead?decision_date=2026-01-15&cutoff_hour=11:00:00")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["decision_date"], "2026-01-15")
        self.assertEqual(data["summary"]["delivery_date"], "2026-01-16")
        self.assertEqual(len(data["periods"]), 24)
        first_p = data["periods"][0]
        self.assertIn("forecast_mw", first_p)
        self.assertIn("actual_mw", first_p)
        self.assertIn("error_mw", first_p)

    def test_accuracy_endpoint(self):
        resp = self.client.get("/api/accuracy?start_date=2026-01-01&end_date=2026-01-31")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("kpis", data)
        self.assertGreater(data["kpis"]["mae_mw"], 1000)
        self.assertIn("diurnal_profile", data)
        self.assertEqual(len(data["diurnal_profile"]), 24)
        self.assertIn("distribution", data)
        self.assertIn("stratified_by_wind_level", data)

    def test_simulate_endpoint(self):
        resp = self.client.get("/api/simulate?strategy=debias&da_price=95&short_penalty=240")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("comparison", data)
        benefit = data["comparison"]["benefit"]
        self.assertGreater(benefit["net_savings_gbp"], 0)

    def test_export_csv(self):
        resp = self.client.get("/api/export/csv?start_date=2026-01-01&end_date=2026-01-05")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/csv", resp.headers["content-type"])
        self.assertIn("Delivery_StartTime_UTC", resp.text)

if __name__ == "__main__":
    unittest.main()
