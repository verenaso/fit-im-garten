"use client";

export default function CollapsibleSection({ icon, title, open, onToggle, children }) {
  return (
    <div
      className="ui-card ui-card-pad-lg"
      style={{
        borderRadius: 18,
        border: "1px solid rgba(51, 42, 68, 0.10)",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "rgba(92, 76, 124, 0.08)",
                color: "var(--c-darker)",
                flex: "0 0 auto",
              }}
            >
              {icon}
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "var(--c-darker)", lineHeight: 1.1 }}>
              {title}
            </div>
          </div>

          <div style={{ color: "var(--c-darker)", opacity: 0.9 }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {open ? <div style={{ marginTop: 12 }}>{children}</div> : null}
    </div>
  );
}
