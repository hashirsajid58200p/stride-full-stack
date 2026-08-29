// server/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// All admin routes strictly require authentication and admin custom claim
router.use(requireAuth, requireAdmin);

// Products
router.post("/products", adminController.createProduct);
router.put("/products/:id", adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);

// Inventory
router.post("/inventory/bulk-update", adminController.bulkUpdateStock);

// Offers & Deals
router.post("/offers", adminController.createOffer);
router.delete("/offers/:id", adminController.deleteOffer);

// Orders
router.put("/orders/:id/status", adminController.updateOrderStatus);
router.put("/orders/:id/tracking", adminController.updateOrderTracking);
router.delete("/orders/:id", adminController.deleteOrder);

// Delivery Options
router.put("/delivery-options/:id", adminController.updateDeliveryOption);

// Notifications
router.put("/notifications/:id/read", adminController.markNotificationRead);
router.delete("/notifications/:id", adminController.deleteNotification);

module.exports = router;
