import React from 'react';

const TestingLabSection = ({ styles, testConfig, setTestConfig }) => {
  return (
    <div className={styles["data-table-card"]}>
      <div className={styles["card-header"]}>
        <div>
          <h3 className={styles["card-title"]}>Site Behavior Testing Lab</h3>
          <p className={styles["card-subtitle"]}>
            Control global application features and UI behavior in real-time.
          </p>
        </div>
      </div>
      <div className={styles["testing-grid"]}>
        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Allow Add to Cart</strong>
            <p className={styles["testing-desc"]}>When disabled, the 'Add to Cart' button is hidden site-wide.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.allowAddToCart}
              onChange={(e) => setTestConfig({...testConfig, allowAddToCart: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>

        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Allow Buy Now</strong>
            <p className={styles["testing-desc"]}>Toggle direct 'Buy Now' checkout button visibility.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.allowBuyNow}
              onChange={(e) => setTestConfig({...testConfig, allowBuyNow: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>

        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Allow Product Reviews</strong>
            <p className={styles["testing-desc"]}>Control if customers can post and see product reviews.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.allowReviews}
              onChange={(e) => setTestConfig({...testConfig, allowReviews: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>

        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Allow Wishlist Action</strong>
            <p className={styles["testing-desc"]}>When disabled, admin cannot add products to the wishlist.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.allowWishlist}
              onChange={(e) => setTestConfig({...testConfig, allowWishlist: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>

        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Enable Support Chat</strong>
            <p className={styles["testing-desc"]}>Toggle the floating AI Support widget on/off.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.enableChatbot}
              onChange={(e) => setTestConfig({...testConfig, enableChatbot: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>

        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Enable Stripe Checkout</strong>
            <p className={styles["testing-desc"]}>Allow redirection to Stripe for payments.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.enableStripeCheckout}
              onChange={(e) => setTestConfig({...testConfig, enableStripeCheckout: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>

        <div className={styles["testing-item"]}>
          <div className={styles["testing-info"]}>
            <strong className={styles["testing-title"]}>Admin Content Bypass</strong>
            <p className={styles["testing-desc"]}>When enabled, Admin can right-click and download images/videos.</p>
          </div>
          <label className={styles["switch"]}>
            <input 
              type="checkbox" 
              checked={testConfig.allowContentDownload}
              onChange={(e) => setTestConfig({...testConfig, allowContentDownload: e.target.checked})}
            />
            <span className={styles["slider"]}></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default TestingLabSection;
