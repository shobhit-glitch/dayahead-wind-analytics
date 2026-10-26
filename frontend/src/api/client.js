const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDates() {
  const res = await fetch(`${API_BASE}/api/dates`);
  if (!res.ok) throw new Error(`Fetch dates failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDayAheadData(decisionDate, deliveryDate, cutoffHour = '11:00:00', includeVintages = true) {
  const params = new URLSearchParams();
  if (decisionDate) params.append('decision_date', decisionDate);
  if (deliveryDate) params.append('delivery_date', deliveryDate);
  if (cutoffHour) params.append('cutoff_hour', cutoffHour);
  params.append('include_vintages', includeVintages ? 'true' : 'false');

  const res = await fetch(`${API_BASE}/api/day-ahead?${params.toString()}`);
  if (!res.ok) throw new Error(`Fetch day-ahead failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAccuracyMetrics(startDate = '2026-01-01', endDate = '2026-01-31', cutoffHour = '11:00:00') {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_hour: cutoffHour
  });

  const res = await fetch(`${API_BASE}/api/accuracy?${params.toString()}`);
  if (!res.ok) throw new Error(`Fetch accuracy failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSimulation(strategy = 'debias', daPrice = 95, shortPenalty = 240, spillPrice = 45, customBuffer = -1800) {
  const params = new URLSearchParams({
    strategy,
    da_price: daPrice.toString(),
    short_penalty: shortPenalty.toString(),
    spill_price: spillPrice.toString(),
    custom_buffer: customBuffer.toString()
  });

  const res = await fetch(`${API_BASE}/api/simulate?${params.toString()}`);
  if (!res.ok) throw new Error(`Fetch simulation failed: ${res.statusText}`);
  return res.json();
}

export async function triggerSync(dataset = 'WINDFOR') {
  const res = await fetch(`${API_BASE}/api/sync?dataset=${dataset}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Sync trigger failed: ${res.statusText}`);
  return res.json();
}

export function getExportCsvUrl(startDate = '2026-01-01', endDate = '2026-01-31', cutoffHour = '11:00:00') {
  return `${API_BASE}/api/export/csv?start_date=${startDate}&end_date=${endDate}&cutoff_hour=${cutoffHour}`;
}
