document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.toLowerCase();
  const password = document.getElementById("password").value;

  // Simulate backend auth logic for demo purposes
  if (email.includes("admin")) {
    // Logged in as Admin
    localStorage.setItem("userRole", "admin");
    showToast("Admin logged in successfully!", "success");

    setTimeout(() => {
      window.location.href = "adminDashboard.html";
    }, 2000);
  } else {
    // Logged in as Client
    localStorage.setItem("userRole", "client");
    showToast("Logged in successfully!", "success");

    setTimeout(() => {
      window.location.href = "clientDashboard.html";
    }, 2000);
  }
});

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;

  // Customize toast based on type (success, error, etc.)
  if (type === "success") {
    toast.style.borderLeftColor = "#4CAF50";
  } else {
    toast.style.borderLeftColor = "#f44336";
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
