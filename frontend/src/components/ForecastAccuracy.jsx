import React, { useState } from 'react';
import { BarChart3, AlertTriangle, ShieldCheck, Activity, Target, Zap, Clock, PieChart, Layers } from 'lucide-react';

export default function ForecastAccuracy({ accuracyData, loading }) {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'diurnal', 'distribution', 'stratified'

  if (loading || !accuracyData || !accuracyData.kpis) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--accent-cyan)' }}>Computing Quantitative Forecast Accuracy Metrics...</div>
      </div>
    );
  }

  const { parameters, kpis, daily_series, diurnal_profile, distribution, stratified_by_wind_level } = accuracyData;

  // Chart helpers
  const chartW = 920;
  const chartH = 280;
  const padL = 50;
  const padR = 25;
  const padT = 25;
  const padB = 35;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  // Daily Series Scales
  const maxDailyVal = Math.max(...daily_series.map(d => Math.max(d.mae, Math.abs(d.bias))), 1000) * 1.15;
  const getDailyX = (i) => padL + (i / (daily_series.length - 1 || 1)) * innerW;
  const getDailyY = (val) => padT + innerH - ((val + maxDailyVal) / (2 * maxDailyVal)) * innerH; // centered at 0

  const zeroY = padT + innerH / 2;

  const maeDailyPoints = daily_series.map((d, i) => `${getDailyX(i)},${padT + innerH - (d.mae / maxDailyVal) * innerH}`).join(' ');
  const biasDailyPoints = daily_series.map((d, i) => `${getDailyX(i)},${getDailyY(d.bias)}`).join(' ');

  // Distribution Max
  const maxHistCount = Math.max(...distribution.map(d => d.count), 1);

  // Diurnal Max
  const maxDiurnalVal = Math.max(...diurnal_profile.map(d => Math.max(d.mae, Math.abs(d.bias))), 500) * 1.15;

  return (
    <div>
      {/* Central Finding Banner */}
      <div className="alert-banner danger">
        <div className="alert-icon">
          <AlertTriangle size={20} color="var(--accent-rose)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', color: '#ffe4e6' }}>
            Executive Finding: Systematic Over-Forecasting Bias in January 2026 Elexon WINDFOR Data
          </div>
          <div>
            Across <strong>{parameters.total_evaluated_hours} evaluated hours</strong> in January 2026, National Wind Forecasts exhibited an 
            <strong> {kpis.over_forecast_pct.toFixed(1)}% over-forecasting frequency</strong> with a mean systematic bias of 
            <strong> {kpis.bias_mw.toFixed(1)} MW</strong> and an MAE of <strong>{kpis.mae_mw.toFixed(1)} MW</strong> ({kpis.nmae_pct.toFixed(1)}% of mean generation). 
            Unadjusted day-ahead procurement exposed buyers to severe short balancing penalties in <strong>8 out of 10 days</strong>.
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Mean Absolute Error (MAE)</span>
            <span className="kpi-badge cyan">Avg Error</span>
          </div>
          <div className="kpi-value">
            {kpis.mae_mw.toFixed(1)}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-footer">
            {kpis.nmae_pct.toFixed(1)}% of mean gen &bull; {kpis.nmae_capacity_pct.toFixed(1)}% of fleet cap
          </div>
        </div>

        <div className="kpi-card indigo">
          <div className="kpi-header">
            <span className="kpi-label">Root Mean Square Error</span>
            <span className="kpi-badge cyan">RMSE</span>
          </div>
          <div className="kpi-value">
            {kpis.rmse_mw.toFixed(1)}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-footer">Penalizes extreme tail deviations</div>
        </div>

        <div className="kpi-card rose">
          <div className="kpi-header">
            <span className="kpi-label">Mean Error (Systematic Bias)</span>
            <span className="kpi-badge rose">Actual - Forecast</span>
          </div>
          <div className="kpi-value">
            {kpis.bias_mw.toFixed(1)}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-footer">
            Over-forecast rate: <strong>{kpis.over_forecast_pct.toFixed(1)}%</strong> of hours
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Average Shortfall Severity</span>
            <span className="kpi-badge amber">Short Imbalance</span>
          </div>
          <div className="kpi-value">
            {kpis.avg_over_forecast_mw.toFixed(0)}
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-footer">
            Max hourly shortfall: {kpis.max_over_forecast_mw.toFixed(0)} MW
          </div>
        </div>
      </div>

      {/* Quantile Uncertainty Bounds & Confidence Matrix */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="card-title">Empirical Forecast Error Quantiles & Uncertainty Bands</div>
              <div className="card-subtitle">
                Calibrated probability bounds for day-ahead risk hedging ($Actual_t - Forecast_t$)
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', fontWeight: 600 }}>P10 Quantile (Tail Risk)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
              {kpis.quantiles.p10.toFixed(0)} MW
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              90% of hours were better than this severe shortfall
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600 }}>P25 Quantile (Prudent Hedge)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
              {kpis.quantiles.p25.toFixed(0)} MW
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              75% confidence buffer against cashout exposure
            </div>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan-light)', fontWeight: 600 }}>P50 Median Error</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
              {kpis.quantiles.p50.toFixed(0)} MW
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Median shortfall across January 2026
            </div>
          </div>

          <div style={{ background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>P75 Quantile</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
              {kpis.quantiles.p75.toFixed(0)} MW
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Upper quartile deviation
            </div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald-light)', fontWeight: 600 }}>P90 Quantile (Surplus)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
              +{kpis.quantiles.p90.toFixed(0)} MW
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Only 10% of hours delivered higher surplus
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Tabs */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon">
              <BarChart3 size={16} />
            </div>
            <div>
              <div className="card-title">In-Depth Error Analytics & Distribution Patterns</div>
              <div className="card-subtitle">Examine diurnal, distribution, and monthly variance trends</div>
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`nav-tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              Daily Time Series
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'distribution' ? 'active' : ''}`}
              onClick={() => setActiveTab('distribution')}
            >
              Error Distribution
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'diurnal' ? 'active' : ''}`}
              onClick={() => setActiveTab('diurnal')}
            >
              Diurnal Profile
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'stratified' ? 'active' : ''}`}
              onClick={() => setActiveTab('stratified')}
            >
              Wind Speed Tiers
            </button>
          </div>
        </div>

        {/* View 1: Daily Time Series (MAE & Bias) */}
        {activeTab === 'daily' && (
          <div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-line" style={{ background: 'var(--accent-cyan)', height: '3px' }} />
                <span>Daily MAE (MW)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ background: 'var(--accent-rose)', height: '2.5px' }} />
                <span>Daily Mean Bias (MW, Actual - Forecast)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ background: 'rgba(255,255,255,0.2)', borderTop: '1px dashed #fff' }} />
                <span>Zero Error Baseline</span>
              </div>
            </div>

            <div className="chart-container">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="chart-svg">
                {/* Zero line */}
                <line
                  x1={padL}
                  y1={zeroY}
                  x2={chartW - padR}
                  y2={zeroY}
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeDasharray="4 4"
                />
                <text x={padL - 10} y={zeroY + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)">
                  0 MW
                </text>

                {/* Positive and Negative Reference Grid */}
                {[2000, 4000].map((val) => {
                  const yPosPos = zeroY - (val / (2 * maxDailyVal)) * innerH;
                  const yPosNeg = zeroY + (val / (2 * maxDailyVal)) * innerH;
                  return (
                    <g key={`daily-grid-${val}`}>
                      <line x1={padL} y1={yPosPos} x2={chartW - padR} y2={yPosPos} stroke="rgba(255,255,255,0.05)" />
                      <line x1={padL} y1={yPosNeg} x2={chartW - padR} y2={yPosNeg} stroke="rgba(255,255,255,0.05)" />
                      <text x={padL - 10} y={yPosPos + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                        +{val}
                      </text>
                      <text x={padL - 10} y={yPosNeg + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                        -{val}
                      </text>
                    </g>
                  );
                })}

                {/* Daily Bias Line */}
                <polyline
                  fill="none"
                  stroke="var(--accent-rose)"
                  strokeWidth="2.5"
                  points={biasDailyPoints}
                />

                {/* Daily MAE Line */}
                <polyline
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2.5"
                  points={maeDailyPoints}
                />

                {/* Data Points */}
                {daily_series.map((d, i) => {
                  const x = getDailyX(i);
                  const yB = getDailyY(d.bias);
                  const yM = padT + innerH - (d.mae / maxDailyVal) * innerH;
                  return (
                    <g key={d.date}>
                      <circle cx={x} cy={yB} r="3" fill="var(--accent-rose)" />
                      <circle cx={x} cy={yM} r="3" fill="var(--accent-cyan)" />
                      {i % 3 === 0 && (
                        <text
                          x={x}
                          y={chartH - padB + 16}
                          textAnchor="middle"
                          fill="var(--text-secondary)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                        >
                          {d.date.slice(5)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* View 2: Error Distribution Histogram */}
        {activeTab === 'distribution' && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Frequency of forecast deviations in 500 MW bins across January 2026 (Zero = exact forecast match).
            </div>
            <div className="chart-container">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="chart-svg">
                {distribution.map((bin, i) => {
                  const barW = (innerW / distribution.length) * 0.85;
                  const barX = padL + (i / distribution.length) * innerW;
                  const barH = (bin.count / maxHistCount) * innerH;
                  const barY = padT + innerH - barH;
                  const isShortfall = bin.bin_end <= 0;

                  return (
                    <g key={bin.label}>
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={barH}
                        rx="3"
                        fill={isShortfall ? 'rgba(244, 63, 94, 0.75)' : 'rgba(16, 185, 129, 0.75)'}
                        stroke={isShortfall ? 'var(--accent-rose)' : 'var(--accent-emerald)'}
                        strokeWidth="1"
                      />
                      {bin.count > 0 && (
                        <text
                          x={barX + barW / 2}
                          y={barY - 5}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                        >
                          {bin.count}
                        </text>
                      )}
                      {i % 2 === 0 && (
                        <text
                          x={barX + barW / 2}
                          y={chartH - padB + 16}
                          textAnchor="middle"
                          fill="var(--text-secondary)"
                          fontSize="8.5"
                          fontFamily="var(--font-mono)"
                        >
                          {bin.bin_start / 1000}k
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span style={{ color: 'var(--accent-rose)' }}>&larr; Severe Shortfall (Wind &lt; Forecast)</span>
              <span style={{ color: 'var(--text-primary)' }}>&bull; Zero Deviation &bull;</span>
              <span style={{ color: 'var(--accent-emerald)' }}>Surplus Wind (Wind &gt; Forecast) &rarr;</span>
            </div>
          </div>
        )}

        {/* View 3: Diurnal Profile (Peak vs Off-Peak) */}
        {activeTab === 'diurnal' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Average error characteristics across each hour of the day (Hour 00:00 to 23:00 UTC).
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                <span className="error-pill over">Peak Hours (07:00–19:00): MAE {kpis.peak_vs_off_peak.peak_mae.toFixed(0)} MW</span>
                <span className="error-pill under">Off-Peak Hours: MAE {kpis.peak_vs_off_peak.off_peak_mae.toFixed(0)} MW</span>
              </div>
            </div>

            <div className="chart-container">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="chart-svg">
                {diurnal_profile.map((dp, i) => {
                  const barW = (innerW / 24) * 0.75;
                  const barX = padL + (i / 24) * innerW;
                  const barH = (dp.mae / maxDiurnalVal) * innerH;
                  const barY = padT + innerH - barH;

                  return (
                    <g key={dp.hour}>
                      {/* Highlight peak hours background */}
                      {dp.is_peak && (
                        <rect
                          x={barX - 2}
                          y={padT}
                          width={barW + 4}
                          height={innerH}
                          fill="rgba(6, 182, 212, 0.05)"
                        />
                      )}
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={barH}
                        rx="2"
                        fill={dp.is_peak ? 'var(--accent-cyan)' : '#334155'}
                      />
                      <text
                        x={barX + barW / 2}
                        y={chartH - padB + 16}
                        textAnchor="middle"
                        fill="var(--text-secondary)"
                        fontSize="9"
                        fontFamily="var(--font-mono)"
                      >
                        {dp.hour}h
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Highlighted cyan bars indicate UK Wholesale Peak trading hours (07:00 to 19:00 GMT).
            </div>
          </div>
        )}

        {/* View 4: Wind Speed / Generation Deciles */}
        {activeTab === 'stratified' && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Error performance stratified by actual wind power level (Low vs High generation regimes).
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Generation Regime</th>
                    <th>Hours Observed</th>
                    <th>MAE (MW)</th>
                    <th>Mean Bias (MW)</th>
                    <th>RMSE (MW)</th>
                    <th>Desk Implication</th>
                  </tr>
                </thead>
                <tbody>
                  {stratified_by_wind_level.map((s) => (
                    <tr key={s.tier}>
                      <td style={{ fontWeight: 600 }}>{s.tier}</td>
                      <td>{s.count} hrs</td>
                      <td style={{ color: 'var(--accent-cyan)' }}>{s.mae.toFixed(1)} MW</td>
                      <td style={{ color: s.bias < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                        {s.bias > 0 ? `+${s.bias.toFixed(1)}` : s.bias.toFixed(1)} MW
                      </td>
                      <td>{s.rmse.toFixed(1)} MW</td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {s.bias < -2000
                          ? 'Extreme over-forecasting; apply maximum safety buffer'
                          : 'Moderate discrepancy; standard de-biasing buffer recommended'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
