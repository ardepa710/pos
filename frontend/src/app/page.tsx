export default function HomePage() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        flexDirection: "column",
        gap: "1rem",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>POS</h1>
      <p style={{ color: "var(--text-secondary)" }}>Sistema iniciando...</p>
    </main>
  );
}
