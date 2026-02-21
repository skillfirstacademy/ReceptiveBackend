// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/reviews");
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { files: 4, fileSize: 10 * 1024 * 1024 }, // Increased to 10MB per file
//   fileFilter: function (req, file, cb) {
//     const filetypes = /jpeg|jpg|png|gif/;
//     const extname = filetypes.test(
//       path.extname(file.originalname).toLowerCase()
//     );
//     const mimetype = filetypes.test(file.mimetype);

//     if (extname && mimetype) {
//       return cb(null, true);
//     } else {
//       cb(new Error("Only images (jpeg, jpg, png, gif) are allowed"));
//     }
//   },
// });

// module.exports = upload;


const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const dotenv = require("dotenv");
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for reviews
const reviewStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reviews', // All images go to Cloudinary/reviews/
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    format: async (req, file) => {
      // Auto-convert to jpg for consistency (except PNGs)
      return file.mimetype.startsWith('image/png') ? 'png' : 'jpg';
    },
    transformation: [
      { quality: 'auto' },        // Auto-optimize quality
      { fetch_format: 'auto' }    // Auto-select best format
    ]
  },
});

// Multer with Cloudinary storage
const upload = multer({
  storage: reviewStorage,
  limits: { 
    files: 5, 
    fileSize: 10 * 1024 * 1024 // 10MB per file
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png, gif) are allowed"));
    }
  },
});

module.exports = upload;