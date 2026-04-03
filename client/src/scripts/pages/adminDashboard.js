import {
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  linkWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.addEventListener("firebaseInitialized", async () => {
  // Make showToast available immediately globally to prevent ReferenceErrors
  window.showToast = function (message, type = "success") {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = message;
      toast.style.borderLeftColor = type === "success" ? "#4CAF50" : "#f44336";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  };

  // Inject the HTML loader component
  if (window.injectProfileLoaders) {
    await window.injectProfileLoaders();
  }

  const topDateElement = document.getElementById("top-header-date");
  if (topDateElement) {
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    topDateElement.textContent = new Date().toLocaleDateString(
      "en-US",
      options,
    );
  }

  window.onAuthStateChanged(window.auth, (user) => {
    if (user) {
      const role = localStorage.getItem("userRole");
      if (role === "admin") {
        initDashboard(user);
      } else {
        window.location.href = "userDashboard.html";
      }
    } else {
      window.location.href = "login.html";
    }
  });

  async function loadColorShadesComponent() {
    if (!window.renderColorSwatches) {
      try {
        const response = await fetch("../components/colorShades.html");
        const html = await response.text();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        const scripts = wrapper.querySelectorAll("script");
        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;
          document.body.appendChild(newScript);
        });
      } catch (err) {
        console.error("Failed to load colorShades component:", err);
      }
    }
  }

  async function initDashboard(currentUser) {
    let extraData = { phone: "", address: "", postalCode: "", avatarUrl: "" };
    const extraDataStr = localStorage.getItem(
      `stride_profile_${currentUser.uid}`,
    );
    if (extraDataStr) {
      extraData = JSON.parse(extraDataStr);
    }

    let activeAvatarUrl = currentUser.photoURL;
    if (extraData.avatarUrl && extraData.avatarUrl.includes("cloudinary")) {
      activeAvatarUrl = extraData.avatarUrl;
      if (currentUser.photoURL !== extraData.avatarUrl) {
        updateProfile(currentUser, { photoURL: extraData.avatarUrl }).catch(
          (e) => console.error(e),
        );
      }
    }

    await loadColorShadesComponent();
    const swatchesContainer = document.getElementById(
      "color-swatches-container",
    );
    if (swatchesContainer && window.renderColorSwatches) {
      swatchesContainer.innerHTML = window.renderColorSwatches();
    }

    // MOCK DATA FOR ORDERS (Kept mock for now until Stripe is fully wired)
    const db = {
      user: {
        fullName: currentUser.displayName || "Super Admin",
        email: currentUser.email || "admin@stride.com",
        phone: extraData.phone || currentUser.phoneNumber || "",
        address: extraData.address || "",
        postalCode: extraData.postalCode || "",
        avatarUrl: activeAvatarUrl || null,
      },
      orders: [
        {
          id: "#ORD-8901",
          customer: "Sarah Williams",
          date: "2024-05-30",
          items: 2,
          total: "$329.98",
          status: "Delivered",
        },
        {
          id: "#ORD-8902",
          customer: "Michael Chen",
          date: "2024-05-29",
          items: 1,
          total: "$179.99",
          status: "Shipped",
        },
        {
          id: "#ORD-8903",
          customer: "Emma Thompson",
          date: "2024-05-29",
          items: 3,
          total: "$450.00",
          status: "Processing",
        },
        {
          id: "#ORD-8904",
          customer: "James Wilson",
          date: "2024-05-28",
          items: 1,
          total: "$129.99",
          status: "Delivered",
        },
      ],
    };

    const firstName = db.user.fullName.split(" ")[0];
    document.title = `${firstName} (Admin) - Dashboard`;

    // ==========================================
    // DYNAMIC DATA FETCH (Customers, Offers, Products)
    // ==========================================

    async function fetchCustomers() {
      try {
        if (!window.supabase) return;
        const { data: profiles, error } = await window.supabase
          .from("profiles")
          .select("*");

        if (error) {
          console.warn("Could not fetch profiles:", error);
          return;
        }

        renderCustomersTable(profiles);
        const custCountElement = document.getElementById(
          "dash-total-customers",
        );
        if (custCountElement) custCountElement.textContent = profiles.length;
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    }

    async function fetchOffers() {
      try {
        if (!window.supabase) return;
        const { data: offers, error } = await window.supabase
          .from("offers")
          .select("*, products(name)");

        if (error) {
          console.warn("Could not fetch offers:", error);
          return;
        }

        // Split data between Coupons and Flash Sales
        const coupons = offers.filter(
          (o) => o.type === "coupon" || o.type === "product",
        );
        const flashSales = offers.filter((o) => o.type === "flash_sale");

        renderOffersTable(coupons);
        renderFlashSalesTable(flashSales);
      } catch (err) {
        console.error("Error fetching offers:", err);
      }
    }

    async function fetchDashboardData() {
      try {
        if (!window.supabase) return;

        const { data: products, error } = await window.supabase
          .from("products")
          .select(
            `
            *,
            product_sizes ( stock_quantity )
          `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        let totalInventoryValue = 0;
        let lowStockCount = 0;
        let totalItems = products.length;

        products.forEach((p) => {
          let productStock = 0;
          if (p.product_sizes) {
            productStock = p.product_sizes.reduce(
              (sum, size) => sum + size.stock_quantity,
              0,
            );
          }

          totalInventoryValue += productStock * p.price;
          if (productStock > 0 && productStock < 10) {
            lowStockCount++;
          }
        });

        const statsContainer = document.getElementById(
          "overview-stats-container",
        );
        if (statsContainer) {
          statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-info">
                    <p class="stat-label">Total Inventory Value <span class="stat-period">Live</span></p>
                    <div class="stat-value-row">
                        <h3 class="stat-value">$${totalInventoryValue.toLocaleString()}</h3>
                    </div>
                </div>
                <div class="stat-icon-wrapper text-accent"><i class="bi bi-cash-stack"></i></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <p class="stat-label">Total Products <span class="stat-period">In Catalog</span></p>
                    <div class="stat-value-row">
                        <h3 class="stat-value">${totalItems}</h3>
                    </div>
                </div>
                <div class="stat-icon-wrapper text-blue"><i class="bi bi-box-seam"></i></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <p class="stat-label">Low Stock Items <span class="stat-period">Needs Attention</span></p>
                    <div class="stat-value-row">
                        <h3 class="stat-value ${lowStockCount > 0 ? "text-red" : ""}">${lowStockCount}</h3>
                    </div>
                </div>
                <div class="stat-icon-wrapper text-orange"><i class="bi bi-exclamation-triangle"></i></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <p class="stat-label">Total Customers <span class="stat-period">Registered</span></p>
                    <div class="stat-value-row">
                        <h3 class="stat-value" id="dash-total-customers">...</h3>
                    </div>
                </div>
                <div class="stat-icon-wrapper text-purple"><i class="bi bi-people"></i></div>
            </div>
          `;
        }

        const topProductsContainer = document.getElementById(
          "top-products-container",
        );
        if (topProductsContainer) {
          const top5 = products.slice(0, 5);
          topProductsContainer.innerHTML = top5
            .map((p) => {
              let stock = p.product_sizes
                ? p.product_sizes.reduce((sum, s) => sum + s.stock_quantity, 0)
                : 0;
              return `
                <div class="admin-product-card">
                  <div class="prod-img">
                    <img src="${p.main_image_url}" alt="${p.name}">
                  </div>
                  <div class="prod-info">
                    <h4>${p.name}</h4>
                    <p>${stock} Pcs in Stock</p>
                  </div>
                </div>
              `;
            })
            .join("");
        }

        renderCategoryChart(products);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    }

    function renderCategoryChart(products) {
      const brandCounts = {};
      products.forEach((p) => {
        if (brandCounts[p.brand]) {
          brandCounts[p.brand]++;
        } else {
          brandCounts[p.brand] = 1;
        }
      });

      const labels = Object.keys(brandCounts);
      const data = Object.values(brandCounts);

      const backgroundColors = [
        "#ff6b00",
        "#3b82f6",
        "#10b981",
        "#8b5cf6",
        "#f59e0b",
      ];

      const ctx = document.getElementById("categoryPieChart");
      if (!ctx) return;

      let chartStatus = Chart.getChart("categoryPieChart");
      if (chartStatus != undefined) {
        chartStatus.destroy();
      }

      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: backgroundColors,
              borderWidth: 0,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#a3a3a3",
                font: {
                  family: "'Inter', sans-serif",
                  size: 11,
                },
                padding: 20,
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
          },
          cutout: "75%",
          animation: {
            animateScale: true,
            animateRotate: true,
          },
        },
      });
    }

    const leftArrow = document.getElementById("scroll-left-btn");
    const rightArrow = document.getElementById("scroll-right-btn");
    const scrollContainer = document.getElementById("top-products-container");

    if (leftArrow && rightArrow && scrollContainer) {
      leftArrow.addEventListener("click", () => {
        scrollContainer.scrollBy({ left: -250, behavior: "smooth" });
      });
      rightArrow.addEventListener("click", () => {
        scrollContainer.scrollBy({ left: 250, behavior: "smooth" });
      });
    }

    const themeBtn = document.getElementById("themeToggle");
    const themeIcon = themeBtn.querySelector("i");
    const logoImg = document.getElementById("sidebar-logo");

    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    themeBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
      if (theme === "dark") {
        themeIcon.classList.remove("bi-moon");
        themeIcon.classList.add("bi-sun");
        if (logoImg)
          logoImg.src = "../../public/images/logos/stride_logo_light.png";
      } else {
        themeIcon.classList.remove("bi-sun");
        themeIcon.classList.add("bi-moon");
        if (logoImg)
          logoImg.src = "../../public/images/logos/stride_logo_dark.png";
      }
    }

    const CLOUDINARY_URL =
      "https://api.cloudinary.com/v1_1/dwagwbklz/image/upload";
    const CLOUDINARY_UPLOAD_PRESET = "ml_default";

    async function uploadImageToCloudinary(file, folderName, customName) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", folderName);

      if (customName) {
        const slug = customName
          .toString()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w\-]+/g, "")
          .replace(/\-\-+/g, "-")
          .replace(/^-+/, "")
          .replace(/-+$/, "");
        formData.append("public_id", slug);
      }

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!data.secure_url) throw new Error("Cloudinary upload failed");
      return data.secure_url;
    }

    const strideFileInput = document.getElementById("stride-file-input");
    const personalUploadBtn = document.getElementById("personal-upload-btn");
    const removeProfilePicBtn = document.getElementById(
      "remove-profile-pic-btn",
    );
    const uploadArea = document.querySelector(".upload-area");

    async function handleProfileUpload(file) {
      if (!file) return;
      closeAllModals();

      if (file.size > 2 * 1024 * 1024) {
        window.showToast("Image size will be maximum 2mb", "error");
        if (strideFileInput) strideFileInput.value = "";
        return;
      }

      if (window.showProfileLoaders) window.showProfileLoaders();
      const existingImageUrl = db.user.avatarUrl;

      try {
        const downloadURL = await uploadImageToCloudinary(
          file,
          "stride_profiles",
        );

        await updateProfile(currentUser, { photoURL: downloadURL });
        if (existingImageUrl)
          await deleteOldImageFromCloudinary(existingImageUrl);

        db.user.avatarUrl = downloadURL;
        updateAvatarDisplay(downloadURL, db.user.fullName);

        extraData.avatarUrl = downloadURL;
        localStorage.setItem(
          `stride_profile_${currentUser.uid}`,
          JSON.stringify(extraData),
        );

        window.showToast("Profile image updated successfully!", "success");
      } catch (error) {
        console.error("Upload error:", error);
        window.showToast(`Can't upload: ${error.message}`, "error");
      } finally {
        if (window.hideProfileLoaders) window.hideProfileLoaders();
        if (strideFileInput) strideFileInput.value = "";
      }
    }

    if (strideFileInput) {
      strideFileInput.addEventListener("change", (e) =>
        handleProfileUpload(e.target.files[0]),
      );
    }

    if (removeProfilePicBtn) {
      removeProfilePicBtn.addEventListener("click", async () => {
        const existingImageUrl = db.user.avatarUrl;
        try {
          await updateProfile(currentUser, { photoURL: "" });
          if (existingImageUrl)
            await deleteOldImageFromCloudinary(existingImageUrl);

          db.user.avatarUrl = null;
          updateAvatarDisplay(null, db.user.fullName);

          extraData.avatarUrl = "";
          localStorage.setItem(
            `stride_profile_${currentUser.uid}`,
            JSON.stringify(extraData),
          );
          window.showToast("Profile image removed.", "success");
        } catch (error) {
          console.error("Error removing image:", error);
          window.showToast("Failed to remove image.", "error");
        }
      });
    }

    function getCloudinaryPublicId(url) {
      if (!url || !url.includes("cloudinary")) return null;
      try {
        const uploadIndex = url.indexOf("upload/");
        if (uploadIndex === -1) return null;
        let path = url.substring(uploadIndex + 7);
        if (path.match(/^v\d+\//)) path = path.replace(/^v\d+\//, "");
        const lastDotIndex = path.lastIndexOf(".");
        return lastDotIndex !== -1 ? path.substring(0, lastDotIndex) : path;
      } catch (e) {
        return null;
      }
    }

    async function deleteOldImageFromCloudinary(url) {
      const publicId = getCloudinaryPublicId(url);
      if (!publicId) return;
      try {
        // Deployment Version
        await fetch("/api/images/delete", {
          // Local Version
          // await fetch("http://localhost:5000/api/images/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: publicId }),
        });
      } catch (error) {
        console.error("Failed to reach backend to delete image:", error);
      }
    }

    if (uploadArea) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        uploadArea.addEventListener(
          eventName,
          (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
          false,
        );
      });
      ["dragenter", "dragover"].forEach((eventName) => {
        uploadArea.addEventListener(
          eventName,
          () => uploadArea.classList.add("drag-over"),
          false,
        );
      });
      ["dragleave", "drop"].forEach((eventName) => {
        uploadArea.addEventListener(
          eventName,
          () => uploadArea.classList.remove("drag-over"),
          false,
        );
      });
      uploadArea.addEventListener(
        "drop",
        (e) => {
          const dt = e.dataTransfer;
          const file = dt.files[0];
          handleProfileUpload(file);
        },
        false,
      );
    }

    const allModals = document.querySelectorAll(".modal-overlay");
    const uploadModal = document.getElementById("upload-image-modal");
    const headerAvatarBtn = document.getElementById("header-avatar-btn");
    const popupBrowseBtn = document.getElementById("popup-browse-btn");

    function closeAllModals() {
      allModals.forEach((modal) => modal.classList.remove("active"));
    }

    allModals.forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    const modalCloseButtons = document.querySelectorAll(".modal-close-btn");
    modalCloseButtons.forEach((btn) =>
      btn.addEventListener("click", closeAllModals),
    );

    if (headerAvatarBtn)
      headerAvatarBtn.addEventListener("click", () =>
        uploadModal.classList.add("active"),
      );
    if (personalUploadBtn)
      personalUploadBtn.addEventListener("click", () =>
        uploadModal.classList.add("active"),
      );
    if (popupBrowseBtn)
      popupBrowseBtn.addEventListener("click", () => strideFileInput.click());

    const sidebarFiltersModal = document.getElementById("sidebarFiltersModal");
    const openSidebarFiltersBtn = document.getElementById(
      "openSidebarFiltersModal",
    );
    const closeSidebarFiltersBtn = document.getElementById(
      "closeSidebarFiltersModal",
    );
    const saveSidebarFiltersBtn = document.getElementById(
      "saveSidebarFiltersBtn",
    );

    const catContainer = document.getElementById("active-sidebar-categories");
    const brandContainer = document.getElementById("active-sidebar-brands");

    const addCatBtn = document.getElementById("add-sidebar-category-btn");
    const newCatInput = document.getElementById("new-sidebar-category");
    const addBrandBtn = document.getElementById("add-sidebar-brand-btn");
    const newBrandInput = document.getElementById("new-sidebar-brand");

    let sidebarConfig = JSON.parse(
      localStorage.getItem("stride_sidebar_filters"),
    ) || {
      categories: ["Men", "Women", "Universal", "New Arrival"],
      brands: ["Nike", "Adidas", "Puma", "New Balance", "Jordan"],
    };

    function renderFilterPills() {
      catContainer.innerHTML = sidebarConfig.categories
        .map(
          (c, i) => `
        <div class="filter-pill">
          ${c} <button type="button" onclick="window.removeSidebarFilter('category', ${i})"><i class="bi bi-x-circle-fill"></i></button>
        </div>
      `,
        )
        .join("");

      brandContainer.innerHTML = sidebarConfig.brands
        .map(
          (b, i) => `
        <div class="filter-pill">
          ${b} <button type="button" onclick="window.removeSidebarFilter('brand', ${i})"><i class="bi bi-x-circle-fill"></i></button>
        </div>
      `,
        )
        .join("");
    }

    window.removeSidebarFilter = function (type, index) {
      if (type === "category") {
        sidebarConfig.categories.splice(index, 1);
      } else {
        sidebarConfig.brands.splice(index, 1);
      }
      renderFilterPills();
    };

    if (addCatBtn) {
      addCatBtn.addEventListener("click", () => {
        const val = newCatInput.value.trim();
        if (val && !sidebarConfig.categories.includes(val)) {
          sidebarConfig.categories.push(val);
          newCatInput.value = "";
          renderFilterPills();
        }
      });
    }

    if (addBrandBtn) {
      addBrandBtn.addEventListener("click", () => {
        const val = newBrandInput.value.trim();
        if (val && !sidebarConfig.brands.includes(val)) {
          sidebarConfig.brands.push(val);
          newBrandInput.value = "";
          renderFilterPills();
        }
      });
    }

    if (openSidebarFiltersBtn) {
      openSidebarFiltersBtn.addEventListener("click", () => {
        renderFilterPills();
        sidebarFiltersModal.classList.add("active");
      });
    }

    if (closeSidebarFiltersBtn) {
      closeSidebarFiltersBtn.addEventListener("click", () => {
        sidebarFiltersModal.classList.remove("active");
      });
    }

    if (saveSidebarFiltersBtn) {
      saveSidebarFiltersBtn.addEventListener("click", () => {
        localStorage.setItem(
          "stride_sidebar_filters",
          JSON.stringify(sidebarConfig),
        );
        window.showToast("Sidebar configuration saved!", "success");
        sidebarFiltersModal.classList.remove("active");
      });
    }

    // ==========================================
    // SUPABASE: ADD/EDIT PRODUCT LOGIC
    // ==========================================
    const prodModal = document.getElementById("productModal");
    const openProdBtn = document.getElementById("openAddProductModal");
    const closeProdBtn = document.getElementById("closeProductModal");
    const colorUploadsContainer = document.getElementById(
      "color-uploads-container",
    );
    const addProductForm = document.getElementById("addProductForm");
    const productModalTitle = document.getElementById("productModalTitle");
    const productSubmitBtn = document.getElementById("productSubmitBtn");
    const prodIdInput = document.getElementById("prod-id");

    const genderChecks = document.querySelectorAll(".gender-tag-check");
    genderChecks.forEach((chk) => {
      chk.addEventListener("change", function () {
        if (this.checked) {
          genderChecks.forEach((other) => {
            if (other !== this) other.checked = false;
          });
        }
      });
    });

    if (openProdBtn) {
      openProdBtn.addEventListener("click", () => {
        addProductForm.reset();
        prodIdInput.value = "";
        colorUploadsContainer.innerHTML = "";
        productModalTitle.textContent = "Add New Product";
        productSubmitBtn.textContent = "Save Product to Stride";
        let colorCheckboxes = document.querySelectorAll(".color-input");
        colorCheckboxes.forEach((cb) => (cb.checked = false));
        prodModal.classList.add("active");
      });
    }

    if (closeProdBtn) {
      closeProdBtn.addEventListener("click", () => {
        prodModal.classList.remove("active");
      });
    }

    function attachColorBlockListeners() {
      let colorCheckboxes = document.querySelectorAll(".color-input");
      colorCheckboxes.forEach((cb) => {
        cb.addEventListener("change", () => {
          const color = cb.value;
          if (cb.checked) {
            const block = document.createElement("div");
            block.className = "color-block";
            block.id = `block-${color.replace(/\s+/g, "-")}`;

            const sizes = [7, 8, 9, 10, 11, 12];
            let sizeHtml = "";
            sizes.forEach((size) => {
              sizeHtml += `
                  <div class="size-row">
                    <label><input type="checkbox" class="color-size-check" data-color="${color}" data-size="${size}" /> Size ${size}</label>
                    <input type="number" class="qty-input" data-color="${color}" data-size="${size}" placeholder="Qty" min="0" disabled />
                  </div>
                `;
            });

            block.innerHTML = `
                <div class="color-block-header">
                  <h4 class="color-block-title">
                    <span class="swatch color-${color.toLowerCase().replace(/\s+/g, "")}" style="${color === "Default" ? "background:var(--color-bg);border:1px solid var(--color-border);color:var(--color-fg);display:flex;align-items:center;justify-content:center;font-size:0.5rem;font-weight:800;" : ""}">${color === "Default" ? "DEF" : ""}</span> 
                    ${color} Variant
                  </h4>
                  <button type="button" class="remove-color-btn" data-color="${color}"><i class="bi bi-x-lg"></i></button>
                </div>
                
                <div class="color-image-upload-area">
                  <input type="file" accept="image/*" class="color-file-input" data-color="${color}" required>
                  <img class="color-preview-img" src="" alt="preview">
                  <input type="hidden" class="existing-image-url" data-color="${color}" value="">
                </div>
                
                <div class="form-group" style="margin-top:0.5rem;">
                  <label>Inventory for ${color}</label>
                  <div class="size-qty-grid">
                     ${sizeHtml}
                  </div>
                </div>
              `;

            colorUploadsContainer.appendChild(block);

            const fileInput = block.querySelector(".color-file-input");
            const previewImg = block.querySelector(".color-preview-img");
            const removeBtn = block.querySelector(".remove-color-btn");
            const sizeChecks = block.querySelectorAll(".color-size-check");

            fileInput.addEventListener("change", function () {
              const file = this.files[0];
              if (file) {
                previewImg.src = URL.createObjectURL(file);
                previewImg.style.display = "block";
                block.querySelector(".existing-image-url").value = "";
              } else {
                previewImg.src = "";
                previewImg.style.display = "none";
              }
            });

            removeBtn.addEventListener("click", () => {
              block.remove();
              cb.checked = false;
            });

            sizeChecks.forEach((sc) => {
              sc.addEventListener("change", () => {
                const qtyInput = sc
                  .closest(".size-row")
                  .querySelector(".qty-input");
                if (sc.checked) {
                  qtyInput.disabled = false;
                  qtyInput.focus();
                  qtyInput.required = true;
                  if (qtyInput.value === "") qtyInput.value = "100";
                } else {
                  qtyInput.disabled = true;
                  qtyInput.value = "";
                  qtyInput.required = false;
                }
              });
            });
          } else {
            const block = document.getElementById(
              `block-${color.replace(/\s+/g, "-")}`,
            );
            if (block) block.remove();
          }
        });
      });
    }

    setTimeout(() => {
      attachColorBlockListeners();
    }, 100);

    window.openProductEditModal = async function (productId) {
      try {
        const { data: product, error } = await window.supabase
          .from("products")
          .select(`*, product_colors (*), product_sizes (*)`)
          .eq("id", productId)
          .single();

        if (error) throw error;

        addProductForm.reset();
        colorUploadsContainer.innerHTML = "";
        let colorCheckboxes = document.querySelectorAll(".color-input");
        colorCheckboxes.forEach((cb) => (cb.checked = false));

        prodIdInput.value = product.id;
        productModalTitle.textContent = "Edit Product";
        productSubmitBtn.textContent = "Update Product in Stride";

        document.getElementById("prod-brand").value = product.brand;
        document.getElementById("prod-name").value = product.name;
        document.getElementById("prod-desc").value = product.description || "";
        document.getElementById("prod-price").value = product.price;

        const allTags = product.tags
          ? product.tags.split(",").map((t) => t.trim())
          : [];
        const standardChecks = document.querySelectorAll(".standard-tag-check");
        let customTagsArr = [];

        standardChecks.forEach((chk) => {
          if (allTags.includes(chk.value)) {
            chk.checked = true;
          }
        });

        allTags.forEach((tag) => {
          if (
            tag !== "Men" &&
            tag !== "Women" &&
            tag !== "Universal" &&
            tag !== "New Arrival" &&
            tag !== "On Sale" &&
            tag !== "Featured" &&
            tag !== "Limited Edition"
          ) {
            customTagsArr.push(tag);
          }
        });
        document.getElementById("prod-tags").value = customTagsArr.join(", ");

        if (product.product_colors) {
          const activeColorCount = product.product_colors.length || 1;

          product.product_colors.forEach((pc) => {
            const cb = document.querySelector(
              `.color-input[value="${pc.color_name}"]`,
            );
            if (cb) cb.checked = true;

            const color = pc.color_name;
            const block = document.createElement("div");
            block.className = "color-block";
            block.id = `block-${color.replace(/\s+/g, "-")}`;

            const sizes = [7, 8, 9, 10, 11, 12];
            let sizeHtml = "";
            sizes.forEach((size) => {
              const matchingSize = product.product_sizes.find(
                (ps) => parseInt(ps.size) === size,
              );
              const isChecked = matchingSize ? "checked" : "";

              const qty = matchingSize
                ? Math.floor(matchingSize.stock_quantity / activeColorCount)
                : "";
              const disabled = matchingSize ? "" : "disabled";

              sizeHtml += `
                 <div class="size-row">
                   <label><input type="checkbox" class="color-size-check" data-color="${color}" data-size="${size}" ${isChecked} /> Size ${size}</label>
                   <input type="number" class="qty-input" data-color="${color}" data-size="${size}" placeholder="Qty" min="0" value="${qty}" ${disabled} ${isChecked ? "required" : ""} />
                 </div>
               `;
            });

            block.innerHTML = `
                <div class="color-block-header">
                  <h4 class="color-block-title">
                    <span class="swatch color-${color.toLowerCase().replace(/\s+/g, "")}" style="${color === "Default" ? "background:var(--color-bg);border:1px solid var(--color-border);color:var(--color-fg);display:flex;align-items:center;justify-content:center;font-size:0.5rem;font-weight:800;" : ""}">${color === "Default" ? "DEF" : ""}</span> 
                    ${color} Variant
                  </h4>
                  <button type="button" class="remove-color-btn" data-color="${color}"><i class="bi bi-x-lg"></i></button>
                </div>
                
                <div class="color-image-upload-area">
                  <input type="file" accept="image/*" class="color-file-input" data-color="${color}">
                  <img class="color-preview-img" src="${pc.image_url}" alt="preview" style="display:block;">
                  <input type="hidden" class="existing-image-url" data-color="${color}" value="${pc.image_url}">
                </div>
                
                <div class="form-group" style="margin-top:0.5rem;">
                  <label>Inventory for ${color}</label>
                  <div class="size-qty-grid">
                     ${sizeHtml}
                  </div>
                </div>
             `;
            colorUploadsContainer.appendChild(block);

            const fileInput = block.querySelector(".color-file-input");
            const previewImg = block.querySelector(".color-preview-img");
            const removeBtn = block.querySelector(".remove-color-btn");
            const sizeChecks = block.querySelectorAll(".color-size-check");

            fileInput.addEventListener("change", function () {
              const file = this.files[0];
              if (file) {
                previewImg.src = URL.createObjectURL(file);
                previewImg.style.display = "block";
                block.querySelector(".existing-image-url").value = "";
              }
            });

            removeBtn.addEventListener("click", () => {
              block.remove();
              if (cb) cb.checked = false;
            });

            sizeChecks.forEach((sc) => {
              sc.addEventListener("change", () => {
                const qtyInput = sc
                  .closest(".size-row")
                  .querySelector(".qty-input");
                if (sc.checked) {
                  qtyInput.disabled = false;
                  qtyInput.focus();
                  qtyInput.required = true;
                  if (qtyInput.value === "") qtyInput.value = "100";
                } else {
                  qtyInput.disabled = true;
                  qtyInput.value = "";
                  qtyInput.required = false;
                }
              });
            });
          });
        }

        prodModal.classList.add("active");
      } catch (error) {
        console.error("Error opening edit modal:", error);
        window.showToast("Could not load product details.", "error");
      }
    };

    if (addProductForm) {
      addProductForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = addProductForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`;
        submitBtn.disabled = true;

        try {
          const isEditMode = prodIdInput.value !== "";
          const targetId = isEditMode ? prodIdInput.value : undefined;

          const brand = document.getElementById("prod-brand").value.trim();
          const name = document.getElementById("prod-name").value.trim();
          const desc = document.getElementById("prod-desc").value;
          const price = document.getElementById("prod-price").value;

          let finalTags = [];
          document
            .querySelectorAll(".standard-tag-check:checked")
            .forEach((c) => finalTags.push(c.value));
          const customTagsStr = document.getElementById("prod-tags").value;
          if (customTagsStr) {
            customTagsStr.split(",").forEach((t) => {
              if (t.trim() !== "") finalTags.push(t.trim());
            });
          }
          const tagsString = finalTags.join(", ");

          const colorBlocks = document.querySelectorAll(".color-block");
          if (colorBlocks.length === 0) {
            throw new Error("You must add at least one color/image variant.");
          }

          let mainImageUrl = "";
          let processedColors = [];

          for (let i = 0; i < colorBlocks.length; i++) {
            const block = colorBlocks[i];
            const colorName = block
              .querySelector(".color-file-input")
              .getAttribute("data-color");
            const fileInput = block.querySelector(".color-file-input");
            const existingUrlInput = block.querySelector(".existing-image-url");

            let finalUrl = "";

            if (fileInput.files.length > 0) {
              const customImageName = `${brand}-${name}-${colorName}`;
              finalUrl = await uploadImageToCloudinary(
                fileInput.files[0],
                "stride_products",
                customImageName,
              );
              if (existingUrlInput.value) {
                await deleteOldImageFromCloudinary(existingUrlInput.value);
              }
            } else if (existingUrlInput.value) {
              finalUrl = existingUrlInput.value;
            } else {
              throw new Error(`Missing image for color: ${colorName}`);
            }

            if (i === 0) mainImageUrl = finalUrl;

            processedColors.push({
              color_name: colorName,
              image_url: finalUrl,
            });
          }

          let newProductId;

          if (isEditMode) {
            const { data, error } = await window.supabase
              .from("products")
              .update({
                brand: brand,
                name: name,
                description: desc,
                price: parseFloat(price),
                tags: tagsString,
                main_image_url: mainImageUrl,
              })
              .eq("id", targetId)
              .select()
              .single();
            if (error) throw error;
            newProductId = data.id;

            await window.supabase
              .from("product_colors")
              .delete()
              .eq("product_id", targetId);
            await window.supabase
              .from("product_sizes")
              .delete()
              .eq("product_id", targetId);
          } else {
            const { data, error } = await window.supabase
              .from("products")
              .insert([
                {
                  brand: brand,
                  name: name,
                  description: desc,
                  price: parseFloat(price),
                  tags: tagsString,
                  main_image_url: mainImageUrl,
                },
              ])
              .select()
              .single();
            if (error) throw error;
            newProductId = data.id;
          }

          const colorInserts = processedColors.map((c) => ({
            product_id: newProductId,
            color_name: c.color_name,
            image_url: c.image_url,
          }));
          if (colorInserts.length > 0) {
            await window.supabase.from("product_colors").insert(colorInserts);
          }

          let globalSizesMap = {};
          const activeSizeCheckboxes = document.querySelectorAll(
            ".color-size-check:checked",
          );

          activeSizeCheckboxes.forEach((sc) => {
            const sizeValue = sc.getAttribute("data-size");
            const qtyInput = sc
              .closest(".size-row")
              .querySelector(".qty-input");
            const stockQty = parseInt(qtyInput.value, 10);

            if (globalSizesMap[sizeValue]) {
              globalSizesMap[sizeValue] += stockQty;
            } else {
              globalSizesMap[sizeValue] = stockQty;
            }
          });

          const sizeInserts = Object.keys(globalSizesMap).map((size) => ({
            product_id: newProductId,
            size: size,
            stock_quantity: globalSizesMap[size],
          }));

          if (sizeInserts.length > 0) {
            await window.supabase.from("product_sizes").insert(sizeInserts);
          }

          window.showToast(
            `Product successfully ${isEditMode ? "updated" : "added"}!`,
            "success",
          );
          prodModal.classList.remove("active");
          addProductForm.reset();
          colorUploadsContainer.innerHTML = "";
          fetchLiveProducts();
          fetchDashboardData();
        } catch (error) {
          console.error("Error processing product:", error);
          window.showToast(
            error.message || "Failed to process product.",
            "error",
          );
        } finally {
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
        }
      });
    }

    const productDeleteModal = document.getElementById("product-delete-modal");
    const confirmProductDeleteBtn = document.getElementById(
      "confirm-product-delete-btn",
    );
    const cancelProductDeleteBtn = document.getElementById(
      "cancel-product-delete-btn",
    );
    const deleteProductNameSpan = document.getElementById(
      "delete-product-name",
    );
    let targetDeleteId = null;

    if (cancelProductDeleteBtn) {
      cancelProductDeleteBtn.addEventListener("click", () => {
        productDeleteModal.classList.remove("active");
        targetDeleteId = null;
      });
    }

    window.triggerDeleteProduct = function (productId, productName) {
      targetDeleteId = productId;
      deleteProductNameSpan.textContent = productName;
      productDeleteModal.classList.add("active");
    };

    if (confirmProductDeleteBtn) {
      confirmProductDeleteBtn.addEventListener("click", async () => {
        if (!targetDeleteId) return;

        confirmProductDeleteBtn.disabled = true;
        confirmProductDeleteBtn.innerHTML = "Deleting...";

        try {
          const { data: productColors, err } = await window.supabase
            .from("product_colors")
            .select("image_url")
            .eq("product_id", targetDeleteId);

          if (productColors) {
            for (let pc of productColors) {
              await deleteOldImageFromCloudinary(pc.image_url);
            }
          }

          const { error } = await window.supabase
            .from("products")
            .delete()
            .eq("id", targetDeleteId);
          if (error) throw error;

          window.showToast("Product permanently deleted.", "success");
          productDeleteModal.classList.remove("active");
          fetchLiveProducts();
          fetchDashboardData();
        } catch (error) {
          console.error("Delete failed:", error);
          window.showToast("Failed to delete product.", "error");
        } finally {
          confirmProductDeleteBtn.disabled = false;
          confirmProductDeleteBtn.innerHTML = "Delete";
          targetDeleteId = null;
        }
      });
    }

    // ==========================================
    // SUPABASE: FETCH LIVE PRODUCTS & INVENTORY
    // ==========================================
    async function fetchLiveProducts() {
      try {
        const { data: products, error } = await window.supabase
          .from("products")
          .select(`*, product_sizes ( size, stock_quantity )`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const uniqueBrands = [...new Set(products.map((p) => p.brand))].sort();
        const brandList = document.getElementById("brand-list");
        if (brandList) {
          brandList.innerHTML = uniqueBrands
            .map((b) => `<option value="${b}">`)
            .join("");
        }

        const offerProdDropdown = document.getElementById("offer-product-id");
        if (offerProdDropdown) {
          offerProdDropdown.innerHTML =
            `<option value="">Select a Product</option>` +
            products
              .map(
                (p) =>
                  `<option value="${p.id}">${p.name} (${p.brand})</option>`,
              )
              .join("");
        }

        // Also populate Flash Sale product dropdown
        const flashProdDropdown = document.getElementById("flash-product-id");
        if (flashProdDropdown) {
          flashProdDropdown.innerHTML =
            `<option value="">Apply to ALL Products</option>` +
            products
              .map(
                (p) =>
                  `<option value="${p.id}">${p.name} (${p.brand})</option>`,
              )
              .join("");
        }

        const liveTableData = products.map((p) => {
          let totalStock = 0;
          if (p.product_sizes && p.product_sizes.length > 0) {
            totalStock = p.product_sizes.reduce(
              (sum, current) => sum + current.stock_quantity,
              0,
            );
          }

          let status = "In Stock";
          if (totalStock === 0) status = "Out of Stock";
          else if (totalStock < 10) status = "Low Stock";

          return {
            id: p.id,
            shortId: p.id.substring(0, 8).toUpperCase(),
            name: p.name,
            brand: p.brand,
            price: `$${p.price.toFixed(2)}`,
            stock: totalStock,
            status: status,
            img: p.main_image_url,
          };
        });

        renderProductsTable(liveTableData);

        let inventoryData = [];
        products.forEach((p) => {
          if (p.product_sizes && p.product_sizes.length > 0) {
            p.product_sizes.forEach((ps) => {
              inventoryData.push({
                product_id: p.id,
                name: p.name,
                img: p.main_image_url,
                size: ps.size,
                stock: ps.stock_quantity,
              });
            });
          }
        });
        renderInventoryTable(inventoryData);
      } catch (error) {
        console.error("Error fetching live products:", error);
      }
    }

    window.updateStock = async function (productId, size) {
      const input = document.getElementById(`restock-${productId}-${size}`);
      if (!input || !input.value) return;

      const newStockAmount = parseInt(input.value);
      if (isNaN(newStockAmount) || newStockAmount < 0) return;

      try {
        const { error } = await window.supabase
          .from("product_sizes")
          .update({ stock_quantity: newStockAmount })
          .eq("product_id", productId)
          .eq("size", size);

        if (error) throw error;

        window.showToast(
          `Stock updated to ${newStockAmount} for Size ${size}!`,
          "success",
        );
        input.value = "";
        fetchLiveProducts();
        fetchDashboardData();
      } catch (err) {
        console.error("Error updating stock:", err);
        window.showToast("Failed to update stock.", "error");
      }
    };

    window.markOutOfStock = async function (productId, size) {
      try {
        const { error } = await window.supabase
          .from("product_sizes")
          .update({ stock_quantity: 0 })
          .eq("product_id", productId)
          .eq("size", size);

        if (error) throw error;

        window.showToast(`Marked Size ${size} as Out of Stock.`, "success");
        fetchLiveProducts();
        fetchDashboardData();
      } catch (err) {
        console.error("Error marking out of stock:", err);
        window.showToast("Failed to mark out of stock.", "error");
      }
    };

    // ==========================================
    // DYNAMIC OFFERS & FLASH SALES LOGIC
    // ==========================================

    // DELETE OFFER LOGIC
    let targetDeleteOfferId = null;
    const offerDeleteModal = document.getElementById("offer-delete-modal");
    const confirmOfferDeleteBtn = document.getElementById(
      "confirm-offer-delete-btn",
    );
    const cancelOfferDeleteBtn = document.getElementById(
      "cancel-offer-delete-btn",
    );

    if (cancelOfferDeleteBtn) {
      cancelOfferDeleteBtn.addEventListener("click", () => {
        offerDeleteModal.classList.remove("active");
        targetDeleteOfferId = null;
      });
    }

    window.triggerDeleteOffer = function (offerId) {
      targetDeleteOfferId = offerId;
      offerDeleteModal.classList.add("active");
    };

    if (confirmOfferDeleteBtn) {
      confirmOfferDeleteBtn.addEventListener("click", async () => {
        if (!targetDeleteOfferId) return;

        confirmOfferDeleteBtn.disabled = true;
        confirmOfferDeleteBtn.innerHTML = "Deleting...";

        try {
          const { error } = await window.supabase
            .from("offers")
            .delete()
            .eq("id", targetDeleteOfferId);
          if (error) throw error;

          window.showToast("Offer permanently deleted.", "success");
          offerDeleteModal.classList.remove("active");
          fetchOffers();
        } catch (error) {
          console.error("Delete offer failed:", error);
          window.showToast("Failed to delete offer.", "error");
        } finally {
          confirmOfferDeleteBtn.disabled = false;
          confirmOfferDeleteBtn.innerHTML = "Delete";
          targetDeleteOfferId = null;
        }
      });
    }

    // COUPON MODAL
    const offerModal = document.getElementById("offerModal");
    const openOfferBtn = document.getElementById("openOfferModal");
    const closeOfferBtn = document.getElementById("closeOfferModal");
    const addOfferForm = document.getElementById("addOfferForm");
    const offerTypeSelect = document.getElementById("offer-type");
    const offerProductGroup = document.getElementById("offer-product-group");
    const offerProductSelect = document.getElementById("offer-product-id");

    if (openOfferBtn)
      openOfferBtn.addEventListener("click", () =>
        offerModal.classList.add("active"),
      );
    if (closeOfferBtn)
      closeOfferBtn.addEventListener("click", () =>
        offerModal.classList.remove("active"),
      );

    if (offerTypeSelect) {
      offerTypeSelect.addEventListener("change", (e) => {
        if (e.target.value === "product") {
          offerProductGroup.style.display = "flex";
          offerProductSelect.required = true;
        } else {
          offerProductGroup.style.display = "none";
          offerProductSelect.required = false;
          offerProductSelect.value = "";
        }
      });
    }

    if (addOfferForm) {
      addOfferForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = document.getElementById("submitOfferBtn");
        const originalText = btn.textContent;
        btn.textContent = "Saving...";
        btn.disabled = true;

        try {
          const type = offerTypeSelect.value;
          const target_product_id =
            type === "product" ? offerProductSelect.value : null;
          const code_or_name = document
            .getElementById("offer-code")
            .value.trim();
          const discount = document.getElementById("offer-discount").value;
          const limit = document.getElementById("offer-limit").value || null;
          const date = document.getElementById("offer-date").value;

          const { error } = await window.supabase.from("offers").insert([
            {
              type: type,
              target_product_id: target_product_id,
              code: code_or_name,
              discount_percentage: parseFloat(discount),
              usage_limit: limit ? parseInt(limit) : null,
              valid_until: date,
              status: "Active",
            },
          ]);

          if (error) throw error;

          window.showToast("Coupon Created Successfully!");
          offerModal.classList.remove("active");
          addOfferForm.reset();
          fetchOffers();
        } catch (err) {
          console.error("Error creating offer:", err);
          window.showToast("Failed to create coupon.", "error");
        } finally {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    }

    // FLASH SALE MODAL
    const flashSaleModal = document.getElementById("flashSaleModal");
    const openFlashSaleBtn = document.getElementById("openFlashSaleModal");
    const closeFlashSaleBtn = document.getElementById("closeFlashSaleModal");
    const addFlashSaleForm = document.getElementById("addFlashSaleForm");

    if (openFlashSaleBtn)
      openFlashSaleBtn.addEventListener("click", () =>
        flashSaleModal.classList.add("active"),
      );
    if (closeFlashSaleBtn)
      closeFlashSaleBtn.addEventListener("click", () =>
        flashSaleModal.classList.remove("active"),
      );

    if (addFlashSaleForm) {
      addFlashSaleForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = document.getElementById("submitFlashBtn");
        const originalText = btn.textContent;
        btn.textContent = "Saving...";
        btn.disabled = true;

        try {
          const target_product_id =
            document.getElementById("flash-product-id").value || null;
          const discount = document.getElementById("flash-discount").value;
          const date = document.getElementById("flash-date").value;
          const generatedCode = "SALE-" + Date.now(); // Backend expects a code, so we generate a hidden one

          const { error } = await window.supabase.from("offers").insert([
            {
              type: "flash_sale",
              target_product_id: target_product_id,
              code: generatedCode,
              discount_percentage: parseFloat(discount),
              usage_limit: null, // Unlimited for flash sales
              valid_until: date,
              status: "Active",
            },
          ]);

          if (error) throw error;

          window.showToast("Flash Sale Activated Successfully!");
          flashSaleModal.classList.remove("active");
          addFlashSaleForm.reset();
          fetchOffers();
        } catch (err) {
          console.error("Error creating flash sale:", err);
          window.showToast("Failed to create Flash Sale.", "error");
        } finally {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    }

    // ==========================================
    // RENDERING TABLES
    // ==========================================
    function getStatusBadge(status) {
      if (
        status === "In Stock" ||
        status === "Delivered" ||
        status === "Active"
      )
        return "badge-success";
      if (status === "Low Stock" || status === "Processing")
        return "badge-warning";
      if (
        status === "Out of Stock" ||
        status === "Expired" ||
        status === "Inactive"
      )
        return "badge-danger";
      if (status === "Shipped") return "badge-info";
      return "";
    }

    function renderProductsTable(data) {
      const tbody = document.getElementById("products-table-body");
      if (!tbody) return;

      tbody.innerHTML = data
        .map(
          (p) => `
              <tr>
                  <td class="text-muted">${p.shortId}</td>
                  <td>
                      <div class="table-product-cell">
                          <img src="${p.img}" alt="${p.name}" class="table-product-img">
                          <span class="table-product-name">${p.name}</span>
                      </div>
                  </td>
                  <td>${p.brand}</td>
                  <td class="font-semibold">${p.price}</td>
                  <td>${p.stock} units</td>
                  <td><span class="badge ${getStatusBadge(p.status)}">${p.status}</span></td>
                  <td>
                      <div class="table-actions">
                          <button class="btn-outline" onclick="window.openProductEditModal('${p.id}')"><i class="bi bi-pencil"></i></button>
                          <button class="btn-danger-outline" onclick="window.triggerDeleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
                      </div>
                  </td>
              </tr>
          `,
        )
        .join("");
    }

    function renderInventoryTable(data) {
      const tbody = document.getElementById("inventory-table-body");
      if (!tbody) return;
      tbody.innerHTML = data
        .map(
          (p) => `
              <tr>
                  <td>
                      <div class="table-product-cell">
                          <img src="${p.img}" alt="${p.name}" class="table-product-img">
                          <span class="table-product-name">${p.name}</span>
                      </div>
                  </td>
                  <td class="font-semibold text-muted">Size ${p.size}</td>
                  <td><span class="badge ${p.stock > 0 ? (p.stock < 10 ? "badge-warning" : "badge-success") : "badge-danger"}">${p.stock} units</span></td>
                  <td>
                      <div style="display: flex; gap: 0.5rem; align-items: center;">
                          <input type="number" id="restock-${p.product_id}-${p.size}" min="0" placeholder="New Total" style="width: 100px; padding: 0.3rem; border-radius: 4px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-fg);" />
                          <button class="btn btn-primary btn-sm" onclick="window.updateStock('${p.product_id}', '${p.size}')">Set Stock</button>
                          <button class="btn btn-danger-outline btn-sm" onclick="window.markOutOfStock('${p.product_id}', '${p.size}')">Mark Empty</button>
                      </div>
                  </td>
              </tr>
          `,
        )
        .join("");
    }

    function renderOrdersTable(data = db.orders) {
      const tbody = document.getElementById("orders-table-body");
      if (!tbody) return;
      tbody.innerHTML = data
        .map(
          (o) => `
              <tr>
                  <td class="font-semibold">${o.id}</td>
                  <td>${o.customer}</td>
                  <td class="text-muted">${o.date}</td>
                  <td>${o.items} items</td>
                  <td class="font-semibold">${o.total}</td>
                  <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
                  <td>
                      <div class="table-actions">
                          <button class="btn-outline" onclick="openOrderDetailsModal('${o.id}')">View Details</button>
                      </div>
                  </td>
              </tr>
          `,
        )
        .join("");
    }

    function renderOffersTable(data) {
      const tbody = document.getElementById("offers-table-body");
      if (!tbody) return;
      tbody.innerHTML = data
        .map(
          (c) => `
              <tr>
                  <td class="font-semibold">${c.code}</td>
                  <td class="text-muted">${c.type === "coupon" ? "General Coupon" : `Coupon for ${c.products?.name}`}</td>
                  <td class="text-accent font-semibold">${c.discount_percentage}% OFF</td>
                  <td class="text-muted">${c.valid_until}</td>
                  <td>${c.usage_limit || "∞"}</td>
                  <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
                  <td>
                      <div class="table-actions">
                          <button class="btn-danger-outline" onclick="window.triggerDeleteOffer('${c.id}')"><i class="bi bi-trash"></i></button>
                      </div>
                  </td>
              </tr>
          `,
        )
        .join("");
    }

    function renderFlashSalesTable(data) {
      const tbody = document.getElementById("flash-sales-table-body");
      if (!tbody) return;
      tbody.innerHTML = data
        .map(
          (c) => `
              <tr>
                  <td class="font-semibold">${c.target_product_id ? c.products?.name : "ALL PRODUCTS"}</td>
                  <td class="text-accent font-semibold">${c.discount_percentage}% OFF</td>
                  <td class="text-muted">${c.valid_until}</td>
                  <td><span class="badge ${getStatusBadge(c.status)}">${c.status}</span></td>
                  <td>
                      <div class="table-actions">
                          <button class="btn-danger-outline" onclick="window.triggerDeleteOffer('${c.id}')"><i class="bi bi-trash"></i></button>
                      </div>
                  </td>
              </tr>
          `,
        )
        .join("");
    }

    function renderCustomersTable(data) {
      const tbody = document.getElementById("customers-table-body");
      if (!tbody) return;
      tbody.innerHTML = data
        .map((c) => {
          let joinDate = "N/A";
          if (c.created_at) {
            const d = new Date(c.created_at);
            joinDate = d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }
          return `
              <tr>
                  <td class="font-semibold">${c.full_name || "N/A"}</td>
                  <td>${c.email || "N/A"}</td>
                  <td>${c.phone || "N/A"}</td>
                  <td><span class="badge ${c.role === "admin" ? "badge-info" : "badge-success"}">${c.role || "user"}</span></td>
                  <td class="text-muted">${joinDate}</td>
              </tr>
             `;
        })
        .join("");
    }

    function updateAvatarDisplay(imageUrl, fullName) {
      const headerAvatarContent = document.getElementById(
        "header-avatar-content",
      );
      const profileAvatarContent = document.getElementById(
        "profile-avatar-content",
      );
      const removeBtn = document.getElementById("remove-profile-pic-btn");

      const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

      const initialsHTML = `<span id="preview-initials">${initials}</span>`;

      if (imageUrl) {
        const imgHTML = `<img src="${imageUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        if (headerAvatarContent) headerAvatarContent.innerHTML = imgHTML;
        if (profileAvatarContent) profileAvatarContent.innerHTML = imgHTML;
        if (removeBtn) removeBtn.style.display = "inline-flex";
      } else {
        if (headerAvatarContent) headerAvatarContent.innerHTML = initialsHTML;
        if (profileAvatarContent) profileAvatarContent.innerHTML = initialsHTML;
        if (removeBtn) removeBtn.style.display = "none";
      }
    }

    // ==========================================
    // SPA NAVIGATION LOGIC
    // ==========================================
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    const viewSections = document.querySelectorAll(".view-section");
    const pageTitle = document.getElementById("dynamic-page-title");

    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        if (link.getAttribute("href") === "index.html") return;
        e.preventDefault();

        const target = link.getAttribute("data-target");
        if (!target) return;

        if (target === "logout") {
          const logoutModal = document.getElementById("logout-modal");
          if (logoutModal) logoutModal.classList.add("active");
          return;
        }

        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        if (pageTitle) {
          if (target === "dashboard") {
            pageTitle.textContent = "Overview";
          } else if (target === "profile") {
            pageTitle.textContent = "Personal Information";
          } else {
            pageTitle.textContent = target;
          }
        }

        viewSections.forEach((section) => section.classList.remove("active"));
        const targetView = document.getElementById(`view-${target}`);
        if (targetView) {
          targetView.classList.add("active");
        }

        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("active");
        }
      });
    });

    // ==========================================
    // PERSONAL INFO LOGIC
    // ==========================================
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        db.user.fullName = document.getElementById("prof-fullname").value;
        db.user.phone = document.getElementById("prof-phone").value;
        db.user.address = document.getElementById("prof-address").value;
        db.user.postalCode = document.getElementById("prof-postal").value;

        try {
          await updateProfile(currentUser, { displayName: db.user.fullName });

          extraData.phone = db.user.phone;
          extraData.address = db.user.address;
          extraData.postalCode = db.user.postalCode;
          localStorage.setItem(
            `stride_profile_${currentUser.uid}`,
            JSON.stringify(extraData),
          );

          document.getElementById("header-user-name").textContent =
            db.user.fullName;

          if (!db.user.avatarUrl) {
            updateAvatarDisplay(null, db.user.fullName);
          }

          window.showToast("Personal Information Saved Successfully!");
        } catch (error) {
          console.error("Profile update error:", error);
          window.showToast("Error saving profile data.", "error");
        }
      });
    }

    // Google Connect
    const googleConnectBtn = document.getElementById("google-connect-btn");
    const googleConnectStatus = document.getElementById(
      "google-connect-status",
    );
    const isGoogleConnected = currentUser.providerData.some(
      (p) => p.providerId === "google.com",
    );

    if (googleConnectBtn && googleConnectStatus) {
      if (isGoogleConnected) {
        googleConnectBtn.style.display = "none";
        googleConnectStatus.style.display = "inline-flex";
        googleConnectStatus.innerHTML = `<i class="bi bi-check-circle-fill text-green"></i> Connected to Google`;
      } else {
        googleConnectBtn.style.display = "inline-flex";
        googleConnectStatus.style.display = "none";

        googleConnectBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          const provider = new GoogleAuthProvider();
          try {
            await linkWithPopup(currentUser, provider);
            window.showToast("Successfully linked to Google!", "success");
            googleConnectBtn.style.display = "none";
            googleConnectStatus.style.display = "inline-flex";
            googleConnectStatus.innerHTML = `<i class="bi bi-check-circle-fill text-green"></i> Connected to Google`;
          } catch (error) {
            if (error.code === "auth/credential-already-in-use") {
              window.showToast(
                "This Google account is already linked to another user.",
                "error",
              );
            } else {
              window.showToast("Failed to link Google account.", "error");
            }
          }
        });
      }
    }

    // Password Update
    const hasPassword = currentUser.providerData.some(
      (p) => p.providerId === "password",
    );
    const passTitle = document.getElementById("password-section-title");
    const currentPassGroup = document.getElementById("current-password-group");
    const currentPassInput = document.getElementById("current-password");
    const passSubmitBtn = document.getElementById("password-submit-btn");
    const forgotPassBtn = document.getElementById("dashboard-forgot-password");

    if (!hasPassword) {
      passTitle.textContent = "Set Password";
      currentPassGroup.style.display = "none";
      currentPassInput.removeAttribute("required");
      passSubmitBtn.textContent = "Set Password";
      if (forgotPassBtn) forgotPassBtn.style.display = "none";
    } else {
      passTitle.textContent = "Update Password";
      currentPassGroup.style.display = "flex";
      currentPassInput.setAttribute("required", "true");
      passSubmitBtn.textContent = "Change Password";
      if (forgotPassBtn) forgotPassBtn.style.display = "block";
    }

    if (forgotPassBtn) {
      forgotPassBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await sendPasswordResetEmail(window.auth, currentUser.email);
          window.showToast(
            "Password reset link sent to your email!",
            "success",
          );
        } catch (error) {
          window.showToast("Failed to send reset email.", "error");
        }
      });
    }

    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPass = document.getElementById("new-password").value;
        const currentPass = currentPassInput.value;

        try {
          if (hasPassword) {
            const credential = EmailAuthProvider.credential(
              currentUser.email,
              currentPass,
            );
            await reauthenticateWithCredential(currentUser, credential);
          }

          await updatePassword(currentUser, newPass);
          window.showToast(
            hasPassword
              ? "Password Updated Successfully!"
              : "Password Set Successfully!",
            "success",
          );
          passwordForm.reset();
        } catch (error) {
          window.showToast(error.message, "error");
        }
      });
    }

    // Delete Account Modal Logic
    const deleteModal = document.getElementById("delete-modal");
    const triggerDeleteBtn = document.getElementById("trigger-delete-btn");
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
    const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

    if (triggerDeleteBtn && deleteModal) {
      triggerDeleteBtn.addEventListener("click", () =>
        deleteModal.classList.add("active"),
      );
      if (cancelDeleteBtn)
        cancelDeleteBtn.addEventListener("click", () =>
          deleteModal.classList.remove("active"),
        );

      confirmDeleteBtn.addEventListener("click", async () => {
        try {
          const existingImageUrl = db.user.avatarUrl;
          if (existingImageUrl && existingImageUrl.includes("cloudinary")) {
            await deleteOldImageFromCloudinary(existingImageUrl);
          }
          localStorage.removeItem(`stride_profile_${currentUser.uid}`);
          await deleteUser(currentUser);
          window.showToast("Account deleted successfully.", "success");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1500);
        } catch (error) {
          if (error.code === "auth/requires-recent-login") {
            window.showToast(
              "Please log out and log back in to delete your account.",
              "error",
            );
            deleteModal.classList.remove("active");
          } else {
            window.showToast(error.message, "error");
          }
        }
      });
    }

    // Logout Modal Logic
    const logoutModal = document.getElementById("logout-modal");
    const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
    const cancelLogoutBtn = document.getElementById("cancel-logout-btn");

    if (logoutModal && confirmLogoutBtn) {
      if (cancelLogoutBtn)
        cancelLogoutBtn.addEventListener("click", () =>
          logoutModal.classList.remove("active"),
        );

      confirmLogoutBtn.addEventListener("click", () => {
        window.auth
          .signOut()
          .then(() => {
            localStorage.removeItem("userRole");
            window.showToast("Logged out successfully!", "success");
            setTimeout(() => {
              window.location.href = "login.html";
            }, 1500);
          })
          .catch((error) => {
            window.showToast("Error logging out.", "error");
          });
      });
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.getElementById("header-user-name").textContent = db.user.fullName;
    updateAvatarDisplay(db.user.avatarUrl, db.user.fullName);

    const profFullname = document.getElementById("prof-fullname");
    if (profFullname) {
      profFullname.value = db.user.fullName;
      document.getElementById("prof-email").value = db.user.email;
      document.getElementById("prof-phone").value = db.user.phone;
      document.getElementById("prof-postal").value = db.user.postalCode;
      document.getElementById("prof-address").value = db.user.address;
    }

    fetchDashboardData();
    fetchLiveProducts();
    fetchCustomers();
    fetchOffers();
    renderOrdersTable();

    // Setup Search Listeners
    function setupSearch(inputId, tableBodyId, data, renderFn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = data.filter((item) => {
          return Object.values(item).some((val) =>
            String(val).toLowerCase().includes(searchTerm),
          );
        });
        renderFn(filteredData);
      });
    }

    setupSearch(
      "order-search-input",
      "orders-table-body",
      db.orders,
      renderOrdersTable,
    );
    setupSearch("inventory-search-input", "inventory-table-body", [], () => {});

    const sidebar = document.getElementById("sidebar");
    const openBtnNav = document.getElementById("openSidebar");
    const closeBtnNav = document.getElementById("closeSidebar");

    if (openBtnNav && closeBtnNav && sidebar) {
      openBtnNav.addEventListener("click", () =>
        sidebar.classList.add("active"),
      );
      closeBtnNav.addEventListener("click", () =>
        sidebar.classList.remove("active"),
      );
    }
  }
});
