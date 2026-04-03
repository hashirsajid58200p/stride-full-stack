// server/controllers/currencyController.js

exports.getExchangeRate = async (req, res) => {
  const { target } = req.query; // e.g., 'PKR', 'EUR', 'GBP'

  // If no target or target is USD, the rate is exactly 1
  if (!target || target === "USD") {
    return res.status(200).json({ rate: 1 });
  }

  try {
    // Securely fetch from Currency Beacon using the hidden .env key
    const response = await fetch(
      `https://api.currencybeacon.com/v1/latest?api_key=${process.env.CURRENCY_BEACON_API_KEY}&base=USD&symbols=${target}`,
    );
    const data = await response.json();

    if (data && data.rates && data.rates[target]) {
      res.status(200).json({ rate: data.rates[target] });
    } else {
      res
        .status(400)
        .json({ error: "Currency not supported or API limit reached" });
    }
  } catch (error) {
    console.error("Currency API Error:", error);
    res.status(500).json({ error: "Failed to fetch currency rates" });
  }
};
