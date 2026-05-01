// server/controllers/currencyController.js

exports.getExchangeRate = async (req, res) => {
  const { target } = req.query;

  if (!target || target === "USD") {
    return res.status(200).json({ rate: 1 });
  }

  try {
    const url = `https://api.currencybeacon.com/v1/latest?api_key=${process.env.CURRENCY_BEACON_API_KEY}&base=USD&symbols=${target}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CurrencyBeacon Error (${response.status}):`, errorText);
      // Fallback to rate 1 instead of crashing with 500
      return res.status(200).json({ rate: 1, note: "API fallback" });
    }

    const data = await response.json();

    if (data && data.rates && data.rates[target]) {
      res.status(200).json({ rate: data.rates[target] });
    } else {
      console.warn(`Currency ${target} not found in rates, using fallback 1`);
      res.status(200).json({ rate: 1 });
    }
  } catch (error) {
    console.error("Critical Currency API Error:", error.message);
    res.status(200).json({ rate: 1, error: error.message });
  }
};
exports.detectIp = async (req, res) => {
  try {
    const { ip: queryIp } = req.query;
    let clientIp = queryIp || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "8.8.8.8";
    if (typeof clientIp === 'string' && clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    
    // Normalize localhost
    const isLocal = !clientIp || clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.includes("::ffff:127.0.0.1");
    
    try {
      const url = isLocal ? "https://ipapi.co/json/" : `https://ipapi.co/${clientIp}/json/`;
      
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
          return res.status(200).json({
            success: true,
            currency: data.currency,
            country: data.country_name
          });
        }
      }
    } catch (apiErr) {}

    // If we reach here, detection failed but we return 200 with fallback to avoid frontend console errors
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
