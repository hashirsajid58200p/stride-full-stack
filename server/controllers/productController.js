// server/controllers/productController.js
const { pipeline } = require('@xenova/transformers');

let embedder;

// Initialize model once
const getEmbedder = async () => {
    if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
};

const vectorSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Search query required" });

        const model = await getEmbedder();
        
        // 1. Generate embedding for the search query
        const output = await model(query, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

        // 2. Search Supabase using match_products RPC
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products`, {
            method: 'POST',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query_embedding: embedding,
                match_threshold: 0.35, // Adjust sensitivity
                match_count: 10
            })
        });

        const results = await response.json();
        res.status(200).json(results);
    } catch (error) {
        console.error("Vector Search Error:", error.message);
        res.status(500).json({ error: "Vector Search failed" });
    }
};

module.exports = { vectorSearch };
