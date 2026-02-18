document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    showToast('Logged in successfully!', 'success');
    
    // Redirect after 2 seconds
    setTimeout(() => {
        window.location.href = 'client-dashboard.html';
    }, 2000);
});

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderColor = type === 'success' ? '#4CAF50' : '#f44336';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
