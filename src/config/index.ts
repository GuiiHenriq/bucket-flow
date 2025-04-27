export const config = {
  server: {
    port: process.env.PORT || 3000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: "24h",
  },
  leakyBucket: {
    maxTokens: 10,
    refillInterval: 60 * 60 * 1000, // 1 hour
  },
};
