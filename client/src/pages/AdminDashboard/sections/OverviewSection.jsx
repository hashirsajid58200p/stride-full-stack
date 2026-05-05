import React from 'react';

const OverviewSection = ({
  styles,
  totalInventoryValue,
  products,
  lowStockCount,
  offers,
  totalIncome,
  scrollRef,
  switchView
}) => {
  return (
    <>
      <div className={styles["stats-row"]} id="overview-stats-container">
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Total Inventory Value{" "}
              <span className={styles["stat-period"]}>Live</span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]}>
                {window.formatPrice
                  ? window.formatPrice(totalInventoryValue)
                  : `$${totalInventoryValue}`}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-accent"]}`}
          >
            <i className="bi bi-cash-stack"></i>
          </div>
        </div>
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Total Products{" "}
              <span className={styles["stat-period"]}>
                In Catalog
              </span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]}>
                {products.length}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-blue"]}`}
          >
            <i className="bi bi-box-seam"></i>
          </div>
        </div>
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Low Stock Items{" "}
              <span className={styles["stat-period"]}>
                Needs Attention
              </span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3
                className={`${styles["stat-value"]} ${lowStockCount > 0 ? styles["text-red"] : ""}`}
              >
                {lowStockCount}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-orange"]}`}
          >
            <i className="bi bi-exclamation-triangle"></i>
          </div>
        </div>
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Active Offers{" "}
              <span className={styles["stat-period"]}>Running</span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]} id="dash-active-offers">
                {offers.length}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-purple"]}`}
          >
            <i className="bi bi-tags"></i>
          </div>
        </div>
      </div>

      <div className={styles["charts-row"]}>
        <div
          className={`${styles["chart-card"]} ${styles["main-chart"]}`}
        >
          <div className={styles["card-header"]}>
            <h3 className={styles["card-title"]}>Sales Analytic</h3>
          </div>
          <div className={styles["chart-metrics"]}>
            <div className={styles.metric}>
              <p className={styles["metric-label"]}>Income</p>
              <p className={styles["metric-value"]}>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(totalIncome)
                    : `$${totalIncome}`}
                </span>
                <span
                  className={`${styles.trend} ${styles.positive}`}
                >
                  Live <i className="bi bi-graph-up-arrow"></i>
                </span>
              </p>
            </div>
            <div className={styles.metric}>
              <p className={styles["metric-label"]}>
                Estimated Expenses (40%)
              </p>
              <p className={styles["metric-value"]}>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(totalIncome * 0.4)
                    : `$${totalIncome * 0.4}`}
                </span>
                <span
                  className={`${styles.trend} ${styles.negative}`}
                >
                  Live <i className="bi bi-graph-down-arrow"></i>
                </span>
              </p>
            </div>
            <div className={styles.metric}>
              <p className={styles["metric-label"]}>Net Balance</p>
              <p className={styles["metric-value"]}>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(totalIncome * 0.6)
                    : `$${totalIncome * 0.6}`}
                </span>
                <span
                  className={`${styles.trend} ${styles.positive}`}
                >
                  Live <i className="bi bi-graph-up-arrow"></i>
                </span>
              </p>
            </div>
          </div>
          <div className={styles["chart-placeholder"]}>
            <canvas id="salesLineChart"></canvas>
          </div>
        </div>
        <div
          className={`${styles["chart-card"]} ${styles["target-chart"]}`}
        >
          <div className={styles["card-header"]}>
            <h3 className={styles["card-title"]}>
              Inventory by Category
            </h3>
          </div>
          <div className={styles["target-content"]}>
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "250px",
                aspectRatio: 1,
              }}
            >
              <canvas id="categoryPieChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div className={styles["bottom-row"]}>
        <div
          className={`${styles["bottom-card"]} ${styles["top-selling"]}`}
        >
          <div className={styles["card-header"]}>
            <h3 className={styles["card-title"]}>
              Top Products Overview
            </h3>
          </div>
          <div
            className={styles["product-cards-scroll"]}
            ref={scrollRef}
          >
            {products.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className={styles["admin-product-card"]}
              >
                <div className={styles["prod-img"]}>
                  <img src={p.main_image_url} alt={p.name} />
                </div>
                <div className={styles["prod-info"]}>
                  <h4>{p.name}</h4>
                  <p>{p.totalStock} Pcs in Stock</p>
                </div>
              </div>
            ))}
          </div>
          <div
            className={`${styles["header-nav"]} ${styles["move-arrows"]}`}
          >
            <div
              className={styles["nav-arrow"]}
              onClick={() =>
                scrollRef.current.scrollBy({
                  left: -250,
                  behavior: "smooth",
                })
              }
            >
              <i className="bi bi-chevron-left"></i>
            </div>
            <div
              className={styles["nav-arrow"]}
              onClick={() =>
                scrollRef.current.scrollBy({
                  left: 250,
                  behavior: "smooth",
                })
              }
            >
              <i className="bi bi-chevron-right"></i>
            </div>
          </div>
        </div>
        <div
          className={`${styles["bottom-card"]} ${styles["current-offer"]}`}
        >
          <div className={styles["card-header"]}>
            <h3 className={styles["card-title"]}>Current Offers</h3>
            <button
              className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-sm"]}`}
              onClick={() => switchView("offers")}
            >
              Manage
            </button>
          </div>
          <div className={styles["offer-list"]}>
            {offers.length === 0 ? (
              <p
                className={styles["text-muted"]}
                style={{ fontSize: "0.85rem" }}
              >
                No active offers.
              </p>
            ) : (
              offers.slice(0, 4).map((o) => (
                <div key={o.id} className={styles["offer-item"]}>
                  <div className={styles["offer-text"]}>
                    <span>
                      {o.code}{" "}
                      <span style={{ color: "var(--color-accent)" }}>
                        ({o.discount_percentage}% OFF)
                      </span>
                    </span>
                    <span className={styles.date}>
                      Valid till: {o.valid_until}
                    </span>
                  </div>
                  <div className={styles["progress-track"]}>
                    <div
                      className={`${styles["progress-fill"]} ${styles["bg-accent"]}`}
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OverviewSection;
