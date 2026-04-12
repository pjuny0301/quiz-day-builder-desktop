interface MetricPillProps {
  label: string;
  value: string;
  tone?: "blue" | "green" | "gold" | "rose";
}


// Render a compact metric that highlights one important number without crowding the layout.
export function MetricPill({ label, value, tone = "blue" }: MetricPillProps) {
  return (
    <div className={`metric-pill metric-pill--${tone}`}>
      <span className="metric-pill__label">{label}</span>
      <strong className="metric-pill__value">{value}</strong>
    </div>
  );
}
