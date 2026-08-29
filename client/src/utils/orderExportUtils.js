/**
 * Utility functions for exporting Stride Orders to CSV and generating printable PDF invoices
 */

/**
 * Exports an array of orders to a downloadable CSV file
 * @param {Array} orders - List of order objects
 */
export const exportOrdersToCSV = (orders) => {
  if (!orders || orders.length === 0) {
    alert("No orders available to export.");
    return;
  }

  const headers = [
    "Order ID",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Shipping Address",
    "City",
    "Items Summary",
    "Items Count",
    "Total Amount ($)",
    "Payment Method",
    "Status",
    "Order Date"
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const stringVal = String(str).replace(/"/g, '""');
    return `"${stringVal}"`;
  };

  const rows = orders.map((order) => {
    const items = Array.isArray(order.items)
      ? order.items
      : (typeof order.items === "string" ? JSON.parse(order.items || "[]") : []);

    const itemsSummary = items
      .map((item) => `${item.name} (${item.color || "Default"} / Size ${item.size || "Standard"}) x${item.quantity || 1}`)
      .join("; ");

    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    const fullAddress = [
      order.shipping_address || order.address,
      order.city,
      order.state,
      order.postal_code || order.zip
    ]
      .filter(Boolean)
      .join(", ");

    const formattedDate = order.created_at
      ? new Date(order.created_at).toISOString().split("T")[0]
      : "N/A";

    return [
      escapeCSV(order.id),
      escapeCSV(order.full_name || order.user_name || "Guest Customer"),
      escapeCSV(order.email || order.user_email || "N/A"),
      escapeCSV(order.phone || "N/A"),
      escapeCSV(fullAddress || "N/A"),
      escapeCSV(order.city || "N/A"),
      escapeCSV(itemsSummary),
      escapeCSV(totalItems),
      escapeCSV(Number(order.total_amount || 0).toFixed(2)),
      escapeCSV(order.payment_method || "Credit Card (Stripe)"),
      escapeCSV(order.status || "Pending"),
      escapeCSV(formattedDate)
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const timestamp = new Date().toISOString().split("T")[0];
  link.setAttribute("download", `stride_orders_report_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Opens a beautifully formatted printable invoice / packing slip for a single order
 * @param {Object} order - Order details object
 */
export const printOrderInvoice = (order) => {
  if (!order) return;

  const items = Array.isArray(order.items)
    ? order.items
    : (typeof order.items === "string" ? JSON.parse(order.items || "[]") : []);

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString();

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    alert("Please allow popups to print invoices.");
    return;
  }

  const invoiceHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Stride Invoice #${order.id ? order.id.substring(0, 8).toUpperCase() : "INV"}</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Outfit', sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          padding: 40px;
          line-height: 1.5;
        }
        .invoice-container {
          max-width: 750px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 24px;
          border-bottom: 2px solid #f0f0f0;
          margin-bottom: 24px;
        }
        .brand-logo {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0d0d0d;
        }
        .brand-logo span {
          color: #ff6b00;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h1 {
          font-size: 20px;
          font-weight: 800;
          color: #ff6b00;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .invoice-title p {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 28px;
        }
        .info-box {
          background: #fafafa;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          padding: 16px;
        }
        .info-box h3 {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #888;
          margin-bottom: 8px;
        }
        .info-box p {
          font-size: 14px;
          color: #1a1a1a;
          line-height: 1.4;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          background: #ff6b0018;
          color: #ff6b00;
          margin-top: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th {
          background: #f5f5f5;
          color: #555;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 12px 14px;
          text-align: left;
          border-bottom: 2px solid #e0e0e0;
        }
        td {
          padding: 14px;
          font-size: 14px;
          color: #222;
          border-bottom: 1px solid #eee;
        }
        .item-name {
          font-weight: 600;
          color: #0d0d0d;
        }
        .item-sub {
          font-size: 12px;
          color: #777;
          margin-top: 2px;
        }
        .total-summary {
          margin-left: auto;
          width: 280px;
          margin-bottom: 30px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
          color: #666;
        }
        .summary-row.grand-total {
          border-top: 2px solid #111;
          padding-top: 10px;
          margin-top: 6px;
          font-size: 18px;
          font-weight: 800;
          color: #0d0d0d;
        }
        .footer {
          border-top: 1px dashed #ccc;
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
        }
        .print-btn-bar {
          text-align: center;
          margin-bottom: 20px;
        }
        .print-btn {
          background: #ff6b00;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        @media print {
          .print-btn-bar { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar">
        <button class="print-btn" onclick="window.print()">🖨️ Print Packing Slip / PDF</button>
      </div>

      <div class="invoice-container">
        <div class="header">
          <div class="brand-logo">STRIDE<span>.</span></div>
          <div class="invoice-title">
            <h1>Official Invoice</h1>
            <p>Order ID: #${order.id ? order.id.substring(0, 8).toUpperCase() : "N/A"}</p>
            <p>Date: ${formattedDate}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Billed & Shipped To</h3>
            <p><strong>${order.full_name || order.user_name || "Customer"}</strong></p>
            <p>${order.email || order.user_email || ""}</p>
            <p>${order.shipping_address || order.address || "Address Provided at Checkout"}</p>
            <p>${order.city ? order.city + ", " : ""}${order.state || ""} ${order.postal_code || ""}</p>
            ${order.phone ? `<p>Phone: ${order.phone}</p>` : ""}
          </div>
          <div class="info-box">
            <h3>Order & Payment Details</h3>
            <p>Payment: <strong>${order.payment_method || "Credit Card (Stripe)"}</strong></p>
            <p>Fulfillment: <strong>Standard Express Delivery</strong></p>
            <div>Status: <span class="status-badge">${order.status || "Completed"}</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Size</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map(item => `
              <tr>
                <td>
                  <div class="item-name">${item.name}</div>
                  <div class="item-sub">Color: ${item.color || "Standard"}</div>
                </td>
                <td style="text-align: center;">${item.size || "N/A"}</td>
                <td style="text-align: center;">${item.quantity || 1}</td>
                <td style="text-align: right;">$${Number(item.price || 0).toFixed(2)}</td>
                <td style="text-align: right;"><strong>$${(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}</strong></td>
              </tr>
            `).join("") : `
              <tr>
                <td colspan="5" style="text-align: center; color: #888;">No itemized details recorded.</td>
              </tr>
            `}
          </tbody>
        </table>

        <div class="total-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>$${Number(order.total_amount || 0).toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Shipping & Handling:</span>
            <span>$0.00 (Free)</span>
          </div>
          <div class="summary-row grand-total">
            <span>Grand Total:</span>
            <span>$${Number(order.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Stride — Premium Footwear & Apparel.</p>
          <p>Need support? Contact support@stride.store or chat with our 24/7 Concierge.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
};
