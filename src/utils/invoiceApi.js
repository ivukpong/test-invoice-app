// Empty string = relative URLs (works on Vercel). Explicit value used in local dev via .env.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function getInvoices({ page = 1, limit = 20 } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/invoices?page=${page}&limit=${limit}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch invoices.");
  }
  return response.json(); // { invoices: [...], total: number }
}

export async function getMyInvoices({ page = 1, limit = 20, profileId } = {}) {
  if (!profileId) throw new Error("profileId is required.");
  const params = new URLSearchParams({ page, limit, profileId });
  const response = await fetch(`${API_BASE_URL}/api/invoices/mine?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch invoices.");
  }
  return response.json(); // { invoices: [...], total: number }
}

export async function getInvoiceById(id) {
  const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`);
  if (!response.ok) {
    throw new Error("Invoice not found.");
  }
  return response.json();
}

export async function storeInvoiceAfterDownload(payload) {
  const response = await fetch(`${API_BASE_URL}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: "Failed to store invoice record." }));
    throw new Error(errorBody.message || "Failed to store invoice record.");
  }

  return response.json();
}

export async function updateInvoice(id, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/invoices/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: "Failed to update invoice." }));
    throw new Error(errorBody.message || "Failed to update invoice.");
  }

  return response.json();
}
