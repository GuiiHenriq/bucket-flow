import { config } from "dotenv";
config();

import { app } from "./app";
import { startTokenRefillJob } from "./services/leakyBucket";

const PORT = process.env.PORT || 3000;

startTokenRefillJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
