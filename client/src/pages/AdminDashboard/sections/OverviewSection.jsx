import React, { useState } from 'react';

const OverviewSection = ({
  styles,
  totalInventoryValue,
  products,
  lowStockCount,
  offers,
  totalIncome,
  orders = [],
  scrollRef,
  switchView,
  chartTimeframe = "30d",
  setChartTimeframe = () => {}
}) => {
  const completedOrders = orders.filter(o => o.status !== "Cancelled");
  const aov = completedOrders.length > 0 ? (totalIncome / completedOrders.length) : 0;

  return (
    <>
      <div className={styles["stats-row"]} id="overview-stats-container">
        {/* Stat Card 1: Revenue */}
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Total Revenue{" "}
              <span className={styles["stat-period"]}>Live</span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]}>
                {window.formatPrice
                  ? window.formatPrice(totalIncome)
                  : `$${totalIncome.toFixed(2)}`}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-accent"]}`}
          >
            <i className="bi bi-currency-dollar"></i>
          </div>
        </div>

        {/* Stat Card 2: Total Orders */}
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Total Orders{" "}
              <span className={styles["stat-period"]}>Placed</span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]}>
                {orders.length}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-blue"]}`}
          >
            <i className="bi bi-cart-check-fill"></i>
          </div>
        </div>

        {/* Stat Card 3: Average Order Value */}
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Avg. Order Value{" "}
              <span className={styles["stat-period"]}>AOV</span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]}>
                {window.formatPrice
                  ? window.formatPrice(aov)
                  : `$${aov.toFixed(2)}`}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-purple"]}`}
          >
            <i className="bi bi-calculator"></i>
          </div>
        </div>

        {/* Stat Card 4: Inventory Valuation */}
        <div className={styles["stat-card"]}>
          <div className={styles["stat-info"]}>
            <p className={styles["stat-label"]}>
              Inventory Valuation{" "}
              <span className={styles["stat-period"]}>Catalog</span>
            </p>
            <div className={styles["stat-value-row"]}>
              <h3 className={styles["stat-value"]}>
                {window.formatPrice
                  ? window.formatPrice(totalInventoryValue)
                  : `$${totalInventoryValue.toFixed(2)}`}
              </h3>
            </div>
          </div>
          <div
            className={`${styles["stat-icon-wrapper"]} ${styles["text-orange"]}`}
          >
            <i className="bi bi-box-seam-fill"></i>
          </div>
        </div>
      </div>

      {/* Analytics & Visual Charts Row */}
      <div className={styles["charts-row"]}>
        {/* Main Line / Area Revenue Chart */}
        <div
          className={`${styles["chart-card"]} ${styles["main-chart"]}`}
        >
          <div className={styles["card-header"]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h3 className={styles["card-title"]} style={{ margin: 0 }}>Revenue & Sales Trend</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", margin: "2px 0 0" }}>
                Real-time transaction earnings overview
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "0.3rem", background: "var(--color-bg)", padding: "3px", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
              {[
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "all", label: "All Time" }
              ].map(tf => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setChartTimeframe(tf.id)}
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "7px",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: chartTimeframe === tf.id ? "var(--color-accent)" : "transparent",
                    color: chartTimeframe === tf.id ? "#ffffff" : "var(--color-muted-fg)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles["chart-metrics"]}>
            <div className={styles.metric}>
              <p className={styles["metric-label"]}>Gross Sales</p>
              <p className={styles["metric-value"]}>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(totalIncome)
                    : `$${totalIncome.toFixed(2)}`}
                </span>
                <span className={`${styles.trend} ${styles.positive}`}>
                  Live <i className="bi bi-graph-up-arrow"></i>
                </span>
              </p>
            </div>
            <div className={styles.metric}>
              <p className={styles["metric-label"]}>
                Est. COGS & Shipping (40%)
              </p>
              <p className={styles["metric-value"]}>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(totalIncome * 0.4)
                    : `$${(totalIncome * 0.4).toFixed(2)}`}
                </span>
                <span className={`${styles.trend} ${styles.negative}`}>
                  Est. <i className="bi bi-graph-down-arrow"></i>
                </span>
              </p>
            </div>
            <div className={styles.metric}>
              <p className={styles["metric-label"]}>Net Margin (60%)</p>
              <p className={styles["metric-value"]}>
                <span>
                  {window.formatPrice
                    ? window.formatPrice(totalIncome * 0.6)
                    : `$${(totalIncome * 0.6).toFixed(2)}`}
                </span>
                <span className={`${styles.trend} ${styles.positive}`}>
                  Profit <i className="bi bi-cash"></i>
                </span>
              </p>
            </div>
          </div>

          <div className={styles["chart-placeholder"]} style={{ minHeight: "260px" }}>
            <canvas id="salesLineChart"></canvas>
          </div>
        </div>

        {/* Brand & Category Distribution Doughnut */}
        <div
          className={`${styles["chart-card"]} ${styles["target-chart"]}`}
        >
          <div className={styles["card-header"]}>
            <h3 className={styles["card-title"]}>
              Brand Distribution
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", margin: "2px 0 0" }}>
              Catalog breakdown by brand
            </p>
          </div>
          <div className={styles["target-content"]}>
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "240px",
                aspectRatio: 1,
                margin: "0 auto"
              }}
            >
              <canvas id="categoryPieChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Selling & Offers */}
      <div className={styles["bottom-row"]}>
        <div
          className={`${styles["bottom-card"]} ${styles["top-selling"]}`}
        >
          <div className={styles["card-header"]}>
            <div>
              <h3 className={styles["card-title"]}>
                Featured Sneaker Inventory
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", margin: "2px 0 0" }}>
                Active footwear in stock
              </p>
            </div>
            <button
              className={`${styles.btn} ${styles["btn-outline"]} ${styles["btn-sm"]}`}
              onClick={() => switchView("products")}
            >
              View Catalog
            </button>
          </div>
          <div
            className={styles["product-cards-scroll"]}
            ref={scrollRef}
          >
            {products.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className={styles["admin-product-card"]}
              >
                <div className={styles["prod-img"]}>
                  <img src={p.main_image_url || "/images/placeholders/shoe_placeholder.png"} alt={p.name} />
                </div>
                <div className={styles["prod-info"]}>
                  <h4>{p.name}</h4>
                  <p>{p.brand} • {p.totalStock} Pairs</p>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-accent)" }}>
                    ${Number(p.price || 0).toFixed(2)}
                  </span>
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
            <div>
              <h3 className={styles["card-title"]}>Active Promotions</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", margin: "2px 0 0" }}>
                Discounts & Flash sales
              </p>
            </div>
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
                style={{ fontSize: "0.85rem", textAlign: "center", padding: "1.5rem 0" }}
              >
                No active promotional campaigns running.
              </p>
            ) : (
              offers.slice(0, 4).map((o) => (
                <div key={o.id} className={styles["offer-item"]}>
                  <div className={styles["offer-text"]}>
                    <span>
                      {o.products?.name || o.code || (o.target_product_id ? "Targeted Sneaker" : "Global Promo")}{" "}
                      <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>
                        ({o.discount_percentage}% OFF)
                      </span>
                    </span>
                    <span className={styles.date}>
                      Valid till: {o.valid_until || "Ongoing"}
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
