export default function DraftsPage({ profile }) {
  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>Drafts</h1>
      <p style={s.subtitle}>Unsent invoices saved as drafts.</p>

      {!profile ? (
        <div style={s.empty}>Sign in to save and view drafts.</div>
      ) : (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📝</div>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>No drafts yet</p>
          <p style={{ fontSize: 13 }}>
            Draft saving is coming soon. For now, your invoices are saved
            automatically after you download them.
          </p>
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 20px 60px",
    fontFamily: "var(--font-body, system-ui, sans-serif)",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "var(--color-accent, #0f172a)",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 24px 0",
  },
  empty: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "48px 24px",
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
};
