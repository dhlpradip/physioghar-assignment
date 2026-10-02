'use client';
export function DashboardView({ data, reload, recent }: any) {
  return (
    <>
      <section className="stats">
        <Stat label="Patients seen today" value={data.stats.patients_seen} />
        <Stat label="Therapists on duty" value={data.stats.therapists_on_duty} />
        <Stat label="Revenue collected" value={`$${data.stats.revenue.toFixed(2)}`} />
        <Stat label="Open slots remaining" value={data.stats.open_slots} />
      </section>
      <div className="grid">
        <section className="card">
          <h2>Today’s therapist capacity</h2>
          <div className="capacity">
            {data.capacity.map((t: any) => (
              <div className="capacity-row" key={t.id}>
                <span>
                  <b>{t.name.replace('Dr. ', '')}</b>
                  <br />
                  <span className="muted">{t.specialty}</span>
                </span>
                <div className="track">
                  <div
                    className="fill"
                    style={{ width: `${t.slots.length ? (100 * t.booked) / t.slots.length : 0}%` }}
                  />
                </div>
                <span className="mono">
                  {t.booked} / {t.slots.length}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card callout">
          <h2>At a glance</h2>
          <p>
            Live values are calculated from today’s booked appointments, therapist schedules, and
            paid invoices.
          </p>
          <button className="button secondary" onClick={reload}>
            Refresh dashboard
          </button>
        </section>
      </div>
      {recent}
    </>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="card">
      <span className="stat-label">{label}</span>
      <p className="stat-value mono">{value}</p>
    </section>
  );
}
