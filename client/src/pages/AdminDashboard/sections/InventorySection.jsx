import React from 'react';
import Pagination from '../../../components/UI/Pagination';
import CustomCheckbox from '../../../components/UI/CustomCheckbox';

const InventorySection = ({
  styles,
  products,
  tableSearchQuery,
  setTableSearchQuery,
  currentPage,
  setCurrentPage,
  ITEMS_PER_PAGE,
  selectedInventory,
  handleInventoryCheck,
  handleInventorySelectAll,
  bulkStock,
  setBulkStock,
  handleBulkUpdate,
  isSubmitting,
  handleSingleStockUpdate,
  handleMarkEmpty
}) => {
  const filtered = [];
  products.forEach((p) => {
    const pName = p.name.toLowerCase();
    const pBrand = p.brand?.toLowerCase() || "";
    const q = tableSearchQuery.toLowerCase();
    if (pName.includes(q) || pBrand.includes(q) || p.id.toLowerCase().includes(q)) {
      const displayImg = p.product_colors?.length > 0 ? p.product_colors[0].image_url : p.main_image_url;
      const availableColors = p.product_colors?.length > 0 ? p.product_colors.map((c) => c.color_name).join(", ") : "Default";
      p.product_sizes?.forEach((ps) => {
        filtered.push({ ...p, img: displayImg, colors: availableColors, size: ps.size, stock: ps.stock_quantity });
      });
    }
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={styles["data-table-card"]}>
      <div
        className={styles["card-header"]}
        style={{ marginBottom: 0 }}
      >
        <div>
          <h3 className={styles["card-title"]}>
            Inventory Management
          </h3>
        </div>
        <div className={`${styles["search-bar"]} ${styles["table-search"]}`}>
          <i className={`bi bi-search ${styles["search-icon"]}`}></i>
          <input
            type="text"
            placeholder="Search inventory..."
            value={tableSearchQuery}
            onChange={(e) => setTableSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginTop: "1.5rem",
          background: "var(--color-bg)",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          flexWrap: "wrap",
        }}
      >
        <CustomCheckbox
          id="selectAllInventory"
          label="Select All"
          checked={
            selectedInventory.length > 0 &&
            selectedInventory.length >=
              products.reduce(
                (sum, p) => sum + (p.product_sizes?.length || 0),
                0,
              )
          }
          onChange={handleInventorySelectAll}
        />
        <div style={{ flexGrow: 1 }}></div>
        <input
          type="number"
          placeholder="Stock Qty"
          min="0"
          className={styles["qty-input"]}
          style={{ width: "120px", padding: "0.5rem" }}
          value={bulkStock}
          onChange={(e) => setBulkStock(e.target.value)}
        />
        <button
          className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-sm"]}`}
          onClick={handleBulkUpdate}
          disabled={isSubmitting}
        >
          Update Selected
        </button>
      </div>
      <div className={styles["table-responsive"]}>
        <table className={styles["admin-table"]}>
          <thead>
            <tr>
              <th></th>
              <th>Product Details</th>
              <th>Color / Size</th>
              <th>Current Stock</th>
              <th>Manage Stock</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--color-muted-fg)" }}>
                  No inventory data found.
                </td>
              </tr>
            ) : (
              paginated.map((p, idx) => (
                <tr key={`${p.id}-${p.size}-${idx}`}>
                  <td>
                    <CustomCheckbox
                      id={`inv-${p.id}-${p.size}-${idx}`}
                      checked={selectedInventory.includes(`${p.id}|${p.size}`)}
                      onChange={() => handleInventoryCheck(p.id, p.size)}
                    />
                  </td>
                  <td>
                    <div className={styles["table-product-cell"]}>
                      <img
                        src={p.img}
                        alt={p.name}
                        className={styles["table-product-img"]}
                      />
                      <span className={styles["table-product-name"]}>{p.name}</span>
                    </div>
                  </td>
                  <td className={`${styles["font-semibold"]} ${styles["text-muted"]}`}>
                    Size {p.size} <br />
                    <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>
                      Colors: {p.colors}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${p.stock > 0 ? (p.stock < 10 ? styles["badge-warning"] : styles["badge-success"]) : styles["badge-danger"]}`}
                    >
                      {p.stock} units
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="number"
                        id={`restock-${p.id}-${p.size}`}
                        min="0"
                        placeholder="Stock Qty"
                        className={styles["qty-input"]}
                      />
                      <button
                        className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-sm"]}`}
                        onClick={() =>
                          handleSingleStockUpdate(
                            p.id,
                            p.size,
                            `restock-${p.id}-${p.size}`,
                          )
                        }
                      >
                        Set Stock
                      </button>
                      <button
                        className={`${styles.btn} ${styles["btn-danger-outline"]} ${styles["btn-sm"]}`}
                        onClick={() => handleMarkEmpty(p.id, p.size)}
                      >
                        Mark Empty
                      </button>
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

export default InventorySection;
