"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type ResultPane = "detail" | "map";

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8.5h8M7 11h8M7 13.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="7" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.2" cy="7.2" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.2" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.2 9.2 10.4 12.4M14.2 9.1 13.4 12.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const PANES: Array<{ id: ResultPane; label: string; Icon: typeof ListIcon }> = [
  { id: "detail", label: "Detailed", Icon: ListIcon },
  { id: "map", label: "Visualized", Icon: MapIcon },
];

export function ResultPanes({
  detail,
  map,
}: {
  detail: ReactNode;
  map: ReactNode;
}) {
  const [pane, setPane] = useState<ResultPane>("detail");
  const [height, setHeight] = useState<number>();
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = pane === "detail" ? detailRef.current : mapRef.current;
    if (!el) return;
    const update = () => setHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pane]);

  function show(next: ResultPane) {
    setPane(next);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="result-panes" ref={rootRef}>
      <div className="result-switch-bar">
        <div className="result-switch" data-pane={pane}>
          <div className="result-switch-pane" />
          <div className="result-switch-tabs" role="tablist" aria-label="Result view">
            {PANES.map(({ id, label, Icon }) => {
              const selected = pane === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${id}`}
                  aria-controls={`${uid}-panel-${id}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className="result-switch-tab"
                  onClick={() => show(id)}
                  onKeyDown={event => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    show(id === "detail" ? "map" : "detail");
                  }}
                >
                  <Icon />
                  <span className="result-switch-label">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="result-panes-frame" style={height ? { height } : undefined}>
        <div className="result-panes-track" data-pane={pane}>
          <section
            ref={detailRef}
            className="result-pane"
            role="tabpanel"
            id={`${uid}-panel-detail`}
            aria-labelledby={`${uid}-tab-detail`}
            inert={pane !== "detail"}
          >
            {detail}
          </section>
          <section
            ref={mapRef}
            className="result-pane"
            role="tabpanel"
            id={`${uid}-panel-map`}
            aria-labelledby={`${uid}-tab-map`}
            inert={pane !== "map"}
          >
            {map}
          </section>
        </div>
      </div>
    </div>
  );
}
