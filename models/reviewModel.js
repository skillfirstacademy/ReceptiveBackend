const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    demoName: { type: String },
    content: { type: String },
    ratings: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isFake: { type: Boolean, default: false },
    isapproved: { type: Boolean, default: false },

    // 👇 new field for optional images (0–4)
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
