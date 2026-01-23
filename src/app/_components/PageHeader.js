"use client";

export default function PageHeader({ title, subtitle }) {
  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 20,
        padding: "18px 16px",
        background: "rgba(51, 42, 68, 1)", // dunkles Lila
        border: "1px solid rgba(51, 42, 68, 0.18)",
        color: "#fff",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>{subtitle}</div>
      ) : null}
    </div>
  );
}
