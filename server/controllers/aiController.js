// server/controllers/aiController.js

const getSmartTrackingUpdate = async (req, res) => {
  const { orderId, userCity } = req.body;

  if (!orderId || !userCity) {
    return res.status(400).json({ error: "orderId and userCity are required" });
  }

  try {
    // 1. Fetch Weather Data
    const weatherResponse = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${userCity}`
    );
    const weatherData = await weatherResponse.json();
    const weatherDesc = weatherData.current?.condition?.text || "Clear";
    const temp = weatherData.current?.temp_c || "N/A";

    // 2. Fetch Order Status from Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=status`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const orderData = await orderResponse.json();

    if (!orderData || orderData.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderStatus = orderData[0].status;

    // 3. Generate AI Response using Groq
    const prompt = `You are the Stride Logistics Officer. Current weather in ${userCity} is ${weatherDesc} with a temperature of ${temp}°C. Order status for #${orderId} is ${orderStatus}. Give a realistic, human-like update in under 50 words.`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(aiData.error?.message || "Groq API Error");
    }

    const aiMessage = aiData.choices[0].message.content;

    res.status(200).json({
      success: true,
      update: aiMessage,
      weather: { city: userCity, desc: weatherDesc, temp: temp },
      status: orderStatus,
    });
  } catch (error) {
    console.error("Smart Tracking Error:", error.message);
    res.status(500).json({ error: "Failed to generate smart tracking update", details: error.message });
  }
};

module.exports = { getSmartTrackingUpdate };
