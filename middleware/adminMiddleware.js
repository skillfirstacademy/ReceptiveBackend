// middleware/adminMiddleware.js
const admin = (req, res, next) => {
  // protect middleware should already have populated req.user
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
};

module.exports = admin;
