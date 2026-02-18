// Newsletter subscription
const subscribeBtn = document.getElementById('subscribeBtn');
const emailInput = document.getElementById('emailInput');

subscribeBtn.addEventListener('click', () => {
    const email = emailInput.value;
    
    if (email && email.includes('@')) {
        // Show success message
        const originalText = subscribeBtn.textContent;
        subscribeBtn.textContent = '✓ Subscribed!';
        subscribeBtn.style.background = '#10b981';
        
        // Clear input
        emailInput.value = '';
        
        // Reset button after 2 seconds
        setTimeout(() => {
            subscribeBtn.textContent = originalText;
            subscribeBtn.style.background = 'var(--primary)';
        }, 2000);
    } else {
        // Show error
        emailInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            emailInput.style.borderColor = 'rgba(255, 107, 53, 0.3)';
        }, 1500);
    }
});

// Allow enter key to submit
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        subscribeBtn.click();
    }
});

// Smooth scroll for any internal links (if added later)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
