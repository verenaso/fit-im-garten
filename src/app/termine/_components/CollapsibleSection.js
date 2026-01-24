"use client";

import { useId, useState } from "react";

export default function CollapsibleSection({
  title,
  icon = null,
  defaultOpen = false,
  right = null,
  children,
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const contentId = useId();

  return (
    <section
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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {icon ? (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: "rgba(92, 76, 124, 0.12)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--c-darker)",
                  flex: "0 0 auto",
                }}
              >
                {icon}
              </div>
            ) : null}

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: "var(--c-darker)", lineHeight: 1.15 }}>
                {title}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
            {right ? <div onClick={(e) => e.stopPropagation()}>{right}</div> : null}
            <Chevron open={open} />
          </div>
        </div>
      </button>

      {open ? (
        <div id={contentId} style={{ marginTop: 12 }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease", color: "var(--c-darker)", opacity: 0.8 }}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
