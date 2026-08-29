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
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
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

const generateProductImage = async (req, res) => {
  const { name, brand, color, category, gender, customPrompt } = req.body;

  if (!name || !brand) {
    return res.status(400).json({ error: "Product name and brand are required" });
  }

  try {
    const shoeColor = color || "classic";
    const shoeCategory = category || "sneakers";
    const shoeGender = gender || "unisex";

    const prompt =
      customPrompt ||
      `High-end commercial studio product photography of ${brand} ${name} ${shoeCategory} for ${shoeGender} in ${shoeColor} colorway, side angle profile view, ultra crisp footwear details, clean solid neutral studio backdrop, professional softbox footwear lighting, 8k resolution, photorealistic shoe`;

    console.log(`[AI Image Gen] Generating image for "${brand} ${name} (${shoeColor})"...`);

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&model=flux&nologo=true&seed=${seed}`;

    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const sanitizedSlug = `${brand}-${name}-${shoeColor}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const publicId = `${sanitizedSlug}-${Date.now()}`;

    const uploadResult = await cloudinary.uploader.upload(aiImageUrl, {
      folder: "stride/products",
      asset_folder: "stride/products",
      public_id: publicId,
      overwrite: true,
    });

    console.log(`[AI Image Gen] Uploaded to Cloudinary: ${uploadResult.secure_url}`);

    return res.status(200).json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      prompt: prompt,
    });
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return res.status(500).json({
      error: "Failed to generate AI image",
      details: error.message,
    });
  }
};

module.exports = { getSmartTrackingUpdate, generateProductImage };

