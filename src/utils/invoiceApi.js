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
  // Mock data for development (backend is commented out)
  const MOCK_INVOICES = {
    "1": {
      id: 1,
      invoice_number: "INV-2026-001",
      status: "saved",
      payload: {
        invoiceNumber: "INV-2026-001",
        companyName: "Acme Corp",
        companyAddress: "123 Business St, Lagos",
        companyEmail: "info@acme.com",
        companyPhone: "+234 801 234 5678",
        companyWebsite: "www.acme.com",
        clientName: "John Doe",
        clientCompanyName: "Tech Solutions Ltd",
        clientEmail: "john@techsolutions.com",
        invoiceDate: "2026-01-15",
        dueDate: "2026-02-15",
        currency: "NGN",
        notes: "Thank you for your business!",
        signerName: "Acme Corp",
        tagline: "Quality services guaranteed",
        taxRate: 7.5,
        industry: "Technology",
        items: [
          { id: 1, description: "Consulting Services", quantity: 10, rate: 15000, amount: 150000 },
        ],
      },
    },
    "2": {
      id: 2,
      invoice_number: "INV-2026-002",
      status: "draft",
      payload: {
        invoiceNumber: "INV-2026-002",
        companyName: "Design Studio",
        companyAddress: "456 Creative Ave, Abuja",
        companyEmail: "hello@designstudio.com",
        companyPhone: "+234 802 345 6789",
        companyWebsite: "www.designstudio.com",
        clientName: "Jane Smith",
        clientCompanyName: "Marketing Inc",
        clientEmail: "jane@marketinginc.com",
        invoiceDate: "2026-01-14",
        dueDate: "2026-02-14",
        currency: "NGN",
        notes: "Looking forward to working together!",
        signerName: "Design Studio",
        tagline: "Creative solutions",
        taxRate: 7.5,
        industry: "Design",
        items: [
          { id: 1, description: "Logo Design", quantity: 1, rate: 250000, amount: 250000 },
        ],
      },
    },
    "3": {
      id: 3,
      invoice_number: "INV-2026-003",
      status: "quote_submitted",
      payload: {
        invoiceNumber: "INV-2026-003",
        companyName: "Consulting Pro",
        companyAddress: "789 Expert Rd, Lagos",
        companyEmail: "contact@consultingpro.com",
        companyPhone: "+234 803 456 7890",
        companyWebsite: "www.consultingpro.com",
        clientName: "Bob Johnson",
        clientCompanyName: "Enterprise Corp",
        clientEmail: "bob@enterprise.com",
        invoiceDate: "2026-01-13",
        dueDate: "2026-02-13",
        currency: "NGN",
        notes: "Professional consulting services",
        signerName: "Consulting Pro",
        tagline: "Expert advice",
        taxRate: 7.5,
        industry: "Consulting",
        items: [
          { id: 1, description: "Business Strategy", quantity: 40, rate: 10000, amount: 400000 },
          { id: 2, description: "Market Analysis", quantity: 10, rate: 10000, amount: 100000 },
        ],
      },
    },
  };

  const invoice = MOCK_INVOICES[id];
  if (!invoice) {
    throw new Error("Invoice not found.");
  }
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return invoice;
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
