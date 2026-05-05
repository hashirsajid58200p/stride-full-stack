import React from 'react';
import Pagination from '../../../components/UI/Pagination';

const DeliverySection = ({
  styles,
  deliveries,
  tableSearchQuery,
  setTableSearchQuery,
  currentPage,
  setCurrentPage,
  ITEMS_PER_PAGE,
  setDeliveryForm,
  setActiveModal,
  setTargetId
}) => {
  const filtered = deliveries.filter(d => 
    tableSearchQuery === "" ||
    d.name.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={styles["data-table-card"]}>
      <div className={styles["card-header"]}>
        <div>
          <h3 className={styles["card-title"]}>Delivery Options</h3>
        </div>
        <div className={`${styles["search-bar"]} ${styles["table-search"]}`}>
          <i className={`bi bi-search ${styles["search-icon"]}`}></i>
          <input
            type="text"
            placeholder="Search delivery methods..."
            value={tableSearchQuery}
            onChange={(e) => setTableSearchQuery(e.target.value)}
          />
        </div>
        <button
          className={styles["btn-primary"]}
          onClick={() => {
            setDeliveryForm({
              id: "",
              name: "",
              cost: "",
              isFree: false,
              time: "",
            });
            setActiveModal("delivery");
          }}
        >
          <i className="bi bi-plus-lg"></i> Add Delivery Option
        </button>
      </div>
      <div className={styles["table-responsive"]}>
        <table className={styles["admin-table"]}>
          <thead>
            <tr>
              <th>Method Name</th>
              <th>Cost ($)</th>
              <th>Estimated Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--color-muted-fg)" }}>No delivery options found.</td></tr>
            ) : (
              paginated.map((d) => (
                <tr key={d.id}>
                  <td className={styles["font-semibold"]}>{d.name}</td>
                  <td className={`${styles["text-accent"]} ${styles["font-semibold"]}`}>
                    {parseFloat(d.cost) === 0 ? "Free" : window.formatPrice ? window.formatPrice(d.cost) : `$${d.cost}`}
                  </td>
                  <td className={styles["text-muted"]}>{d.estimated_time}</td>
                  <td><span className={`${styles.badge} ${styles["badge-success"]}`}>Active</span></td>
                  <td>
                    <div className={styles["table-actions"]}>
                      <button className={styles["btn-outline"]} style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }} onClick={() => {
                        setDeliveryForm({ id: d.id, name: d.name, cost: d.cost, isFree: parseFloat(d.cost) === 0, time: d.estimated_time });
                        setActiveModal("delivery");
                      }}><i className="bi bi-pencil"></i></button>
                      <button className={styles["btn-danger-outline"]} onClick={() => { setTargetId(d.id); setActiveModal("deleteDelivery"); }}><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            <tr className={styles["pagination-row"]}>
              <td colSpan="5">
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

export default DeliverySection;
