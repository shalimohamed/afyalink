// A column chart for one series over time (e.g. consultations per day).
// Plain HTML and CSS, rendered on the server. Each column shows its value on
// hover or keyboard focus; the highest column is labelled; a table view below
// lists every value for screen readers and anyone who prefers numbers.

export type ColumnPoint = { key: string; label: string; value: number };

// A "nice" axis: steps of 1, 2 or 5 × 10ⁿ, about 4 gridlines.
function niceScale(max: number) {
  if (max <= 4) return { top: Math.max(1, max), step: 1 };
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

export default function ColumnChart({
  title,
  points,
  unit,
  labelEvery = 2,
}: {
  title: string;
  points: ColumnPoint[];
  unit: string;
  labelEvery?: 1 | 2; // label every column, or every other one (for long ranges)
}) {
  const max = Math.max(0, ...points.map((p) => p.value));
  const { top, step } = niceScale(max);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const peak = points.findIndex((p) => p.value === max && max > 0);

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div className="col-chart">
        <div className="col-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
              {t.toLocaleString("en-KE")}
            </span>
          ))}
        </div>
        <div className="col-plot">
          {ticks.map((t) => (
            <i key={t} className="col-grid" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />
          ))}
          {points.map((p, i) => (
            <div key={p.key} className="col-slot" tabIndex={0} aria-label={`${p.label}: ${p.value} ${unit}`}>
              <div className="col-bar" style={{ height: `${(p.value / top) * 100}%` }}>
                {i === peak && <span className="col-peak">{p.value.toLocaleString("en-KE")}</span>}
              </div>
              <span className="chart-tip" role="tooltip">
                <strong>{p.value.toLocaleString("en-KE")}</strong> {unit}
                <br />
                {p.label}
              </span>
            </div>
          ))}
        </div>
        <div />
        <div className="col-labels" aria-hidden="true">
          {points.map((p, i) => (
            <span key={p.key}>{labelEvery === 2 && i % 2 === points.length % 2 ? "" : p.label}</span>
          ))}
        </div>
      </div>
      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">{unit[0].toUpperCase() + unit.slice(1)}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td>{p.value.toLocaleString("en-KE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
