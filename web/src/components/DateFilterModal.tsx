import React, { useMemo, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (filters: { month?: number; year?: number } | null) => void;
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function DateFilterModal({ open, onClose, onApply }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - i), [currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  if (!open) return null;

  const apply = () => {
    if (selectedMonth && selectedYear) {
      onApply({ month: selectedMonth, year: selectedYear });
    } else {
      onApply(null);
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Select Month</div>
          <button className="button secondary" onClick={onClose}>Close</button>
        </div>

        <div className="section">
          <div className="label">Year</div>
          <div className="pill-row">
            {years.map((y) => (
              <button
                key={y}
                className={`pill ${selectedYear === y ? 'active' : ''}`}
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="label">Month</div>
          <div className="pill-row">
            {MONTHS.map((m, idx) => {
              const monthNumber = idx + 1;
              const isActive = selectedMonth === monthNumber;
              return (
                <button
                  key={m}
                  className={`pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedMonth(monthNumber)}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="section">
          <div className="row">
            <button className="button secondary" onClick={() => { setSelectedMonth(null); setSelectedYear(currentYear); }}>All Time</button>
            <button className="button primary" onClick={apply}>Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
