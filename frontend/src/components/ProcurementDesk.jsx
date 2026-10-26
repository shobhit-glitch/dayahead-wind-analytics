import React, { useState, useEffect } from 'react';
import { DollarSign, ShieldAlert, CheckCircle2, TrendingDown, ArrowRight, Settings, Calculator, Flame } from 'lucide-react';
import { fetchSimulation } from '../api/client';

export default function ProcurementDesk({ decisionDate }) {
  const [strategy, setStrategy] = useState('debias');
  const [daPrice, setDaPrice] = useState(95);
  const [shortPenalty, setShortPenalty] = useState(240);
  const [spillPrice, setSpillPrice] = useState(45);
  const [customBuffer, setCustomBuffer] = useState(-1800);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runSim();
  }, [strategy, daPrice, shortPenalty, spillPrice, customBuffer]);

  const runSim = async () => {
    try {
      setLoading(true);
      const res = await fetchSimulation(strategy, daPrice, shortPenalty, spillPrice, customBuffer);
      setSimData(res);
    } catch (err) {
      console.error('Failed to run simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const comp = simData?.comparison;
  const benefit = comp?.benefit;

  return (
    <div>
      {/* Intro Guidance Banner */}
      <div className="alert-banner info">
        <div className="alert-icon">
          <Calculator size={18} color="var(--accent-cyan)" />
        </div>
        <div>
          <strong>Day-Ahead Decision Support: </strong>
          Translate quantified forecast accuracy into optimal thermal power procurement.
          Because Elexon forecasts in January 2026 exhibited a persistent <strong>-1,840 MW over-forecast bias</strong>, 
          adjusting the purchase order book saves substantial cashout penalties in the Balancing Mechanism.
        </div>
      </div>

      {/* Grid: Controls & Assumptions vs Financial Outcomes */}
      <div className="grid-2col">
        {/* Market Pricing & Strategy Inputs */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon">
                <Settings size={16} />
              </div>
              <div>
                <div className="card-title">Commercial Strategy & Market Prices</div>
                <div className="card-subtitle">Configure market assumptions & risk tolerance</div>
              </div>
            </div>
          </div>

          {/* Strategy Mode Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="control-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
              Decision Rule / Buffer Mode:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {[
                { id: 'naive', label: '1. Naive (0 MW Buffer)', desc: '100% trust in forecast' },
                { id: 'debias', label: '2. De-biased (-1,840 MW)', desc: 'Recommended baseline' },
                { id: 'p75_hedge', label: '3. Prudent P75 (-3,068 MW)', desc: 'High balancing security' },
                { id: 'custom', label: '4. Custom Slider', desc: 'Manual buffer selection' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStrategy(opt.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: strategy === opt.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: strategy === opt.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: strategy === opt.id ? 'var(--accent-cyan-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Buffer Slider */}
          {strategy === 'custom' && (
            <div className="slider-container" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div className="slider-label-row">
                <span>Custom Generation Buffer:</span>
                <strong style={{ color: customBuffer < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                  {customBuffer > 0 ? `+${customBuffer}` : customBuffer} MW
                </strong>
              </div>
              <input
                type="range"
                min="-5000"
                max="1000"
                step="100"
                value={customBuffer}
                onChange={(e) => setCustomBuffer(parseFloat(e.target.value))}
                className="slider-input"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                <span>-5,000 MW (Heavy thermal hedge)</span>
                <span>0 MW</span>
                <span>+1,000 MW</span>
              </div>
            </div>
          )}

          {/* Market Price Assumptions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
            <div className="slider-container">
              <div className="slider-label-row">
                <span>Day-Ahead Price:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>£{daPrice}/MWh</strong>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                step="5"
                value={daPrice}
                onChange={(e) => setDaPrice(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="slider-container">
              <div className="slider-label-row">
                <span>Cashout SBP:</span>
                <strong style={{ color: 'var(--accent-rose)' }}>£{shortPenalty}/MWh</strong>
              </div>
              <input
                type="range"
                min="120"
                max="450"
                step="10"
                value={shortPenalty}
                onChange={(e) => setShortPenalty(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="slider-container">
              <div className="slider-label-row">
                <span>Spill SSP:</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>£{spillPrice}/MWh</strong>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={spillPrice}
                onChange={(e) => setSpillPrice(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>
        </div>

        {/* Financial & Operational Outcome */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon" style={{ color: 'var(--accent-emerald)' }}>
                <DollarSign size={16} />
              </div>
              <div>
                <div className="card-title">Commercial Financial Impact (Jan 2026 Simulation)</div>
                <div className="card-subtitle">Savings and risk mitigation achieved by factoring in quantified error</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calculating simulation...</div>
          ) : comp ? (
            <div>
              {/* Highlight Net Savings Box */}
              <div
                style={{
                  background: benefit.net_savings_gbp >= 0
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))'
                    : 'rgba(244, 63, 94, 0.15)',
                  border: benefit.net_savings_gbp >= 0
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1px solid rgba(244, 63, 94, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Net Commercial Value vs Naive Strategy
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.15rem' }}>
                    {benefit.net_savings_gbp >= 0 ? '+' : '-'}£
                    {Math.abs(benefit.net_savings_gbp / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k
                  </div>
                  <div style={{ fontSize: '0.72rem', color: benefit.net_savings_gbp >= 0 ? 'var(--accent-emerald-light)' : 'var(--accent-rose)', marginTop: '0.2rem' }}>
                    {benefit.savings_percentage >= 0 ? `${benefit.savings_percentage.toFixed(1)}% net total procurement cost savings` : 'Increased net costs'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shortfall MWh Avoided</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-emerald-light)' }}>
                    {(benefit.short_imbalance_mwh_avoided / 1000).toFixed(1)}k MWh
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {benefit.shortfall_exposure_reduction_pct.toFixed(0)}% cashout exposure reduction
                  </div>
                </div>
              </div>

              {/* Side by side comparison table */}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cost Component</th>
                      <th>Naive (Unadjusted)</th>
                      <th>Risk-Adjusted Strategy</th>
                      <th>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Wholesale Day-Ahead Procurement</td>
                      <td>£{(comp.naive.da_procurement_cost_gbp / 1e6).toFixed(2)}M</td>
                      <td>£{(comp.adjusted.da_procurement_cost_gbp / 1e6).toFixed(2)}M</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        +£{((comp.adjusted.da_procurement_cost_gbp - comp.naive.da_procurement_cost_gbp) / 1000).toFixed(0)}k
                      </td>
                    </tr>
                    <tr>
                      <td>System Buy Price Cashout Penalty</td>
                      <td style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                        £{(comp.naive.imbalance_penalty_cost_gbp / 1e6).toFixed(2)}M
                      </td>
                      <td style={{ color: 'var(--accent-emerald-light)', fontWeight: 600 }}>
                        £{(comp.adjusted.imbalance_penalty_cost_gbp / 1e6).toFixed(2)}M
                      </td>
                      <td style={{ color: 'var(--accent-emerald-light)', fontWeight: 700 }}>
                        -£{((comp.naive.imbalance_penalty_cost_gbp - comp.adjusted.imbalance_penalty_cost_gbp) / 1000).toFixed(0)}k
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 700 }}>
                      <td>Total Net Cost of Energy</td>
                      <td>£{(comp.naive.total_net_cost_gbp / 1e6).toFixed(2)}M</td>
                      <td style={{ color: 'var(--accent-cyan)' }}>£{(comp.adjusted.total_net_cost_gbp / 1e6).toFixed(2)}M</td>
                      <td style={{ color: 'var(--accent-emerald-light)' }}>
                        {benefit.net_savings_gbp >= 0 ? `Savings: £${(benefit.net_savings_gbp / 1000).toFixed(0)}k` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
