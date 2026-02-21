const express = require("express");
const { registerUser, loginUser, createUserByAdmin,getMe, getAllUsers, deleteUser,adminLogin} = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me/:userId", getMe);

// Example protected route
router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Profile data",
    user: req.user, // because protect put it here
  });
});

router.get("/", getAllUsers);
router.delete("/delete/:id", deleteUser);

router.post("/admin/create", protect, admin, createUserByAdmin);
router.post("/admin/login", adminLogin);


module.exports = router;
