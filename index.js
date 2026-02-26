// server.js (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const authRoutes = require("./routes/userRoute"); // your auth route
const reviewRoute = require("./routes/reviewRoute");
const protect = require("./middleware/authMiddleware"); // to verify tokens in socket if needed

const fetch = require("node-fetch");

dotenv.config();
const app = express();

// ✅ Add a simple health-check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server awake!" });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoute);

// ✅ Dynamic sitemap endpoint
app.get("/sitemap.xml", (req, res) => {
  const baseUrl = "https://www.receptivesolutions.co.in";
  // const baseUrl = " https://frontend-receptive.vercel.app/";
  // In a real app, fetch routes from DB, CMS, or API
  const pages = [
    "/",
    "/about",
    "/contact",
    "/country/uae",
    "/country/usa",
    "/country/uk",
    "/country/canada",
    "/country/europe",
    "/country/australia",
    "/country/singapore",
    "/succes_story",
    "/reviews",
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `
  <url>
    <loc>${baseUrl}${p}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
  )
  .join("")}
</urlset>`;
  res.header("Content-Type", "application/xml");
  res.send(sitemap);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io); // so controllers can access via req.app.get("io")

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  
  // Optional: allow rooms by user id, or just broadcast
  socket.on("join", (room) => {
    socket.join(room);
  });
  
  socket.on("create:review", async (payload) => {
    // If you want to handle socket-based creation, you'd verify token inside payload
    // and call controller.createReview with an ad-hoc req/res wrapper. Simpler: keep HTTP for mutations.
  });
  
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
    // ✅ Self-ping setup after server starts
    const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || `https://backend-receptive.onrender.com`;
    // const BACKEND_URL = 'http://localhost:5000' || `https://your-app-name.onrender.com`;

    const keepServerAwake = () => {
      console.log("⏰ Sending keep-alive ping...");
      fetch(`${BACKEND_URL}/api/health`)
        .then((res) => console.log("✅ Keep-alive ping sent:", res.status))
        .catch((err) => console.error("❌ Keep-alive error:", err.message));
    };

    // Ping every 10 minutes (600000 ms)
    setInterval(keepServerAwake, 600000);

    // Optional immediate first ping
    keepServerAwake();
  })
  .catch((err) => console.log(err));