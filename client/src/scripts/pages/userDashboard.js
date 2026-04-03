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
  // Inject the HTML loader component into the placeholders dynamically
  if (window.injectProfileLoaders) {
    await window.injectProfileLoaders();
  }

  // 1. Setup Firebase Auth Observer
  window.onAuthStateChanged(window.auth, (user) => {
    if (user) {
      initDashboard(user);
    } else {
      window.location.href = "login.html";
    }
  });

  function initDashboard(currentUser) {
    // FETCH LOCAL DATA: Get the extra details we saved during email signup/profile edits
    let extraData = { phone: "", address: "", postalCode: "", avatarUrl: "" };
    const extraDataStr = localStorage.getItem(
      `stride_profile_${currentUser.uid}`,
    );
    if (extraDataStr) {
      extraData = JSON.parse(extraDataStr);
    }

    // FIX GOOGLE OVERRIDE: Prioritize Cloudinary image over Google's default image
    let activeAvatarUrl = currentUser.photoURL;
    if (extraData.avatarUrl && extraData.avatarUrl.includes("cloudinary")) {
      activeAvatarUrl = extraData.avatarUrl;

      // Silently sync Firebase back to the Cloudinary image if Google changed it
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
      wishlist: [
        {
          id: "W1",
          name: "Nike Air Max 270",
          brand: "Nike",
          price: 150.0,
          img: "../../public/images/shoe-1.jpg",
        },
        {
          id: "W2",
          name: "Adidas Ultraboost 23",
          brand: "Adidas",
          price: 180.0,
          img: "../../public/images/shoe-2.jpg",
        },
        {
          id: "W3",
          name: "Jordan Legacy 312",
          brand: "Jordan",
          price: 199.99,
          img: "../../public/images/shoe-3.jpg",
        },
      ],
      orders: [
        {
          id: "#ORD-89012",
          date: "May 30, 2024",
          total: "$329.98",
          status: "Delivered",
          items: "Nike Air Max 270",
          img: "../../public/images/shoe-1.jpg",
        },
        {
          id: "#ORD-89011",
          date: "May 15, 2024",
          total: "$179.99",
          status: "Shipped",
          items: "Adidas Ultraboost 23",
          img: "../../public/images/shoe-2.jpg",
        },
        {
          id: "#ORD-88950",
          date: "April 02, 2024",
          total: "$129.99",
          status: "Processing",
          items: "New Balance 550",
          img: "../../public/images/shoe-4.jpg",
        },
      ],
      news: [
        {
          title: "Yeezy Restock Announced",
          desc: "Get ready for the massive restock happening this Friday. Limited pairs available.",
        },
        {
          title: "Summer Style Guide",
          desc: "Check out our top picks for keeping your rotation fresh this summer.",
        },
        {
          title: "Nike Air Max Day",
          desc: "Special exclusive drops for members only starting next week.",
        },
      ],
    };

    const firstName = db.user.fullName.split(" ")[0];
    document.title = `${firstName}'s Dashboard`;

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

      const wishHtml = db.wishlist
        .map(
          (item) => `
              <div class="wish-card">
                  <div class="card-img-wrapper">
                      <img src="${item.img}" alt="${item.name}">
                  </div>
                  <div class="card-main-info">
                      <h4>${item.name}</h4>
                      <span class="card-price">$${item.price.toFixed(2)}</span>
                  </div>
                  <div class="wish-actions">
                      <a href="checkout.html" class="btn-primary">Buy Now</a>
                      <button class="btn-outline wishlist-add-to-cart" data-id="${item.id}">Add to Cart</button>
                  </div>
              </div>
          `,
        )
        .join("");

      document.getElementById("dashboard-wishlist-preview").innerHTML =
        wishHtml;
      document.getElementById("full-wishlist-grid").innerHTML = wishHtml;

      const ordersHtml = db.orders
        .map(
          (order) => `
              <div class="dash-order-card">
                  <div class="card-img-wrapper">
                      <img src="${order.img}" alt="${order.items}">
                  </div>
                  <div class="card-main-info">
                      <h4>${order.items}</h4>
                      <p>${order.id} • ${order.date}</p>
                  </div>
                  <div class="card-footer-info">
                      <span class="card-price">${order.total}</span>
                      <span class="badge ${getStatusBadge(order.status)}">${order.status}</span>
                  </div>
              </div>
          `,
        )
        .join("");

      document.getElementById("dashboard-orders-preview").innerHTML =
        ordersHtml;
      document.getElementById("full-orders-list").innerHTML = ordersHtml;

      const newsHtml = db.news
        .map(
          (n) => `
              <div class="news-card">
                  <h4>${n.title}</h4>
                  <p>${n.desc}</p>
              </div>
          `,
        )
        .join("");
      document.getElementById("dashboard-news-list").innerHTML = newsHtml;

      document.getElementById("prof-fullname").value = db.user.fullName;
      document.getElementById("prof-email").value = db.user.email;
      document.getElementById("prof-phone").value = db.user.phone;
      document.getElementById("prof-postal").value = db.user.postalCode;
      document.getElementById("prof-address").value = db.user.address;
    }

    function getStatusBadge(status) {
      if (status === "Delivered") return "badge-success";
      if (status === "Processing") return "badge-warning";
      if (status === "Shipped") return "badge-info";
      return "";
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

    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    const viewSections = document.querySelectorAll(".view-section");

    function switchTab(target) {
      const link = document.querySelector(
        `.sidebar-nav .nav-link[data-target="${target}"]`,
      );
      if (!link) return;

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

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

    renderDashboard();

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

    const headerAvatarBtn = document.getElementById("header-avatar-btn");
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

    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".wishlist-add-to-cart");
      if (addBtn) {
        const itemId = addBtn.dataset.id;
        const itemToAdd = db.wishlist.find((item) => item.id === itemId);

        if (itemToAdd) {
          let cartItems = JSON.parse(localStorage.getItem("strideCart")) || [];
          const existingItem = cartItems.find((i) => i.name === itemToAdd.name);

          if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
          } else {
            cartItems.push({
              name: itemToAdd.name,
              brand: itemToAdd.brand,
              price: itemToAdd.price,
              img: itemToAdd.img,
              quantity: 1,
            });
          }
          localStorage.setItem("strideCart", JSON.stringify(cartItems));
          window.dispatchEvent(new Event("cartUpdated"));
          if (window.showToast)
            window.showToast(`${itemToAdd.name} added to cart!`);
        }
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

    window.showToast = function (message, type = "success") {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = message;
        toast.style.borderLeftColor =
          type === "success" ? "#4CAF50" : "#f44336";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      }
    };
  }
});
