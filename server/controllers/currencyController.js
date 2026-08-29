// server/controllers/currencyController.js
const redisService = require("../services/redisService");
const { sendError } = require("../utils/safeError");

exports.getExchangeRate = async (req, res) => {
  const { target } = req.query;

  if (!target || target === "USD") {
    return res.status(200).json({ rate: 1 });
  }

  const cleanTarget = String(target).trim().toUpperCase().slice(0, 5);
  const cacheKey = `currency:rate:${cleanTarget}`;

  try {
    // 1. Try Redis cache first
    const cachedRate = await redisService.get(cacheKey);
    if (cachedRate !== null) {
      return res.status(200).json({ rate: cachedRate, cached: true });
    }

    // 2. Fetch from external API with encoded param
    const encodedSymbol = encodeURIComponent(cleanTarget);
    const url = `https://api.currencybeacon.com/v1/latest?api_key=${process.env.CURRENCY_BEACON_API_KEY}&base=USD&symbols=${encodedSymbol}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(200).json({ rate: 1, note: "API fallback" });
    }

    const data = await response.json();

    if (data && data.rates && data.rates[cleanTarget]) {
      const rate = data.rates[cleanTarget];
      // Cache rate for 1 hour
      await redisService.set(cacheKey, rate, 3600);
      res.status(200).json({ rate });
    } else {
      res.status(200).json({ rate: 1 });
    }
  } catch (error) {
    console.warn("[Currency API Error]:", error.message);
    res.status(200).json({ rate: 1, error: "Currency conversion fallback active" });
  }
};

exports.detectIp = async (req, res) => {
  try {
    const { ip: queryIp } = req.query;
    let clientIp = queryIp || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "8.8.8.8";
    if (typeof clientIp === 'string' && clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    
    // Normalize localhost
    const isLocal = !clientIp || clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.includes("::ffff:127.0.0.1");
    const cacheKey = `ip:geo:${isLocal ? "local" : clientIp}`;

    // 1. Try Redis cache first
    const cachedGeo = await redisService.get(cacheKey);
    if (cachedGeo !== null) {
      return res.status(200).json({ ...cachedGeo, cached: true });
    }
    
    try {
      const encodedIp = encodeURIComponent(clientIp);
      const url = isLocal ? "https://ipapi.co/json/" : `https://ipapi.co/${encodedIp}/json/`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'Stride-App' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.currency) {
          const result = {
            success: true,
            currency: data.currency,
            country: data.country_name
          };
          // Cache geolocation for 24 hours
          await redisService.set(cacheKey, result, 86400);
          return res.status(200).json(result);
        }
      }
    } catch (apiErr) {}

    // Fallback response
    res.status(200).json({
      success: false,
      currency: "USD",
      country: "United States",
      note: "Detection fallback"
    });
  } catch (error) {
    res.status(200).json({ success: false, currency: "USD", country: "United States" });
  }
};
