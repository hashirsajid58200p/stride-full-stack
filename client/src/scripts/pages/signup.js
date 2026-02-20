document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // We only need to check the required terms box since HTML5 required attribute handles the rest
  const terms = document.getElementById("terms").checked;
  const password = document.getElementById("password").value;

  if (!terms) {
    showToast("Please agree to the terms and conditions", "error");
    return;
  }

  // You can add more complex validation here if needed
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  showToast("Account created successfully!", "success");

  // Redirect after 2 seconds
  setTimeout(() => {
    window.location.href = "login.html";
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
