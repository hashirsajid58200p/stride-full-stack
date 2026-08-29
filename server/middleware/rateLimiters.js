// server/middleware/rateLimiters.js
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/**
 * Key generator: prefers authenticated user UID over IP address
 */
const customKeyGenerator = (req) => {
  if (req.user?.uid) return req.user.uid;
  return ipKeyGenerator(req);
};

// Global API Limiter: 150 requests per 15 minutes
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  keyGenerator: customKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Too many requests. Please try again later." },
});

// Checkout Session Limiter: 10 requests per minute
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: customKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Too many checkout requests. Please wait a moment." },
});

// AI & Groq Chat Limiter: 20 requests per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: customKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "AI assistant rate limit reached. Please wait a moment." },
});

// AI Image Generation Limiter: 6 requests per minute
const aiImageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  keyGenerator: customKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "AI generation rate limit reached. Please wait before creating more images." },
});

// Semantic Search Limiter: 25 requests per minute
const semanticSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  keyGenerator: customKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Search rate limit reached. Please slow down." },
});

// Contact & Newsletter Limiter: 5 requests per minute
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: customKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Form submission rate limit reached. Please try again in a minute." },
});

module.exports = {
  globalApiLimiter,
  checkoutLimiter,
  chatLimiter,
  aiImageLimiter,
  semanticSearchLimiter,
  submissionLimiter,
};
