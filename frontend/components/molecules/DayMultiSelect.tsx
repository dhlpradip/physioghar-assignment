'use client';

import { useEffect, useRef, useState } from 'react';

const DAYS = [
  { value: '0', label: 'Monday', short: 'Mon' },
  { value: '1', label: 'Tuesday', short: 'Tue' },
  { value: '2', label: 'Wednesday', short: 'Wed' },
  { value: '3', label: 'Thursday', short: 'Thu' },
  { value: '4', label: 'Friday', short: 'Fri' },
  { value: '5', label: 'Saturday', short: 'Sat' },
  { value: '6', label: 'Sunday', short: 'Sun' },
];

export function normalizeDays(value?: string | string[]) {
  return (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((day) => String(day).trim())
    .filter((day) => DAYS.some((item) => item.value === day));
}

export function DayMultiSelect({
  name,
  value,
  defaultValue = '0,1,2,3,4',
}: {
  name: string;
  value?: string;
  defaultValue?: string;
}) {
  const [selected, setSelected] = useState(() => normalizeDays(value ?? defaultValue));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLFieldSetElement>(null);
  const filteredDays = DAYS.filter((day) => day.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  function toggleDay(day: string) {
    setSelected((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    );
  }

  return (
    <fieldset className="day-picker" ref={rootRef}>
      <legend>Working days</legend>
      {selected.map((day) => (
        <input key={day} type="hidden" name={name} value={day} />
      ))}
      <button
        className={`multi-select-trigger${open ? ' is-open' : ''}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        {selected.length ? (
          <span className="multi-select-values">
            {selected.map((value) => (
              <span className="multi-select-badge" key={value}>
                {DAYS.find((day) => day.value === value)?.short}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${DAYS.find((day) => day.value === value)?.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDay(value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleDay(value);
                    }
                  }}
                >
                  ×
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="multi-select-placeholder">Select working days</span>
        )}
        <span className="multi-select-chevron">⌄</span>
      </button>
      {open && (
        <div className="multi-select-menu" role="listbox" aria-multiselectable="true">
          <input
            className="input multi-select-search"
            placeholder="Search days..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          {filteredDays.map((day) => (
            <button
              className="multi-select-option"
              type="button"
              role="option"
              aria-selected={selected.includes(day.value)}
              key={day.value}
              onClick={() => toggleDay(day.value)}
            >
              <span
                className={`multi-select-check${selected.includes(day.value) ? ' checked' : ''}`}
              >
                {selected.includes(day.value) ? '✓' : ''}
              </span>
              {day.label}
            </button>
          ))}
          {!filteredDays.length && <p className="multi-select-empty">No days found.</p>}
        </div>
      )}
      <small>Select every day this therapist regularly works.</small>
    </fieldset>
  );
}
