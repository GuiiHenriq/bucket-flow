import { config } from "dotenv";
config();

import { app } from "./app";
import { startTokenRefillJob } from "./services/redisLeakyBucket";
import { connectDB } from "./config/database";
import "./config/redis";

const PORT = process.env.PORT || 3000;

connectDB();

startTokenRefillJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
