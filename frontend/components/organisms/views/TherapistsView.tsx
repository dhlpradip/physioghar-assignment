export function TherapistsView({ data, openEdit }: any) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Care team</p>
          <h2>Therapist roster</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Therapist</th>
              <th>Specialty</th>
              <th>Weekly hours</th>
              <th>Patients seen today</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((t: any) => {
              const days = String(t.working_days || '')
                .split(',')
                .filter(Boolean).length;
              const [startH, startM] = String(t.start_time).split(':').map(Number);
              const [endH, endM] = String(t.end_time).split(':').map(Number);
              const daily = (endH * 60 + endM - startH * 60 - startM) / 60;
              return (
                <tr key={t.id}>
                  <td>
                    <b>{t.name}</b>
                  </td>
                  <td>{t.specialty}</td>
                  <td className="mono">
                    {(days * daily).toFixed(1)} hrs/week ({days} days × {daily.toFixed(1)} hrs)
                  </td>
                  <td>{t.patients_seen_today}</td>
                  <td>
                    <span className={`pill ${t.active === false ? 'danger' : 'success'}`}>
                      {t.active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="assign-button"
                      onClick={() => openEdit({ kind: 'therapist', record: t })}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
