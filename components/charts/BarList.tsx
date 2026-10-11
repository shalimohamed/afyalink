// A horizontal bar chart for a few categories (e.g. consultations per
// specialty). Every bar has its name and value written next to it, so colour
// is never the only way to tell bars apart; hover or focus also shows the share.

export type Bar = { key: string; label: string; value: number; color?: string; icon?: string };

export default function BarList({ title, bars, unit, empty }: { title: string; bars: Bar[]; unit: string; empty: string }) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  const total = bars.reduce((sum, b) => sum + b.value, 0);

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {total === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <ul className="bar-list">
          {bars.map((b) => {
            const share = Math.round((b.value / total) * 100);
            return (
              <li key={b.key} tabIndex={0} aria-label={`${b.label}: ${b.value} ${unit} (${share}%)`}>
                <span className="bar-label">
                  {b.icon && <span aria-hidden="true">{b.icon} </span>}
                  {b.label}
                </span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    // Scale to the track minus room for the value label at the tip.
                    style={{ width: `calc((100% - 3.5em) * ${max ? b.value / max : 0})`, background: b.color ?? "var(--chart-bar)" }}
                  />
                  <span className="bar-value">{b.value.toLocaleString("en-KE")}</span>
                </span>
                <span className="chart-tip" role="tooltip">
                  <strong>{b.value.toLocaleString("en-KE")}</strong> {unit} · {share}% of all
                  <br />
                  {b.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
