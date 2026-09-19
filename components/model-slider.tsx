import { STRUCTURE_LANES, type StructureLane } from "@/lib/structure-lanes";

export function ModelSlider({
  value,
  onChange,
  times,
  disabled,
}: {
  value: StructureLane;
  onChange: (lane: StructureLane) => void;
  times: Partial<Record<StructureLane, number>>;
  disabled?: boolean;
}) {
  const index = STRUCTURE_LANES.findIndex(l => l.id === value);

  return (
    <div className="mt-4">
      <label htmlFor="model-slider" className="text-xs text-ink-muted">Model</label>
      <input
        id="model-slider"
        type="range"
        min={0}
        max={2}
        step={1}
        value={index < 0 ? 1 : index}
        disabled={disabled}
        aria-valuetext={STRUCTURE_LANES[index]?.label}
        onChange={e => onChange(STRUCTURE_LANES[Number(e.target.value)].id)}
        className="model-slider mt-3"
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        {STRUCTURE_LANES.map(l => {
          const selected = l.id === value;
          const ms = times[l.id];
          return (
            <button
              key={l.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(l.id)}
              className={`rounded-lg px-1 py-2 text-center text-sm ${selected ? "font-medium" : "text-ink-muted"}`}
            >
              <span className="block">{l.label}</span>
              <span className="mt-1 block text-xs tabular-nums">
                {ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
