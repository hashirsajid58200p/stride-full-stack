document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  showToast("Logged in successfully!", "success");

  // Redirect after 2 seconds
  setTimeout(() => {
    window.location.href = "client-dashboard.html";
  }, 2000);
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
