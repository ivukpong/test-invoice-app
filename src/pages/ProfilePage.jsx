export default function ProfilePage({ profile, onBack }) {
  return (
    <div style={s.page}>
      <button onClick={onBack} style={s.backBtn}>
        ← Back to Invoice Builder
      </button>

      <section style={s.card}>
        <h2 style={s.cardTitle}>My Profile</h2>
        <div style={s.profileGrid}>
          {[
            ["Name", profile.name],
            ["Email", profile.email],
            ["Company", profile.company],
            ["Phone", profile.phone],
            ["Role", profile.role],
          ]
            .filter(([, val]) => val)
            .map(([label, val]) => (
              <div key={label} style={s.profileItem}>
                <span style={s.fieldLabel}>{label}</span>
                <span style={s.fieldValue}>{val}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 920,
    margin: "0 auto",
    padding: "32px 20px 60px",
    fontFamily: "var(--font-body, system-ui, sans-serif)",
  },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--color-accent, #0f172a)",
    fontWeight: 600,
    padding: "0 0 24px 0",
    display: "block",
  },
  card: {
    background: "#fff",
    border: "1px solid var(--color-grey, #e2e8f0)",
    borderRadius: 12,
    padding: "24px",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: "0 0 18px 0",
    color: "var(--color-accent, #0f172a)",
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 16,
  },
  profileItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldValue: {
    fontSize: 15,
    color: "#1c1c1e",
    fontWeight: 500,
  },
};
