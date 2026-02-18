// Tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remove active class from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// Search functionality
const searchInput = document.getElementById('orderSearch');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#ordersTable tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Add to cart simulation (keeping consistency with other pages)
const addButtons = document.querySelectorAll('.btn-primary');
addButtons.forEach(button => {
    if (button.textContent === 'Add New Product') {
        button.addEventListener('click', () => {
            alert('Add Product functionality would open a modal/form');
        });
    }
});

// Edit and Delete button handlers
const actionButtons = document.querySelectorAll('.btn-secondary');
actionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const action = button.textContent;
        alert(`${action} functionality would be implemented here`);
    });
});
