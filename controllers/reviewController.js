const Review = require("../models/reviewModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const express = require('express');
const upload = require('../middleware/upload');
// Get all reviews
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const processed = reviews.map((r) => ({
      ...r,
      displayName: r.isFake ? r.demoName : r.author?.name,
    }));

    res.json({ success: true, reviews: processed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


const createReview = async (req, res, io) => {
  try {
    const { content, ratings } = req.body;
    const userId = req.user._id;

    // ✅ CLOUDINARY: Use file.path (full HTTPS URL) instead of /uploads/
    const imagePaths = req.files
      ? req.files.map((file) => file.path)  // https://res.cloudinary.com/.../
      : [];

    const review = await Review.create({
      author: userId,
      content,
      ratings,
      isapproved: false,
      likes: [],
      images: imagePaths, // Store the image paths
    });

    // Re-fetch with populated author name
    const populatedReview = await Review.findById(review._id).populate(
      "author",
      "name"
    );

    if (io) io.emit("newReview", populatedReview);

    res.status(201).json({ success: true, review: populatedReview });
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const editReview = async (req, res) => {
  try {
    // Get and trim the ID
    const id = req.params.id.trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID format' });
    }

    // Find the review
    const review = await Review.findById(id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const { rating, comment, existingImages } = req.body;
    
    // ✅ CLOUDINARY: Use file.path (full HTTPS URL) instead of /uploads/
    const newImages = req.files ? req.files.map(file => file.path) : [];

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Update review fields
    review.ratings = Number(rating);
    review.content = comment;
    review.isapproved = false;
    
    // ✅ Keep existing images + add new Cloudinary images
    review.images = [
      ...(existingImages ? JSON.parse(existingImages) : review.images),
      ...newImages,
    ];
    
    const updatedReview = await review.save();

    res.status(200).json({
      message: 'Review updated successfully',
      review: {
        _id: updatedReview._id,
        content: updatedReview.content,
        ratings: updatedReview.ratings,
        author: updatedReview.author,
        createdAt: updatedReview.createdAt,
        isapproved: updatedReview.isapproved,
        images: updatedReview.images, // ✅ Mix of old + new Cloudinary URLs
      },
    });
  } catch (error) {
    console.error('Error updating review:', error.message, error.stack);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid review ID format' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Like / unlike review
const likeReview = async (req, res, io) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const index = review.likes.findIndex((id) => id.equals(userId));
    if (index === -1) {
      review.likes.push(userId);
    } else {
      review.likes.splice(index, 1);
    }

    await review.save();
    const populated = await Review.findById(reviewId).populate("author", "name email");
    if (io) io.emit("review:liked", populated);

    res.json({ success: true, review: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const removeLike = async (req, res, io) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Remove the userId from likes if present
    review.likes = review.likes.filter((id) => !id.equals(userId));

    await review.save();
    const populated = await Review.findById(reviewId).populate("author", "name email");

    if (io) io.emit("review:likeRemoved", populated);

    res.json({ success: true, review: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete review (admin or owner)
const deleteReview = async (req, res, io) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });
    await Review.findByIdAndDelete(reviewId);
    if (io) io.emit("review:deleted", { reviewId });
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const adminAddReview = async (req, res, io) => {
  try {
    if (!req.body) {
      return res.status(400).json({ 
        success: false, 
        message: "Request body is missing - check middleware setup" 
      });
    }

    const { content, ratings, demoName } = req.body;

    // Validate required fields
    if (!ratings) {
      return res.status(400).json({ 
        success: false, 
        message: "Ratings is required" 
      });
    }

    const review = await Review.create({
      demoName: demoName,
      content,
      ratings,
      isFake: true,
      likes: [],
      isapproved:true,
    });

    if (io) io.emit("newReview", review);
    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error('Error in adminAddReview:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reviews/:id/approve
const approveReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the review by ID
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Update isapproved
    review.isapproved = true;
    await review.save();

    res.status(200).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const userdelete = async (req, res) => {
  try {
    // Validate reviewId
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    // Extract token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Find the review
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Delete the review
    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error.message, error.stack);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// module.exports = router;


module.exports = {
  getAllReviews,
  createReview,
  likeReview,
  deleteReview,
  adminAddReview,
  removeLike,
  approveReview,
  userdelete,
  editReview
};
