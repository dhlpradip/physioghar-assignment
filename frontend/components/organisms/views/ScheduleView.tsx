export function ScheduleView({ data, scheduleDate, setScheduleDate, openEdit }: any) {
  const times = Array.from(
    new Set<string>(data.therapists.flatMap((t: any) => t.slots.map((s: any) => s.time))),
  ).sort();
  return (
    <section className="card">
      <div className="toolbar">
        <label className="date-control">
          Schedule date{' '}
          <input
            className="input"
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        </label>
      </div>
      <div className="schedule">
        <div className="head">Time</div>
        {data.therapists.map((t: any) => (
          <div className="head" key={t.therapist.id}>
            {t.therapist.name.replace('Dr. ', '')}
          </div>
        ))}
        {times.flatMap((time) => [
          <div key={`${time}-time`} className="mono time-cell">
            {time}
          </div>,
          ...data.therapists.map((t: any) => {
            const slot = t.slots.find((s: any) => s.time === time);
            return (
              <button
                key={`${time}-${t.therapist.id}`}
                className={slot?.appointment ? 'slot slot-button' : 'slot open'}
                onClick={() =>
                  slot?.appointment && openEdit({ kind: 'appointment', record: slot.appointment })
                }
                disabled={!slot?.appointment}
              >
                {slot?.appointment ? (
                  <>
                    <b>{slot.appointment.patient_name}</b>
                    <br />
                    <span>Click to reschedule</span>
                  </>
                ) : slot ? (
                  t.off ? (
                    'Off'
                  ) : (
                    'Open'
                  )
                ) : (
                  '—'
                )}
              </button>
            );
          }),
        ])}
      </div>
    </section>
  );
}
