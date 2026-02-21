const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const reviewController = require("../controllers/reviewController");
const upload = require("../middleware/upload");

// Get all reviews
router.get("/", reviewController.getAllReviews);

// User creates a review
router.post("/", protect, upload.array("images", 4), (req, res) => {
  const io = req.app.get("io");
  return reviewController.createReview(req, res, io);
});

// Like/unlike a review
router.post("/:reviewId/like", (req, res) => {
  const io = req.app.get("io");
  return reviewController.likeReview(req, res, io);
});

router.delete("/:reviewId/like", (req, res) => {
  const io = req.app.get("io");
  return reviewController.removeLike(req, res, io);
});

// Delete review (owner or admin)
router.delete("/:reviewId", (req, res) => {
  const io = req.app.get("io");
  return reviewController.deleteReview(req, res, io);
});

// Admin creates fake review
router.post('/admin/review', (req, res) => {
  const io = req.app.get("io")
  return reviewController.adminAddReview(req, res, io);
});

router.put("/:id/approve", reviewController.approveReview);
router.delete("/:id/delete", reviewController.userdelete);
router.put('/:id', upload.array('images', 5), reviewController.editReview);

module.exports = router;
