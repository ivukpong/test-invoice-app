import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function NotificationBell({ profileId }) {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profileId) return; // don't fetch if no profile yet

    const fetchNotes = () => {
      fetch(`${API}/api/notifications/${profileId}`)
        .then((r) => r.json())
        .then((data) => setNotes(Array.isArray(data) ? data : []))
        .catch(() => setNotes([]));
    };

    fetchNotes();
    const id = setInterval(fetchNotes, 15000);
    return () => clearInterval(id);
  }, [profileId]);

  const unread = notes.filter((n) => !n.read).length;

  async function markRead(id) {
    await fetch(`${API}/api/notifications/${id}/read`, { method: "PATCH" });
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  if (!profileId) return null; // hide bell until profile exists

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#D85A30",
              color: "#fff",
              borderRadius: "50%",
              fontSize: 11,
              fontWeight: 500,
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "120%",
            width: 300,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Notifications
          </div>
          {notes.length === 0 ? (
            <p
              style={{
                padding: "16px",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              No notifications yet
            </p>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background: n.read
                    ? "transparent"
                    : "var(--color-background-info)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{ fontSize: 13, color: "var(--color-text-primary)" }}
                >
                  {n.message}
                </span>
                <small
                  style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
                >
                  {new Date(n.created_at).toLocaleDateString()}
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
