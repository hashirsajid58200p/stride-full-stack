// Product Page JavaScript

// Image Gallery
const thumbnails = document.querySelectorAll('.thumbnail');
const mainImage = document.getElementById('mainProductImage');

thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
        const imageSrc = thumb.getAttribute('data-image');
        mainImage.src = imageSrc;
        
        thumbnails.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
    });
});

// Size Selection
const sizeButtons = document.querySelectorAll('.size-btn');

sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sizeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Quantity Controls
let quantity = 1;
const quantityValue = document.getElementById('quantityValue');
const decreaseBtn = document.getElementById('decreaseQty');
const increaseBtn = document.getElementById('increaseQty');

decreaseBtn.addEventListener('click', () => {
    if (quantity > 1) {
        quantity--;
        quantityValue.textContent = quantity;
    }
});

increaseBtn.addEventListener('click', () => {
    quantity++;
    quantityValue.textContent = quantity;
});

// Add to Cart from Product Page
const addToCartProductBtn = document.querySelector('.btn-add-to-cart-product');
if (addToCartProductBtn) {
    addToCartProductBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        const selectedSize = document.querySelector('.size-btn.active');
        if (!selectedSize) {
            showToast('Please select a size');
            return;
        }
        
        cartCount += quantity;
        updateCartBadge();
        showToast(`${quantity} item(s) added to cart!`);
        
        // Reset quantity to 1
        quantity = 1;
        quantityValue.textContent = quantity;
    });
}
