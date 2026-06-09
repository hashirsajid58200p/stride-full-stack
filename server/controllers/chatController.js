// server/controllers/chatController.js

const handleChat = async (req, res) => {
  try {
    const { message, userId, userEmail } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Helper to save message
    const saveMessage = async (text, sender) => {
      try {
        await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            user_id: userId,
            text: text,
            sender: sender,
            created_at: new Date()
          })
        });
      } catch (e) {
        console.error("DB Save Error:", e.message);
      }
    };

    // 1. Fetch User Context (Orders & Products)
    let userContext = "No previous purchase history found.";
    let recommendations = "";

    try {
      if (userEmail) {
        const orderRes = await fetch(
          `${supabaseUrl}/rest/v1/orders?email=ilike.${userEmail}&select=items&limit=3`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        const orders = await orderRes.json();
        if (orders && orders.length > 0) {
          userContext = `User has previously purchased: ${orders.map(o => o.items).join(", ")}.`;
        }
      }

      const prodRes = await fetch(
        `${supabaseUrl}/rest/v1/products?select=name,price,category&limit=5&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      const products = await prodRes.json();
      if (products && products.length > 0) {
        recommendations = `Available New Arrivals: ${products.map(p => `${p.name} ($${p.price})`).join(", ")}.`;
      }
    } catch (dbError) {
      console.error("Context Fetch Error:", dbError.message);
    }

    // 2. Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemPrompt = `You are the Stride Smart Assistant. 
    User Context: ${userContext}
    Current Inventory: ${recommendations}
    Guidelines: Friendly, professional, under 60 words. Suggest items if asked.
    User Message: "${message}"`;

    // 3. Call Groq with Streaming Enabled
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: systemPrompt }],
        stream: true,
      }),
    });

    if (!groqResponse.ok) {
      const errData = await groqResponse.json();
      throw new Error(errData.error?.message || "Groq API Error");
    }

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullAiResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            res.write("data: [DONE]\n\n");
            break;
          }

          try {
            const json = JSON.parse(dataStr);
            const content = json.choices[0]?.delta?.content || "";
            if (content) {
              fullAiResponse += content;
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {}
        }
      }
    }

    // 4. Save Final AI Response to DB (Commented out: AI conversations are no longer saved to DB directly)
    /*
    if (fullAiResponse) {
      await saveMessage(fullAiResponse, "ai");
    }
    */

    res.end();
  } catch (error) {
    console.error("SSE Chat Error:", error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

module.exports = { handleChat };
