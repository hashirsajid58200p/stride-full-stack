// server/controllers/aiController.js
const cloudinary = require("cloudinary").v2;
const supabaseAdmin = require("../config/supabaseAdmin");
const { sendError } = require("../utils/safeError");

/**
 * Smart Tracking Update:
 * Protected by requireAuth. Verified that the authenticated caller owns the order or is an admin.
 */
const getSmartTrackingUpdate = async (req, res) => {
  const { orderId, userCity } = req.body;

  if (!orderId || !userCity) {
    return res.status(400).json({ error: "orderId and userCity are required" });
  }

  try {
    // 1. Fetch Order from Supabase to verify ownership
    const cleanOrderId = String(orderId).trim();
    const { data: orderData, error: dbError } = await supabaseAdmin
      .from("orders")
      .select("id, status, email, user_id, full_name")
      .eq("id", cleanOrderId)
      .maybeSingle();

    if (dbError || !orderData) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 2. IDOR Ownership Verification
    const requesterEmail = req.user?.email?.toLowerCase();
    const requesterUid = req.user?.uid;
    const isAdmin = req.user?.role === "admin";
    const isOwner =
      (orderData.email && orderData.email.toLowerCase() === requesterEmail) ||
      (orderData.user_id && orderData.user_id === requesterUid);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Access denied. You do not have permission to view this order." });
    }

    const orderStatus = orderData.status || "Processing";

    // 3. Fetch Weather Data safely with URL encoding
    const encodedCity = encodeURIComponent(String(userCity).trim().slice(0, 50));
    let weatherDesc = "Clear";
    let temp = "N/A";

    try {
      const weatherResponse = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${encodedCity}`
      );
      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        weatherDesc = weatherData.current?.condition?.text || "Clear";
        temp = weatherData.current?.temp_c || "N/A";
      }
    } catch (wErr) {
      console.warn("[Smart Tracking] Weather API fetch failed:", wErr.message);
    }

    // 4. Generate AI Response using Groq with structured prompt
    const systemPrompt = "You are the Stride Logistics Officer. Give a realistic, polite, reassuring order status delivery commentary under 45 words.";
    const userPrompt = `Current weather in ${userCity} is ${weatherDesc} with a temperature of ${temp}°C. Order #${orderData.id.substring(0, 8)} status is ${orderStatus}. Provide a brief delivery update.`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 100,
      }),
    });

    if (!groqResponse.ok) {
      throw new Error("AI delivery assistant unavailable");
    }

    const aiData = await groqResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || `Your order is currently ${orderStatus}.`;

    res.status(200).json({
      success: true,
      update: aiMessage,
      weather: { city: userCity, desc: weatherDesc, temp: temp },
      status: orderStatus,
    });
  } catch (error) {
    return sendError(res, 500, "Failed to generate smart tracking update", error);
  }
};

/**
 * AI Product Image Generation:
 * Protected by requireAuth, requireAdmin. Enforces length constraints and content safeguards.
 */
const generateProductImage = async (req, res) => {
  const { name, brand, color, category, gender, customPrompt } = req.body;

  if (!name || !brand) {
    return res.status(400).json({ error: "Product name and brand are required" });
  }

  try {
    const shoeName = String(name).trim().slice(0, 80);
    const shoeBrand = String(brand).trim().slice(0, 60);
    const shoeColor = color ? String(color).trim().slice(0, 40) : "classic";
    const shoeCategory = category ? String(category).trim().slice(0, 40) : "sneakers";
    const shoeGender = gender ? String(gender).trim().slice(0, 30) : "unisex";

    let prompt = "";

    if (customPrompt) {
      // Enforce max 300 characters
      const sanitizedCustom = String(customPrompt).trim().slice(0, 300);

      // Check for disallowed patterns
      const disallowed = /(nsfw|nude|hate|weapon|violence|illegal)/i;
      if (disallowed.test(sanitizedCustom)) {
        return res.status(400).json({ error: "Custom prompt contains disallowed content" });
      }

      prompt = sanitizedCustom;
    } else {
      prompt = `High-end commercial studio product photography of ${shoeBrand} ${shoeName} ${shoeCategory} for ${shoeGender} in ${shoeColor} colorway, side angle profile view, ultra crisp footwear details, clean solid neutral studio backdrop, professional softbox footwear lighting, 8k resolution, photorealistic shoe`;
    }

    // Audit Logging
    console.log(
      `[AI Image Gen Audit] Admin UID: ${req.user?.uid} (${req.user?.email}) generated image for "${shoeBrand} ${shoeName}"`
    );

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&model=flux&nologo=true&seed=${seed}`;

    const sanitizedSlug = `${shoeBrand}-${shoeName}-${shoeColor}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const publicId = `${sanitizedSlug}-${Date.now()}`;

    // Upload using shared configured Cloudinary client
    const uploadResult = await cloudinary.uploader.upload(aiImageUrl, {
      folder: "stride/products",
      asset_folder: "stride/products",
      public_id: publicId,
      overwrite: true,
    });

    return res.status(200).json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      prompt: prompt,
    });
  } catch (error) {
    return sendError(res, 500, "Failed to generate AI image", error);
  }
};

module.exports = { getSmartTrackingUpdate, generateProductImage };
