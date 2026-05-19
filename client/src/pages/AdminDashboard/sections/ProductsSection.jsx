import React from 'react';
import Pagination from '../../../components/UI/Pagination';

const ProductsSection = ({
  styles,
  products,
  tableSearchQuery,
  setTableSearchQuery,
  currentPage,
  setCurrentPage,
  ITEMS_PER_PAGE,
  handleProductModalOpen,
  setTargetId,
  setTargetName,
  setActiveModal,
  getStatusBadge
}) => {
  const filtered = products.filter(p => 
    tableSearchQuery === "" ||
    p.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={styles["data-table-card"]}>
      <div className={styles["card-header"]}>
        <div className={`${styles["search-bar"]} ${styles["table-search"]}`}>
          <i className={`bi bi-search ${styles["search-icon"]}`}></i>
          <input
            type="text"
            placeholder="Search products by name, brand, or ID..."
            value={tableSearchQuery}
            onChange={(e) => setTableSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles["header-actions"]} style={{ display: "flex", gap: "1rem" }}>
          <button
            className={styles["btn-outline"]}
            onClick={() => setActiveModal("sidebar")}
          >
            <i className="bi bi-layout-sidebar"></i> Manage Sidebar
          </button>
          <button
            className={styles["btn-primary"]}
            onClick={() => handleProductModalOpen(null)}
          >
            <i className="bi bi-plus-lg"></i> Add New Product
          </button>
        </div>
      </div>
      <div className={styles["table-responsive"]}>
        <table className={styles["admin-table"]}>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Details</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--color-muted-fg)" }}>
                  No products found.
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id}>
                  <td className={styles["text-muted"]}>
                    {p.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td>
                    <div className={styles["table-product-cell"]}>
                      <img
                        src={p.main_image_url}
                        alt={p.name}
                        className={styles["table-product-img"]}
                      />
                      <span className={styles["table-product-name"]}>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.brand}</td>
                  <td className={styles["font-semibold"]}>
                    {window.formatPrice
                      ? window.formatPrice(p.price)
                      : `$${p.price.toFixed(2)}`}
                  </td>
                  <td>{p.totalStock} units</td>
                  <td>
                    <span className={`${styles.badge} ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles["table-actions"]}>
                      <button
                        className={styles["btn-outline"]}
                        onClick={() => handleProductModalOpen(p)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className={styles["btn-danger-outline"]}
                        onClick={() => {
                          setTargetId(p.id);
                          setTargetName(p.name);
                          setActiveModal("deleteProduct");
                        }}
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

export default ProductsSection;
