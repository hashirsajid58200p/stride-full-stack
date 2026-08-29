import React, { useState } from 'react';
import Pagination from '../../../components/UI/Pagination';
import { exportOrdersToCSV, printOrderInvoice } from '../../../utils/orderExportUtils';

const OrdersSection = ({
  styles,
  orders,
  tableSearchQuery,
  setTableSearchQuery,
  currentPage,
  setCurrentPage,
  ITEMS_PER_PAGE,
  setTargetId,
  setActiveModal,
  getStatusBadge
}) => {
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = orders.filter((o) => {
    const q = tableSearchQuery.toLowerCase();
    const matchesSearch =
      o.id.toLowerCase().includes(q) ||
      (o.full_name || "").toLowerCase().includes(q) ||
      (o.email || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (statusFilter === "All") return true;
    return o.status?.toLowerCase() === statusFilter.toLowerCase();
  });
  
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={styles["data-table-card"]}>
      <div className={styles["card-header"]} style={{ flexWrap: "wrap", gap: "1rem", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1, minWidth: "280px" }}>
          <div className={`${styles["search-bar"]} ${styles["table-search"]}`} style={{ flex: 1, maxWidth: "340px" }}>
            <i className={`bi bi-search ${styles["search-icon"]}`}></i>
            <input
              type="text"
              placeholder="Search orders by ID, name, email..."
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {["All", "Pending", "Processing", "Shipped", "Delivered"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  backgroundColor: statusFilter === status ? "var(--color-accent)" : "transparent",
                  color: statusFilter === status ? "#ffffff" : "var(--color-muted-fg)",
                  borderColor: statusFilter === status ? "var(--color-accent)" : "var(--color-border)",
                  transition: "all 0.2s ease"
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button
            type="button"
            className={`${styles["btn"]} ${styles["btn-primary"]} ${styles["btn-sm"]}`}
            onClick={() => exportOrdersToCSV(filtered)}
            title="Export filtered orders as CSV spreadsheet"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <i className="bi bi-file-earmark-spreadsheet-fill"></i>
            <span>Export CSV ({filtered.length})</span>
          </button>
        </div>
      </div>

      <div className={styles["table-responsive"]}>
        <table className={styles["admin-table"]}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--color-muted-fg)", padding: "2rem" }}>
                  No orders match your criteria.
                </td>
              </tr>
            ) : (
              paginated.map((o) => (
                <tr key={o.id}>
                  <td className={styles["text-muted"]}>#{o.id.substring(0, 8).toUpperCase()}</td>
                  <td className={styles["font-semibold"]}>{o.full_name || "Guest"}</td>
                  <td className={styles["text-muted"]}>{o.created_at?.split("T")[0]}</td>
                  <td>
                    {Array.isArray(o.items) && o.items.length > 0 ? (
                      o.items.map(item => `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`).join(', ')
                    ) : (
                      "0 Products"
                    )}
                  </td>
                  <td className={styles["font-semibold"]}>
                    {window.formatPrice ? window.formatPrice(o.total_amount) : `$${Number(o.total_amount || 0).toFixed(2)}`}
                  </td>
                  <td><span className={`${styles.badge} ${getStatusBadge(o.status)}`}>{o.status}</span></td>
                  <td>
                    <div className={styles["table-actions"]}>
                      <button 
                        className={styles["btn-outline"]} 
                        title="View Full Order Details"
                        onClick={() => { setTargetId(o.id); setActiveModal("orderDetails"); }}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      <button 
                        className={styles["btn-outline"]} 
                        title="Print Packing Slip / PDF Invoice"
                        onClick={() => printOrderInvoice(o)}
                        style={{ color: "var(--color-accent)" }}
                      >
                        <i className="bi bi-printer"></i>
                      </button>
                      <button 
                        className={styles["btn-danger-outline"]} 
                        title="Delete Order"
                        onClick={() => { setTargetId(o.id); setActiveModal("deleteOrder"); }}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            <tr className={styles["pagination-row"]}>
              <td colSpan="7">
                <Pagination 
                  totalPages={totalPages} 
                  current={currentPage} 
                  onPageChange={setCurrentPage} 
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersSection;
