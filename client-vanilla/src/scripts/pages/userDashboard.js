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
  if (window.injectProfileLoaders) {
    await window.injectProfileLoaders();
  }

  window.onAuthStateChanged(window.auth, (user) => {
    if (user) {
      const role = localStorage.getItem("userRole");
      if (role === "admin") {
        window.location.replace("adminDashboard.html");
      } else {
        initDashboard(user);
      }
    } else {
      window.location.replace("login.html");
    }
  });

  function initDashboard(currentUser) {
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

    const db = {
      user: {
        fullName: currentUser.displayName || "Valued Customer",
        email: currentUser.email || "No email provided",
        phone: extraData.phone || currentUser.phoneNumber || "",
        address: extraData.address || "",
        postalCode: extraData.postalCode || "",
        avatarUrl: activeAvatarUrl || null,
      },
    };

    const firstName = db.user.fullName.split(" ")[0];
    document.title = `${firstName}'s Dashboard`;

    // ==========================================
    // THEME HANDLING
    // ==========================================
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

    // ==========================================
    // DYNAMIC DATA FETCHING (Orders, News, Notifications)
    // ==========================================

    // Helper: Wait for Supabase to be fully injected and initialized before fetching
    async function waitForSupabase() {
      while (!window.supabase) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    async function fetchUserOrders() {
      await waitForSupabase();
      try {
        const { data: orders, error } = await window.supabase
          .from("orders")
          .select("*")
          .ilike("email", currentUser.email) // Case insensitive match!
          .order("created_at", { ascending: false });

        if (error) throw error;

        const processedOrders = orders.map((order) => {
          // Safeguard: Ensure items are parsed if they come back as a string
          if (typeof order.items === "string") {
            try {
              order.items = JSON.parse(order.items);
            } catch (e) {}
          }

          if (!order.is_manual_override) {
            const now = new Date();
            const orderDate = new Date(order.created_at);
            const diffHours = (now - orderDate) / (1000 * 60 * 60);

            if (diffHours > 72) {
              order.status = "Delivered";
            } else if (diffHours > 24) {
              order.status = "Shipped";
            } else if (diffHours > 1) {
              order.status = "Processing";
            } else {
              order.status = "Pending";
            }
          }
          return order;
        });

        renderOrders(processedOrders);
      } catch (err) {
        console.error("Error fetching user orders:", err);
        renderOrders([]);
      }
    }

    async function fetchLatestDrops() {
      await waitForSupabase();
      try {
        const { data: products, error } = await window.supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) throw error;
        renderLatestDrops(products);
      } catch (err) {
        console.error("Error fetching latest drops:", err);
      }
    }

    async function fetchNotifications() {
      await waitForSupabase();
      try {
        const { data: notifications, error } = await window.supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          if (error.code !== "42P01") throw error;
          return;
        }
        renderNotifications(notifications || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    }

    // ==========================================
    // RENDERING LOGIC
    // ==========================================

    function getStatusBadge(status) {
      if (status === "Delivered" || status === "Shipped")
        return "badge-success";
      if (status === "Processing") return "badge-warning";
      if (status === "Pending") return "badge-info";
      return "badge-danger";
    }

    function renderOrders(orders) {
      const previewContainer = document.getElementById(
        "dashboard-orders-preview",
      );
      const fullListContainer = document.getElementById("full-orders-list");

      if (orders.length === 0) {
        const emptyMsg = `<p class="text-muted" style="padding: 1rem;">No orders found yet.</p>`;
        if (previewContainer) previewContainer.innerHTML = emptyMsg;
        if (fullListContainer) fullListContainer.innerHTML = emptyMsg;
        return;
      }

      const ordersHtml = orders
        .map((order) => {
          const shortId = order.id.substring(0, 8).toUpperCase();
          const dateStr = new Date(order.created_at).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" },
          );

          let firstItem = {
            name: "Order Items",
            img: "../../public/images/logos/stride_logo_dark.png",
          };
          if (
            order.items &&
            Array.isArray(order.items) &&
            order.items.length > 0
          ) {
            firstItem = order.items[0];
          }

          const itemName =
            firstItem.name +
            (order.items.length > 1 ? ` +${order.items.length - 1} more` : "");

          return `
          <div class="dash-order-card">
              <div class="card-img-wrapper">
                  <img src="${firstItem.img}" alt="${itemName}">
              </div>
              <div class="card-main-info">
                  <h4>${itemName}</h4>
                  <p>#${shortId} • ${dateStr}</p>
              </div>
              <div class="card-footer-info">
                  <span class="card-price">${window.formatPrice ? window.formatPrice(order.total_amount) : "$" + order.total_amount}</span>
                  <span class="badge ${getStatusBadge(order.status)}">${order.status}</span>
              </div>
          </div>
        `;
        })
        .join("");

      if (previewContainer) previewContainer.innerHTML = ordersHtml;
      if (fullListContainer) fullListContainer.innerHTML = ordersHtml;
    }

    function renderLatestDrops(products) {
      const container = document.getElementById("dashboard-news-list");
      if (!container) return;

      if (products.length === 0) {
        container.innerHTML =
          '<p class="text-muted">No recent drops available.</p>';
        return;
      }

      container.innerHTML = products
        .map(
          (p) => `
          <div class="news-card">
              <h4>${p.name}</h4>
              <p>Fresh arrival from ${p.brand}! Available now for ${window.formatPrice ? window.formatPrice(p.price) : "$" + p.price}.</p>
          </div>
      `,
        )
        .join("");
    }

    function renderWishlist() {
      const container = document.getElementById("dashboard-wishlist-preview");
      if (!container) return;

      const wishlistItems = JSON.parse(
        localStorage.getItem("strideWishlist") || "[]",
      );

      if (wishlistItems.length === 0) {
        container.innerHTML =
          '<p class="text-muted" style="padding: 1rem;">Your wishlist is empty.</p>';
        return;
      }

      container.innerHTML = wishlistItems
        .map(
          (item) => `
            <div class="wish-card">
              <div class="card-img-wrapper">
                  <img src="${item.image}" alt="${item.name}">
              </div>
              <div class="card-main-info">
                  <h4>${item.name}</h4>
                  <span class="card-price">${window.formatPrice ? window.formatPrice(item.price) : "$" + item.price}</span>
              </div>
              <div class="wish-actions">
                  <button class="btn-outline wishlist-add-to-cart w-100" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}" data-brand="${item.brand}">Add to Cart</button>
              </div>
          </div>
        `,
        )
        .join("");
    }

    // Dynamic Notifications logic (User specific dismissals via localStorage)
    const bellBtn = document.getElementById("notification-bell-btn");
    const notifDropdown = document.getElementById("notification-dropdown");
    const markAllReadBtn = document.getElementById("mark-all-read-btn");

    document.addEventListener("click", (e) => {
      if (
        bellBtn &&
        notifDropdown &&
        !bellBtn.contains(e.target) &&
        !notifDropdown.contains(e.target)
      ) {
        notifDropdown.classList.remove("active");
      }
    });

    if (bellBtn && notifDropdown) {
      bellBtn.addEventListener("click", () => {
        notifDropdown.classList.toggle("active");
      });
    }

    if (markAllReadBtn) {
      markAllReadBtn.addEventListener("click", () => {
        if (window.allNotifications) {
          const dismissedIds = window.allNotifications.map((n) => n.id);
          localStorage.setItem(
            `stride_dismissed_notifs_${currentUser.uid}`,
            JSON.stringify(dismissedIds),
          );
          renderNotifications(window.allNotifications);
        }
      });
    }

    function renderNotifications(notifs) {
      window.allNotifications = notifs; // store for the mark all button
      const container = document.getElementById("notification-list-container");
      const badge = document.getElementById("notification-badge-count");

      const dismissedIds = JSON.parse(
        localStorage.getItem(`stride_dismissed_notifs_${currentUser.uid}`) ||
          "[]",
      );
      const unreadNotifs = notifs.filter((n) => !dismissedIds.includes(n.id));

      if (unreadNotifs.length > 0) {
        badge.style.display = "flex";
        badge.textContent = unreadNotifs.length;
      } else {
        badge.style.display = "none";
      }

      if (notifs.length === 0) {
        container.innerHTML =
          '<div style="padding: 1.5rem; text-align: center; color: var(--color-muted-fg); font-size: 0.85rem;">No notifications yet.</div>';
        return;
      }

      container.innerHTML = notifs
        .map((n) => {
          const isRead = dismissedIds.includes(n.id);
          return `
            <div class="notification-item ${isRead ? "read" : "unread"}">
              <div class="notif-title-row">
                <strong class="notif-title">${n.title}</strong>
              </div>
              <p class="notif-message">${n.message}</p>
              <span class="notif-date">${new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            `;
        })
        .join("");
    }

    function renderDashboard() {
      const dateElement = document.getElementById("current-date");
      if (dateElement) {
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const timeStr = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        dateElement.innerHTML = `${timeStr}<br>${dateStr}`;
      }

      document.getElementById("header-user-name").textContent =
        db.user.fullName;
      document.getElementById("banner-user-name").textContent = firstName;

      updateAvatarDisplay(db.user.avatarUrl, db.user.fullName);

      // Pre-fill profile form
      document.getElementById("prof-fullname").value = db.user.fullName;
      document.getElementById("prof-email").value = db.user.email;
      document.getElementById("prof-phone").value = db.user.phone;
      document.getElementById("prof-postal").value = db.user.postalCode;
      document.getElementById("prof-address").value = db.user.address;
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
    // AVATAR DROPDOWN LOGIC
    // ==========================================
    const avatarDropdownWrapper = document.getElementById("avatar-dropdown-wrapper");
    const avatarDropdownMenu = document.getElementById("avatar-dropdown-menu");
    const avatarProfileLink = document.getElementById("avatar-profile-link");
    const avatarLogoutBtn = document.getElementById("avatar-logout-btn");
    const headerAvatarBtn = document.getElementById("header-avatar-btn");

    if (headerAvatarBtn && avatarDropdownMenu) {
      headerAvatarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        avatarDropdownMenu.classList.toggle("show");
      });
    }

    if (avatarProfileLink) {
      avatarProfileLink.addEventListener("click", (e) => {
        e.preventDefault();
        avatarDropdownMenu.classList.remove("show");
        switchTab("profile");
      });
    }

    if (avatarLogoutBtn) {
      avatarLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        avatarDropdownMenu.classList.remove("show");
        const logoutModal = document.getElementById("logout-modal");
        if (logoutModal) logoutModal.classList.add("active");
      });
    }

    document.addEventListener("click", (e) => {
      if (avatarDropdownMenu && avatarDropdownMenu.classList.contains("show")) {
        if (!avatarDropdownWrapper || !avatarDropdownWrapper.contains(e.target)) {
          avatarDropdownMenu.classList.remove("show");
        }
      }
    });

    // ==========================================
    // SPA NAVIGATION LOGIC
    // ==========================================
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    const viewSections = document.querySelectorAll(".view-section");

    function switchTab(target) {
      const link = document.querySelector(
        `.sidebar-nav .nav-link[data-target="${target}"]`,
      );
 
      navLinks.forEach((l) => l.classList.remove("active"));
      if (link) link.classList.add("active");

      viewSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(`view-${target}`).classList.add("active");

      if (window.innerWidth <= 768) {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.remove("active");
      }
    }

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

        const newUrl =
          window.location.protocol +
          "//" +
          window.location.host +
          window.location.pathname +
          "?view=" +
          target;
        window.history.pushState({ path: newUrl }, "", newUrl);

        switchTab(target);
      });
    });

    window.addEventListener("viewChanged", (e) => switchTab(e.detail));

    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    if (viewParam) switchTab(viewParam);

    // Load initial data
    renderDashboard();
    fetchUserOrders();
    fetchLatestDrops();
    fetchNotifications();
    renderWishlist();

    // Listen for storage changes to keep Wishlist preview updated
    window.addEventListener("storage", (e) => {
      if (e.key === "strideWishlist") renderWishlist();
    });
    // Listen for custom event if updated on the same tab
    window.addEventListener("wishlistUpdated", renderWishlist);

    // ==========================================
    // MOUSE WHEEL HORIZONTAL SCROLL FOR DASHBOARD CARDS
    // ==========================================
    const horizontalScrollContainers = document.querySelectorAll(
      ".wishlist-preview-cards, .orders-preview-cards",
    );

    horizontalScrollContainers.forEach((container) => {
      container.addEventListener(
        "wheel",
        (e) => {
          if (Math.abs(e.deltaX) > 0) return;
          if (e.deltaY !== 0) {
            e.preventDefault();
            container.scrollLeft += e.deltaY;
          }
        },
        { passive: false },
      );
    });

    // ==========================================
    // CLOUDINARY: CONSOLIDATED FILE UPLOAD & DELETE
    // ==========================================
    const strideFileInput = document.getElementById("stride-file-input");
    const personalUploadBtn = document.getElementById("personal-upload-btn");
    const removeProfilePicBtn = document.getElementById(
      "remove-profile-pic-btn",
    );
    const uploadArea = document.querySelector(".upload-area");

    const CLOUDINARY_URL =
      "https://api.cloudinary.com/v1_1/dwagwbklz/image/upload";
    const CLOUDINARY_UPLOAD_PRESET = "ml_default";

    async function handleFileUpload(file) {
      if (!file) return;

      closeAllModals();

      if (file.size > 2 * 1024 * 1024) {
        showToast("Image size will be maximum 2mb", "error");
        if (strideFileInput) strideFileInput.value = "";
        return;
      }

      // Use global profileLoader functions
      if (window.showProfileLoaders) window.showProfileLoaders();

      const existingImageUrl = db.user.avatarUrl;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "stride_profiles");

      try {
        const response = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.secure_url) {
          const downloadURL = data.secure_url;
          await updateProfile(currentUser, { photoURL: downloadURL });

          if (existingImageUrl) {
            await deleteOldImageFromCloudinary(existingImageUrl);
          }

          db.user.avatarUrl = downloadURL;
          updateAvatarDisplay(downloadURL, db.user.fullName);

          extraData.avatarUrl = downloadURL;
          localStorage.setItem(
            `stride_profile_${currentUser.uid}`,
            JSON.stringify(extraData),
          );

          showToast("Profile image updated successfully!", "success");
        } else {
          throw new Error(data.error?.message || "Cloudinary upload failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        showToast(`Can't upload: ${error.message}`, "error");
      } finally {
        if (window.hideProfileLoaders) window.hideProfileLoaders();
        if (strideFileInput) strideFileInput.value = "";
      }
    }

    if (strideFileInput) {
      strideFileInput.addEventListener("change", (e) =>
        handleFileUpload(e.target.files[0]),
      );
    }

    if (removeProfilePicBtn) {
      removeProfilePicBtn.addEventListener("click", async () => {
        const existingImageUrl = db.user.avatarUrl;

        try {
          await updateProfile(currentUser, { photoURL: "" });

          if (existingImageUrl) {
            await deleteOldImageFromCloudinary(existingImageUrl);
          }

          db.user.avatarUrl = null;
          updateAvatarDisplay(null, db.user.fullName);

          extraData.avatarUrl = "";
          localStorage.setItem(
            `stride_profile_${currentUser.uid}`,
            JSON.stringify(extraData),
          );

          showToast("Profile image removed.", "success");
        } catch (error) {
          console.error("Error removing image:", error);
          showToast("Failed to remove image.", "error");
        }
      });
    }

    function getCloudinaryPublicId(url) {
      if (!url || !url.includes("cloudinary")) return null;
      try {
        const uploadIndex = url.indexOf("upload/");
        if (uploadIndex === -1) return null;
        let path = url.substring(uploadIndex + 7);
        if (path.match(/^v\d+\//)) {
          path = path.replace(/^v\d+\//, "");
        }
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
        await fetch("http://localhost:5000/api/images/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: publicId }),
        });
      } catch (error) {
        console.error("Failed to reach backend to delete image:", error);
      }
    }

    // Drag and Drop for Popup
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
          handleFileUpload(file);
        },
        false,
      );
    }

    // ==========================================
    // MODAL OPEN/CLOSE LOGIC
    // ==========================================
    const allModals = document.querySelectorAll(".modal-overlay");
    const uploadModal = document.getElementById("upload-image-modal");


    const popupBrowseBtn = document.getElementById("popup-browse-btn");

    function closeAllModals() {
      allModals.forEach((modal) => modal.classList.remove("active"));
    }

    const modalCloseButtons = document.querySelectorAll(".modal-close-btn");
    modalCloseButtons.forEach((btn) =>
      btn.addEventListener("click", closeAllModals),
    );

    ["cancel-delete-btn", "cancel-logout-btn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", closeAllModals);
    });

    allModals.forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeAllModals();
      });
    });


    if (personalUploadBtn)
      personalUploadBtn.addEventListener("click", () =>
        uploadModal.classList.add("active"),
      );

    if (popupBrowseBtn)
      popupBrowseBtn.addEventListener("click", () => strideFileInput.click());

    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".wishlist-add-to-cart");
      if (addBtn) {
        const itemId = addBtn.dataset.id;
        const name = addBtn.dataset.name;
        const price = parseFloat(addBtn.dataset.price);
        const img = addBtn.dataset.image;
        const brand = addBtn.dataset.brand;

        let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
        const existingItem = cartItems.find((i) => i.name === name);

        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          cartItems.push({
            name: name,
            brand: brand,
            price: price,
            img: img,
            quantity: 1,
          });
        }

        localStorage.setItem("strideCart", JSON.stringify(cartItems));
        window.dispatchEvent(new Event("cartUpdated"));

        // Optionally remove from wishlist automatically
        let wishlistItems =
          JSON.parse(localStorage.getItem("strideWishlist")) || [];
        wishlistItems = wishlistItems.filter((item) => item.id !== itemId);
        localStorage.setItem("strideWishlist", JSON.stringify(wishlistItems));
        renderWishlist();
        window.dispatchEvent(new Event("wishlistUpdated"));

        if (window.showToast) window.showToast(`${name} added to cart!`);
      }
    });

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

          const newFirstName = db.user.fullName.split(" ")[0];
          document.getElementById("header-user-name").textContent =
            db.user.fullName;
          document.getElementById("banner-user-name").textContent =
            newFirstName;
          document.title = `${newFirstName}'s Dashboard`;

          if (!db.user.avatarUrl) {
            updateAvatarDisplay(null, db.user.fullName);
          }

          if (window.showToast)
            window.showToast("Personal Information Saved Successfully!");
        } catch (error) {
          console.error("Profile update error:", error);
          if (window.showToast)
            window.showToast("Error saving profile data.", "error");
        }
      });
    }

    // ==========================================
    // GOOGLE CONNECT LOGIC
    // ==========================================
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
            if (window.showToast)
              window.showToast("Successfully linked to Google!", "success");
            googleConnectBtn.style.display = "none";
            googleConnectStatus.style.display = "inline-flex";
            googleConnectStatus.innerHTML = `<i class="bi bi-check-circle-fill text-green"></i> Connected to Google`;
          } catch (error) {
            console.error("Google Link Error:", error);
            if (error.code === "auth/credential-already-in-use") {
              if (window.showToast)
                window.showToast(
                  "This Google account is already linked to another user.",
                  "error",
                );
            } else {
              if (window.showToast)
                window.showToast("Failed to link Google account.", "error");
            }
          }
        });
      }
    }

    // ==========================================
    // Dynamic Password Section Logic
    // ==========================================
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
          if (window.showToast)
            window.showToast(
              "Password reset link sent to your email!",
              "success",
            );
        } catch (error) {
          console.error("Forgot Password Error:", error);
          if (window.showToast)
            window.showToast(
              "Failed to send reset email. Please try again.",
              "error",
            );
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
          if (window.showToast)
            window.showToast(
              hasPassword
                ? "Password Updated Successfully!"
                : "Password Set Successfully!",
              "success",
            );
          passwordForm.reset();
        } catch (error) {
          console.error("Password Update Error:", error);
          if (window.showToast) window.showToast(error.message, "error");
        }
      });
    }

    // ==========================================
    // Delete Account Logic with Modal
    // ==========================================
    const deleteModal = document.getElementById("delete-modal");
    const triggerDeleteBtn = document.getElementById("trigger-delete-btn");
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

    if (triggerDeleteBtn && deleteModal) {
      triggerDeleteBtn.addEventListener("click", () =>
        deleteModal.classList.add("active"),
      );
      confirmDeleteBtn.addEventListener("click", async () => {
        try {
          // DELETE FROM CLOUDINARY FIRST
          const existingImageUrl = db.user.avatarUrl;
          if (existingImageUrl && existingImageUrl.includes("cloudinary")) {
            await deleteOldImageFromCloudinary(existingImageUrl);
          }

          // CLEAR LOCAL STORAGE
          localStorage.removeItem(`stride_profile_${currentUser.uid}`);
          localStorage.removeItem(`stride_dismissed_notifs_${currentUser.uid}`);

          // DELETE FROM FIREBASE
          await deleteUser(currentUser);

          if (window.showToast)
            window.showToast("Account deleted successfully.", "success");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1500);
        } catch (error) {
          console.error("Delete Account Error:", error);
          if (error.code === "auth/requires-recent-login") {
            if (window.showToast)
              window.showToast(
                "Please log out and log back in to delete your account.",
                "error",
              );
            closeAllModals();
          } else {
            if (window.showToast) window.showToast(error.message, "error");
          }
        }
      });
    }

    // ==========================================
    // Logout Logic with Modal (Sidebar button)
    // ==========================================
    const logoutModal = document.getElementById("logout-modal");
    const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
    const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");

    if (sidebarLogoutBtn && logoutModal) {
      sidebarLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logoutModal.classList.add("active");
      });
    }

    if (logoutModal && confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener("click", () => {
        window.auth
          .signOut()
          .then(() => {
            localStorage.removeItem("userRole");
            if (window.showToast)
              window.showToast("Logged out successfully!", "success");
            setTimeout(() => {
              window.location.href = "login.html";
            }, 1500);
          })
          .catch((error) => {
            console.error("Logout Error:", error);
            if (window.showToast)
              window.showToast("Error logging out.", "error");
          });
      });
    }

    // ==========================================
    // MOBILE SIDEBAR TOGGLE FIX
    // ==========================================
    const sidebar = document.getElementById("sidebar");
    const openBtn = document.getElementById("openSidebar");
    const closeBtn = document.getElementById("closeSidebar");

    if (sidebar) {
      if (openBtn) {
        openBtn.addEventListener("click", (e) => {
          e.preventDefault();
          sidebar.classList.add("active");
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          sidebar.classList.remove("active");
        });
      }
    }


  }
});
