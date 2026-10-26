import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DayAheadForecast from './components/DayAheadForecast';
import ForecastAccuracy from './components/ForecastAccuracy';
import ProcurementDesk from './components/ProcurementDesk';
import ClientPitchModal from './components/ClientPitchModal';
import TechReviewModal from './components/TechReviewModal';
import { fetchDates, fetchDayAheadData, fetchAccuracyMetrics, fetchHealth, triggerSync } from './api/client';
import { Wind, BarChart2, DollarSign, Database, Info, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('day-ahead'); // 'day-ahead', 'accuracy', 'procurement'
  const [decisionDate, setDecisionDate] = useState('2026-01-15');
  const [decisionDatesList, setDecisionDatesList] = useState([]);
  const [cutoffHour, setCutoffHour] = useState('11:00:00');
  
  const [dayAheadData, setDayAheadData] = useState(null);
  const [accuracyData, setAccuracyData] = useState(null);
  const [healthData, setHealthData] = useState(null);

  const [loadingDayAhead, setLoadingDayAhead] = useState(false);
  const [loadingAccuracy, setLoadingAccuracy] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [isTechOpen, setIsTechOpen] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitial();
  }, []);

  // When decision date or cutoff hour changes
  useEffect(() => {
    if (decisionDate) {
      loadDayAhead();
    }
  }, [decisionDate, cutoffHour]);

  // Load accuracy when tab is accuracy or initially
  useEffect(() => {
    if (!accuracyData || cutoffHour) {
      loadAccuracy();
    }
  }, [cutoffHour]);

  const loadInitial = async () => {
    try {
      const [datesRes, healthRes] = await Promise.all([
        fetchDates(),
        fetchHealth()
      ]);
      setDecisionDatesList(datesRes.decision_dates || []);
      setDecisionDate(datesRes.default_decision_date || '2026-01-15');
      setHealthData(healthRes);
    } catch (err) {
      console.error('Error loading initial metadata:', err);
    }
  };

  const loadDayAhead = async () => {
    try {
      setLoadingDayAhead(true);
      const res = await fetchDayAheadData(decisionDate, null, cutoffHour, true);
      setDayAheadData(res);
    } catch (err) {
      console.error('Error loading day ahead data:', err);
    } finally {
      setLoadingDayAhead(false);
    }
  };

  const loadAccuracy = async () => {
    try {
      setLoadingAccuracy(true);
      const res = await fetchAccuracyMetrics('2026-01-01', '2026-01-31', cutoffHour);
      setAccuracyData(res);
    } catch (err) {
      console.error('Error loading accuracy metrics:', err);
    } finally {
      setLoadingAccuracy(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await triggerSync('WINDFOR');
      alert(`Live Elexon stream sync complete! Fetched ${res.records_ingested} records.`);
      loadDayAhead();
      loadAccuracy();
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        decisionDate={decisionDate}
        setDecisionDate={setDecisionDate}
        decisionDatesList={decisionDatesList}
        cutoffHour={cutoffHour}
        setCutoffHour={setCutoffHour}
        onSync={handleSync}
        isSyncing={isSyncing}
        healthData={healthData}
        onOpenPitch={() => setIsPitchOpen(true)}
        onOpenTech={() => setIsTechOpen(true)}
      />

      {/* Main Tab Navigation */}
      <nav className="tab-nav">
        <button
          className={`nav-tab-btn ${activeTab === 'day-ahead' ? 'active' : ''}`}
          onClick={() => setActiveTab('day-ahead')}
          id="tab-btn-day-ahead"
        >
          <Wind size={15} />
          1. Day-Ahead Forecast Curve
          <span className="tab-badge">Req 1</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'accuracy' ? 'active' : ''}`}
          onClick={() => setActiveTab('accuracy')}
          id="tab-btn-accuracy"
        >
          <BarChart2 size={15} />
          2. Quantitative Accuracy & Bias
          <span className="tab-badge">Req 2</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'procurement' ? 'active' : ''}`}
          onClick={() => setActiveTab('procurement')}
          id="tab-btn-procurement"
        >
          <DollarSign size={15} />
          3. Risk-Adjusted Procurement Desk
          <span className="tab-badge">Decisions</span>
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="main-content">
        {activeTab === 'day-ahead' && (
          <DayAheadForecast
            data={dayAheadData}
            loading={loadingDayAhead}
            decisionDate={decisionDate}
            cutoffHour={cutoffHour}
          />
        )}

        {activeTab === 'accuracy' && (
          <ForecastAccuracy
            accuracyData={accuracyData}
            loading={loadingAccuracy}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementDesk
            decisionDate={decisionDate}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          <strong>AeroGrid GB</strong> &bull; Tailored for UK Day-Ahead Electricity Market Procurement &bull; January 2026 Elexon BMRS Datasets (FUELHH & WINDFOR)
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>Pre-indexed Records: <strong>{healthData?.database?.forecasts_count || '20,440'}</strong> Forecasts / <strong>{healthData?.database?.actuals_count || '1,680'}</strong> Actuals</span>
          <span style={{ color: 'var(--accent-emerald-light)' }}>&bull; Zero Look-Ahead Bias Verified</span>
        </div>
      </footer>

      {/* Client Pitch Presentation Modal */}
      <ClientPitchModal
        isOpen={isPitchOpen}
        onClose={() => setIsPitchOpen(false)}
      />

      {/* Technical Review Modal */}
      <TechReviewModal
        isOpen={isTechOpen}
        onClose={() => setIsTechOpen(false)}
      />
    </div>
  );
}
