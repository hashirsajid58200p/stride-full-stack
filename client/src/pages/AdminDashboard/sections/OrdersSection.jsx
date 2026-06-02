import React from 'react';
import Pagination from '../../../components/UI/Pagination';

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
  const filtered = orders.filter((o) => {
    const q = tableSearchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      (o.full_name || "").toLowerCase().includes(q) ||
      (o.email || "").toLowerCase().includes(q)
    );
  });
  
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={styles["data-table-card"]}>
      <div className={styles["card-header"]}>
        <div className={`${styles["search-bar"]} ${styles["table-search"]}`}>
          <i className={`bi bi-search ${styles["search-icon"]}`}></i>
          <input
            type="text"
            placeholder="Search orders by ID or customer..."
            value={tableSearchQuery}
            onChange={(e) => setTableSearchQuery(e.target.value)}
          />
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
                <td colSpan="7" style={{ textAlign: "center", color: "var(--color-muted-fg)" }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              paginated.map((o) => (
                <tr key={o.id}>
                  <td className={styles["text-muted"]}>{o.id.substring(0, 8).toUpperCase()}</td>
                  <td className={styles["font-semibold"]}>{o.full_name}</td>
                  <td className={styles["text-muted"]}>{o.created_at?.split("T")[0]}</td>
                  <td>
                    {Array.isArray(o.items) && o.items.length > 0 ? (
                      o.items.map(item => `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`).join(', ')
                    ) : (
                      "0 Products"
                    )}
                  </td>
                  <td className={styles["font-semibold"]}>
                    {window.formatPrice ? window.formatPrice(o.total_amount) : `$${o.total_amount.toFixed(2)}`}
                  </td>
                  <td><span className={`${styles.badge} ${getStatusBadge(o.status)}`}>{o.status}</span></td>
                  <td>
                    <div className={styles["table-actions"]}>
                      <button className={styles["btn-outline"]} onClick={() => { setTargetId(o.id); setActiveModal("orderDetails"); }}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className={styles["btn-danger-outline"]} onClick={() => { setTargetId(o.id); setActiveModal("deleteOrder"); }}>
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
