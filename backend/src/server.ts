import { config } from "dotenv";
config();

import { app } from "./app";
import { startTokenRefillJob } from "./services/leakyBucket";
import { connectDB } from "./config/database";

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

startTokenRefillJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
