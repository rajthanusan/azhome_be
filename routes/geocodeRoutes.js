const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // npm install node-fetch

// GET /api/distance?from=...&to=...
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, error: "Both 'from' and 'to' addresses are required" });
  }

  try {
    const apiKey = "AIzaSyA-zRBa2CZjqV_8S80f2QJD5K6v8MLkZpg"; // Your Distance Matrix API key
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(to)}&units=metric&region=lk&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(500).json({ success: false, error: data.error_message || "API request failed" });
    }

    if (data.rows.length > 0 && data.rows[0].elements.length > 0) {
      const element = data.rows[0].elements[0];
      if (element.status === "OK") {
        return res.json({
          success: true,
          distance: element.distance.text, // e.g., "120 km"
          duration: element.duration.text  // e.g., "2 hours 30 mins"
        });
      } else {
        return res.status(404).json({ success: false, error: "No route found between the addresses" });
      }
    } else {
      return res.status(404).json({ success: false, error: "Addresses not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
