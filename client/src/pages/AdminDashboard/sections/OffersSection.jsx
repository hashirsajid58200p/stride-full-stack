import React from 'react';
import Pagination from '../../../components/UI/Pagination';

const OffersSection = ({
  styles,
  offers,
  currentPage,
  setCurrentPage,
  ITEMS_PER_PAGE,
  setFlashForm,
  setOfferForm,
  setActiveModal,
  setTargetId,
  getStatusBadge
}) => {
  // Flash Sales Logic
  const flashSales = offers.filter((o) => o.type === "flash_sale");
  const flashTotalPages = Math.ceil(flashSales.length / ITEMS_PER_PAGE);
  const flashPaginated = flashSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Coupons Logic
  const coupons = offers.filter((o) => o.type === "coupon" || o.type === "product");
  const couponsTotalPages = Math.ceil(coupons.length / ITEMS_PER_PAGE);
  const couponsPaginated = coupons.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <div className={`${styles["data-table-card"]} ${styles["mb-3"]}`}>
        <div className={styles["card-header"]}>
          <div>
            <h3 className={styles["card-title"]}>
              Direct Product Discounts (Flash Sales)
            </h3>
          </div>
          <button
            className={styles["btn-primary"]}
            onClick={() => {
              setFlashForm({ targetId: "", discount: "", date: "" });
              setActiveModal("flash");
            }}
          >
            <i className="bi bi-lightning-charge-fill"></i> Create
            Flash Sale
          </button>
        </div>
        <div className={styles["table-responsive"]}>
          <table className={styles["admin-table"]}>
            <thead>
              <tr>
                <th>Target Product</th>
                <th>Discount</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flashPaginated.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "var(--color-muted-fg)" }}>
                    No flash sales found.
                  </td>
                </tr>
              ) : (
                flashPaginated.map((c) => (
                  <tr key={c.id}>
                    <td className={styles["font-semibold"]}>
                      {c.target_product_id ? c.products?.name : "ALL PRODUCTS"}
                    </td>
                    <td className={`${styles["text-accent"]} ${styles["font-semibold"]}`}>{c.discount_percentage}% OFF</td>
                    <td className={styles["text-muted"]}>{c.valid_until}</td>
                    <td><span className={`${styles.badge} ${getStatusBadge(c.status)}`}>{c.status}</span></td>
                    <td>
                      <button className={styles["btn-danger-outline"]} onClick={() => { setTargetId(c.id); setActiveModal("deleteOffer"); }}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              <tr className={styles["pagination-row"]}>
                <td colSpan="5">
                  <Pagination 
                    totalPages={flashTotalPages} 
                    current={currentPage} 
                    onPageChange={setCurrentPage} 
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles["data-table-card"]}>
        <div className={styles["card-header"]}>
          <div>
            <h3 className={styles["card-title"]}>Discount Coupons</h3>
          </div>
          <button
            className={styles["btn-primary"]}
            onClick={() => {
              setOfferForm({
                type: "coupon",
                targetId: "",
                code: "",
                discount: "",
                limit: "",
                date: "",
              });
              setActiveModal("offer");
            }}
          >
            <i className="bi bi-tag-fill"></i> Create Coupon
          </button>
        </div>
        <div className={styles["table-responsive"]}>
          <table className={styles["admin-table"]}>
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Valid Until</th>
                <th>Usage Limit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {couponsPaginated.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "var(--color-muted-fg)" }}>
                    No coupons found.
                  </td>
                </tr>
              ) : (
                couponsPaginated.map((c) => (
                  <tr key={c.id}>
                    <td className={styles["font-semibold"]}>{c.code}</td>
                    <td className={styles["text-muted"]}>
                      {c.type === "coupon" ? "General Coupon" : `Coupon for ${c.products?.name}`}
                    </td>
                    <td className={`${styles["text-accent"]} ${styles["font-semibold"]}`}>{c.discount_percentage}% OFF</td>
                    <td className={styles["text-muted"]}>{c.valid_until}</td>
                    <td>{c.usage_limit || "∞"}</td>
                    <td><span className={`${styles.badge} ${getStatusBadge(c.status)}`}>{c.status}</span></td>
                    <td>
                      <button className={styles["btn-danger-outline"]} onClick={() => { setTargetId(c.id); setActiveModal("deleteOffer"); }}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              <tr className={styles["pagination-row"]}>
                <td colSpan="7">
                  <Pagination 
                    totalPages={couponsTotalPages} 
                    current={currentPage} 
                    onPageChange={setCurrentPage} 
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default OffersSection;
