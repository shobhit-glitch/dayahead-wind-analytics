import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Wind, DollarSign, ShieldAlert, Award, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';

export default function ClientPitchModal({ isOpen, onClose }) {
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: "Executive Pitch: Transforming Day-Ahead Wind Uncertainty into Quantitative Trading Edge",
      subtitle: "Presented to the Day-Ahead Power Procurement Desk, UK Energy Utility",
      badge: "Commercial Pitch",
      content: (
        <div>
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#e2e8f0', marginBottom: '1.25rem' }}>
            UK energy utilities face a critical daily balancing challenge: meeting volatile consumer electricity demand while optimizing day-ahead wholesale procurement in the EPEX SPOT / Nord Pool power auctions.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.4rem' }}>1. Intermittent Fleet</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Wind generation fluctuates rapidly. Procurement decisions must be locked in at 11:00 GMT on D-1, 13 to 37 hours before power delivery.
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--accent-rose)', fontWeight: 700, marginBottom: '0.4rem' }}>2. Asymmetric Penalty</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Being short in the balancing mechanism incurs brutal System Buy Price (Cashout) spikes up to £250 - £1,000/MWh, while Day-Ahead wholesale power costs ~£95/MWh.
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '0.4rem' }}>3. The AeroGrid Edge</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                By quantifying real forecast bias and error percentiles, AeroGrid recommends the exact thermal procurement buffer needed to maximize gross margins.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Reality of January 2026: Why Blindly Trusting Forecasts Costs Millions",
      subtitle: "Empirical Analysis of Elexon BMRS WINDFOR vs FUELHH Generation",
      badge: "Empirical Data",
      content: (
        <div>
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.25rem' }}>
              84.4% Systematic Over-Forecasting Frequency in January 2026
            </div>
            <div style={{ fontSize: '0.85rem', color: '#ffe4e6' }}>
              The national Elexon wind forecast available at 11:00 GMT Gate Closure overestimated generation in <strong>8 out of every 10 hours</strong>, with an average hourly shortfall of <strong>2,348 MW</strong>.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Naive Desk Outcome</div>
              <ul style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '0.5rem', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                <li>Assumes forecast is unbiased (Mean Error = 0).</li>
                <li>Buys only (Demand - Forecast) in wholesale Day-Ahead auction.</li>
                <li>Leaves utility short by ~1,840 MW on average across January.</li>
                <li>Exposed to heavy Cashout Buy penalties of ~£1.2M+ over the month.</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>AeroGrid-Equipped Desk</div>
              <ul style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '0.5rem', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                <li>Identifies the -1,840 MW systematic bias immediately.</li>
                <li>De-biases forecast curve and applies P75 risk buffer.</li>
                <li>Procures required thermal power in Day-Ahead market at £95/MWh.</li>
                <li><strong>Avoids ~75% of short balancing penalties</strong>, saving ~£350k - £600k net.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Core Platform Capabilities: Built for the Trading & Procurement Workflow",
      subtitle: "Tailored to Desk Operations Before 11:00 GMT Gate Closure",
      badge: "Product Features",
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.4rem' }}>
                <Wind size={16} /> 1. Point-in-Time Day-Ahead Forecast Curve
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Enforces zero look-ahead bias by strictly querying the latest forecast published at or before the 11:00 GMT auction gate closure. Allows toggling earlier forecast vintages (02:30, 04:30, 07:30, 09:30) to spot meteorological trajectory and trend reversals.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '0.4rem' }}>
                <BarChart3 size={16} /> 2. Quantitative Accuracy & Quantile Bands
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Computes industry-standard MAE, RMSE, Mean Bias, MAPE, and empirical risk percentiles (P10, P25, P50, P75, P90). Evaluates peak vs off-peak performance and wind speed deciles to pinpoint high-risk periods.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)', fontWeight: 600, marginBottom: '0.4rem' }}>
                <DollarSign size={16} /> 3. Commercial Procurement & Hedge Simulator
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Interactive decision support tool allowing traders to stress-test Day-Ahead procurement buffers under live wholesale prices, cashout penalty rates, and thermal plant heat rates.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: '0.4rem' }}>
                <CheckCircle size={16} /> 4. Live Elexon API Ingestion & Export
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Pre-indexed SQLite cache for instant zero-latency queries, backed by live REST stream ingestion directly from Elexon BMRS. Instant CSV export for downstream risk modeling in Excel / Python.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Commercial Value Proposition & Next Steps",
      subtitle: "Delivering Measurable P&L Impact to the Wholesale Trading Desk",
      badge: "Value & Roadmap",
      content: (
        <div>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-emerald-light)', fontWeight: 700 }}>
                Quantified Monthly Value
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                £350,000+
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Avoided cashout imbalance penalties per month on a representative mid-size utility portfolio.
              </div>
            </div>

            <div style={{ flex: 1, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-cyan-light)', fontWeight: 700 }}>
                Deployment Timeline
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
                Ready Today
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Containerized in Docker, deployable immediately to internal cloud, Heroku, or Vercel.
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Phase 2 Product Roadmap
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div>&bull; Auto-bid order export to EPEX SPOT API</div>
              <div>&bull; Sub-national DNO zonal breakdown</div>
              <div>&bull; Solar PV & battery co-dispatch optimization</div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="tab-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe' }}>
            {slides[slide].badge}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Slide {slide + 1} of {slides.length}
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
          {slides[slide].title}
        </h2>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {slides[slide].subtitle}
        </div>

        {/* Slide Body */}
        <div style={{ minHeight: '300px' }}>
          {slides[slide].content}
        </div>

        {/* Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            className="action-btn"
            onClick={() => setSlide(Math.max(0, slide - 1))}
            disabled={slide === 0}
            style={{ opacity: slide === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={14} /> Previous
          </button>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {slides.map((_, i) => (
              <span
                key={i}
                onClick={() => setSlide(i)}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: slide === i ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <button
            className="action-btn primary"
            onClick={() => setSlide(Math.min(slides.length - 1, slide + 1))}
            disabled={slide === slides.length - 1}
            style={{ opacity: slide === slides.length - 1 ? 0.4 : 1 }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
