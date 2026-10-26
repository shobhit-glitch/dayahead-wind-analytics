import React, { useState } from 'react';
import { Wind, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Layers, Eye, Table } from 'lucide-react';

export default function DayAheadForecast({ data, loading, decisionDate, cutoffHour }) {
  const [showVintages, setShowVintages] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (loading || !data || !data.periods) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }}>Loading Day-Ahead Forecast Data...</div>
      </div>
    );
  }

  const { summary, periods, vintages, half_hourly_actuals } = data;
  const deliveryDate = summary.delivery_date;

  // Calculate day stats
  const peakPeriod = periods.reduce((max, p) => (p.forecast_mw > max.forecast_mw ? p : max), periods[0] || { forecast_mw: 0, hour: 0 });
  const minPeriod = periods.reduce((min, p) => (p.forecast_mw < min.forecast_mw ? p : min), periods[0] || { forecast_mw: 0, hour: 0 });
  const avgError = periods.filter(p => p.error_mw !== null).reduce((sum, p) => sum + p.error_mw, 0) / (summary.actual_available_count || 1);
  const isOverforecastDay = avgError < 0;

  // Chart Dimensions & Scales
  const chartWidth = 960;
  const chartHeight = 320;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...periods.map(p => Math.max(p.forecast_mw || 0, p.actual_mw || 0)),
    1000
  ) * 1.15;

  const getX = (idx) => padLeft + (idx / 23) * innerW;
  const getY = (val) => padTop + innerH - (val / maxVal) * innerH;

  // Line paths
  const forecastPoints = periods.map((p, i) => `${getX(i)},${getY(p.forecast_mw)}`).join(' ');
  const actualPoints = periods.filter(p => p.actual_mw !== null).map((p, i) => `${getX(i)},${getY(p.actual_mw)}`).join(' ');

  // SVG Area paths for error shading
  let shadedAreas = [];
  for (let i = 0; i < periods.length - 1; i++) {
    const p1 = periods[i];
    const p2 = periods[i + 1];
    if (p1.actual_mw !== null && p2.actual_mw !== null) {
      const x1 = getX(i);
      const x2 = getX(i + 1);
      const yF1 = getY(p1.forecast_mw);
      const yF2 = getY(p2.forecast_mw);
      const yA1 = getY(p1.actual_mw);
      const yA2 = getY(p2.actual_mw);
      
      const isOver = p1.forecast_mw > p1.actual_mw;
      const pathD = `M ${x1} ${yF1} L ${x2} ${yF2} L ${x2} ${yA2} L ${x1} ${yA1} Z`;
      shadedAreas.push(
        <path
          key={`shade-${i}`}
          d={pathD}
          fill={isOver ? 'rgba(244, 63, 94, 0.22)' : 'rgba(16, 185, 129, 0.22)'}
        />
      );
    }
  }

  // Vintage lines
  const vintageEntries = Object.entries(vintages || {}).filter(([pt]) => pt !== periods[0]?.forecast_publish_time);

  return (
    <div>
      {/* Context Banner */}
      <div className={`alert-banner ${isOverforecastDay ? 'warning' : 'info'}`}>
        <div className="alert-icon">
          {isOverforecastDay ? <AlertTriangle size={18} color="var(--accent-amber)" /> : <ShieldCheck size={18} color="var(--accent-cyan)" />}
        </div>
        <div>
          <strong>Day-Ahead Decision Context: </strong>
          Bids for delivery day <strong>{deliveryDate}</strong> submitted on <strong>{decisionDate}</strong> before <strong>{cutoffHour} GMT</strong> Gate Closure.
          {isOverforecastDay ? (
            <span> The latest available Elexon forecast <strong>over-predicted</strong> wind by an average of <strong>{Math.abs(avgError).toFixed(0)} MW</strong>, exposing unhedged procurement desks to System Buy Price cashout penalties.</span>
          ) : (
            <span> The latest available Elexon forecast was conservative; actual wind exceeded forecast by an average of <strong>{avgError.toFixed(0)} MW</strong>.</span>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Day-Ahead Expected Wind</span>
            <span className="kpi-badge cyan">Cutoff {cutoffHour.slice(0, 5)}</span>
          </div>
          <div className="kpi-value">
            {summary.day_total_forecast_gwh.toFixed(1)}
            <span className="kpi-unit">GWh</span>
          </div>
          <div className="kpi-footer">Avg rate: {summary.avg_forecast_mw.toFixed(0)} MW/hr</div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span className="kpi-label">Actual Wind Delivered</span>
            <span className="kpi-badge emerald">FUELHH Verified</span>
          </div>
          <div className="kpi-value">
            {summary.day_total_actual_gwh.toFixed(1)}
            <span className="kpi-unit">GWh</span>
          </div>
          <div className="kpi-footer">Avg rate: {summary.avg_actual_mw.toFixed(0)} MW/hr</div>
        </div>

        <div className={`kpi-card ${isOverforecastDay ? 'rose' : 'emerald'}`}>
          <div className="kpi-header">
            <span className="kpi-label">Forecast Discrepancy (Bias)</span>
            <span className={`kpi-badge ${isOverforecastDay ? 'rose' : 'emerald'}`}>
              {isOverforecastDay ? 'Over-Forecast' : 'Under-Forecast'}
            </span>
          </div>
          <div className="kpi-value">
            {avgError > 0 ? `+${avgError.toFixed(0)}` : avgError.toFixed(0)}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-footer">
            Net day variance: {((summary.day_total_actual_gwh - summary.day_total_forecast_gwh) / (summary.day_total_forecast_gwh || 1) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Peak Wind Period</span>
            <span className="kpi-badge amber">Hour {peakPeriod.hour}:00</span>
          </div>
          <div className="kpi-value">
            {peakPeriod.forecast_mw.toFixed(0)}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-footer">Min generation: {minPeriod.forecast_mw.toFixed(0)} MW (Hour {minPeriod.hour}:00)</div>
        </div>
      </div>

      {/* Main Delivery Day Curve Visualization */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon">
              <Wind size={16} />
            </div>
            <div>
              <div className="card-title">Day-Ahead Wind Forecast vs Actual Generation</div>
              <div className="card-subtitle">
                Target Delivery Day: {deliveryDate} (UTC) &bull; Gate Closure Snapshot at {decisionDate}T{cutoffHour}Z
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              className={`action-btn ${showVintages ? 'primary' : ''}`}
              onClick={() => setShowVintages(!showVintages)}
              title="Toggle earlier forecast runs published on D-1"
            >
              <Layers size={13} />
              {showVintages ? 'Hide Vintages' : 'Show Earlier Vintages'}
            </button>
            <button
              className="action-btn"
              onClick={() => setShowTable(!showTable)}
              title="Toggle settlement period details table"
            >
              <Table size={13} />
              {showTable ? 'Hide Table' : 'Period Table'}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-line" style={{ background: 'var(--accent-cyan)', height: '3px' }} />
            <strong>Latest DA Forecast at Gate Closure ({periods[0]?.forecast_publish_time?.slice(11, 16) || cutoffHour.slice(0, 5)}Z)</strong>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: 'var(--accent-emerald)', height: '3px' }} />
            <strong>Actual Generation (FUELHH Wind)</strong>
          </div>
          {showVintages && (
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#64748b', borderTop: '2px dashed #94a3b8' }} />
              <span>Prior Forecast Vintages ({vintageEntries.length} runs)</span>
            </div>
          )}
          <div className="legend-item">
            <span className="legend-dot" style={{ background: 'rgba(244, 63, 94, 0.7)' }} />
            <span>Over-Forecast Shortfall Area (Deficit Risk)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: 'rgba(16, 185, 129, 0.7)' }} />
            <span>Under-Forecast Surplus Area</span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="chart-container" style={{ position: 'relative' }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="chart-svg"
            onMouseLeave={() => setActiveTooltip(null)}
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const yVal = ratio * maxVal;
              const yPos = getY(yVal);
              return (
                <g key={`grid-${ratio}`}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={chartWidth - padRight}
                    y2={yPos}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {Math.round(yVal)} MW
                  </text>
                </g>
              );
            })}

            {/* X-Axis Labels */}
            {periods.map((p, idx) => {
              if (idx % 2 === 0) {
                const xPos = getX(idx);
                return (
                  <g key={`x-lbl-${idx}`}>
                    <line
                      x1={xPos}
                      y1={chartHeight - padBottom}
                      x2={xPos}
                      y2={chartHeight - padBottom + 5}
                      stroke="rgba(255, 255, 255, 0.15)"
                    />
                    <text
                      x={xPos}
                      y={chartHeight - padBottom + 18}
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                    >
                      {p.hour}:00
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Shaded Over/Under Areas */}
            {shadedAreas}

            {/* Earlier Forecast Vintages */}
            {showVintages && vintageEntries.map(([pt, runs], vIdx) => {
              const runMap = {};
              runs.forEach(r => { runMap[r.startTime] = r.generation; });
              const vPoints = periods.map((p, i) => {
                const gen = runMap[p.startTime];
                return gen !== undefined ? `${getX(i)},${getY(gen)}` : null;
              }).filter(Boolean).join(' ');

              return (
                <polyline
                  key={`vintage-${pt}`}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.6"
                  points={vPoints}
                />
              );
            })}

            {/* Day-Ahead Forecast Line (Primary Cyan) */}
            <polyline
              fill="none"
              stroke="var(--accent-cyan)"
              strokeWidth="3"
              points={forecastPoints}
            />

            {/* Actual Generation Line (Emerald Green) */}
            <polyline
              fill="none"
              stroke="var(--accent-emerald)"
              strokeWidth="2.5"
              points={actualPoints}
            />

            {/* Data Point Circles and Hover Hitboxes */}
            {periods.map((p, idx) => {
              const xPos = getX(idx);
              const yFc = getY(p.forecast_mw);
              const yAct = p.actual_mw !== null ? getY(p.actual_mw) : null;

              return (
                <g key={`point-${idx}`}>
                  {/* Forecast Circle */}
                  <circle
                    cx={xPos}
                    cy={yFc}
                    r="4"
                    fill="var(--accent-cyan)"
                    stroke="#0b0f19"
                    strokeWidth="1.5"
                  />
                  {/* Actual Circle */}
                  {yAct !== null && (
                    <circle
                      cx={xPos}
                      cy={yAct}
                      r="4"
                      fill="var(--accent-emerald)"
                      stroke="#0b0f19"
                      strokeWidth="1.5"
                    />
                  )}
                  {/* Transparent Interactive Rect */}
                  <rect
                    x={xPos - innerW / 46}
                    y={padTop}
                    width={innerW / 23}
                    height={innerH}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setActiveTooltip({ period: p, x: xPos, y: yFc })}
                  />
                </g>
              );
            })}

            {/* Active Crosshair */}
            {activeTooltip && (
              <g>
                <line
                  x1={activeTooltip.x}
                  y1={padTop}
                  x2={activeTooltip.x}
                  y2={chartHeight - padBottom}
                  stroke="rgba(6, 182, 212, 0.4)"
                  strokeDasharray="4 4"
                />
              </g>
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {activeTooltip && (
            <div
              className="chart-tooltip"
              style={{
                left: `${(activeTooltip.x / chartWidth) * 100}%`,
                top: `${(activeTooltip.y / chartHeight) * 100}%`,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#fff' }}>
                Delivery: {deliveryDate} &bull; Hour {activeTooltip.period.hour}:00 UTC
              </div>
              <div style={{ color: 'var(--accent-cyan)' }}>
                DA Forecast: <strong>{activeTooltip.period.forecast_mw.toFixed(0)} MW</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                  (Pub: {activeTooltip.period.forecast_publish_time?.slice(11, 16)}Z)
                </span>
              </div>
              <div style={{ color: 'var(--accent-emerald)' }}>
                Actual Wind: <strong>{activeTooltip.period.actual_mw !== null ? `${activeTooltip.period.actual_mw.toFixed(0)} MW` : 'Pending'}</strong>
              </div>
              {activeTooltip.period.error_mw !== null && (
                <div style={{ marginTop: '0.2rem', color: activeTooltip.period.error_mw < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                  Error: <strong>{activeTooltip.period.error_mw > 0 ? `+${activeTooltip.period.error_mw.toFixed(0)}` : activeTooltip.period.error_mw.toFixed(0)} MW</strong>
                  {' '}({activeTooltip.period.error_mw < 0 ? 'Over-forecast' : 'Under-forecast'})
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hourly Settlement Breakdown Table (Expandable) */}
      {showTable && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Settlement Period Breakdown ({deliveryDate})</div>
            <div className="card-subtitle">24 Hourly Intervals &bull; Matching Gate Closure Snapshot to FUELHH Actuals</div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hour (UTC)</th>
                  <th>Target Start Time</th>
                  <th>DA Forecast (MW)</th>
                  <th>Forecast Publish Time</th>
                  <th>Actual Gen (MW)</th>
                  <th>Deviation (MW)</th>
                  <th>Percentage Error</th>
                  <th>Risk Status</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const isOver = p.error_mw !== null && p.error_mw < 0;
                  return (
                    <tr key={p.startTime}>
                      <td>{p.hour}:00</td>
                      <td>{p.startTime}</td>
                      <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{p.forecast_mw.toFixed(0)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.forecast_publish_time}</td>
                      <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                        {p.actual_mw !== null ? p.actual_mw.toFixed(0) : '—'}
                      </td>
                      <td>
                        {p.error_mw !== null ? (
                          <span className={`error-pill ${isOver ? 'over' : 'under'}`}>
                            {p.error_mw > 0 ? `+${p.error_mw.toFixed(0)}` : p.error_mw.toFixed(0)} MW
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {p.pct_error !== null ? `${p.pct_error > 0 ? '+' : ''}${p.pct_error.toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        {isOver ? (
                          <span style={{ color: 'var(--accent-rose)', fontSize: '0.72rem' }}>Short Imbalance Risk</span>
                        ) : (
                          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.72rem' }}>Long Surplus</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
