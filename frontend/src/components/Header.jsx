import React from 'react';
import { Wind, Calendar, Clock, Download, RefreshCw, FileText, Code2, AlertCircle } from 'lucide-react';
import { getExportCsvUrl } from '../api/client';

export default function Header({
  decisionDate,
  setDecisionDate,
  decisionDatesList,
  cutoffHour,
  setCutoffHour,
  onSync,
  isSyncing,
  healthData,
  onOpenPitch,
  onOpenTech
}) {
  const deliveryDate = decisionDate ? new Date(new Date(decisionDate).getTime() + 86400000).toISOString().split('T')[0] : '';
  const exportUrl = getExportCsvUrl('2026-01-01', '2026-01-31', cutoffHour);

  return (
    <header className="top-header">
      {/* Brand & Market Identifier */}
      <div className="brand-section">
        <div className="logo-badge">
          <Wind size={22} />
        </div>
        <div className="brand-text">
          <h1>AeroGrid GB</h1>
          <p>
            <span>UK Day-Ahead Wind & Procurement Terminal</span>
            <span className="live-indicator">
              <span className="live-dot" />
              Elexon BMRS Live Stream
            </span>
          </p>
        </div>
      </div>

      {/* Global Decision & Filtering Controls */}
      <div className="header-controls">
        {/* Decision Date Selector */}
        <div className="control-group">
          <Calendar size={14} className="control-label" />
          <span className="control-label">D-1 Decision:</span>
          <select
            className="control-select"
            value={decisionDate}
            onChange={(e) => setDecisionDate(e.target.value)}
            id="decision-date-selector"
          >
            {decisionDatesList.map((d) => (
              <option key={d} value={d}>
                {d} (Delivery: {new Date(new Date(d).getTime() + 86400000).toISOString().split('T')[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Gate Closure Cutoff Time */}
        <div className="control-group">
          <Clock size={14} className="control-label" />
          <span className="control-label">Gate Closure:</span>
          <select
            className="control-select"
            value={cutoffHour}
            onChange={(e) => setCutoffHour(e.target.value)}
            id="gate-closure-selector"
          >
            <option value="09:30:00">09:30 GMT (Early Desk)</option>
            <option value="11:00:00">11:00 GMT (EPEX/NordPool Gate)</option>
            <option value="12:00:00">12:00 GMT (Post-Auction)</option>
          </select>
        </div>

        {/* Live Elexon Sync Button */}
        <button
          className="action-btn"
          onClick={onSync}
          disabled={isSyncing}
          title="Query live stream from Elexon BMRS API"
          id="sync-elexon-btn"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Stream'}
        </button>

        {/* Export CSV Button */}
        <a
          href={exportUrl}
          className="action-btn"
          download
          title="Download matched Jan 2026 forecast and actuals data (CSV)"
          id="export-csv-btn"
        >
          <Download size={13} />
          Export CSV
        </a>

        {/* Presentation Pitch Modal Button */}
        <button
          className="action-btn modal-trigger"
          onClick={onOpenPitch}
          title="Open Client Pitch Presentation"
          id="pitch-modal-btn"
        >
          <FileText size={13} />
          Client Pitch
        </button>

        {/* Technical Design Review Modal Button */}
        <button
          className="action-btn modal-trigger"
          onClick={onOpenTech}
          title="Open Technical Lead Software Design Document"
          id="tech-modal-btn"
        >
          <Code2 size={13} />
          Tech Review
        </button>
      </div>
    </header>
  );
}
