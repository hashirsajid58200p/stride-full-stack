// server/controllers/productController.js
const embeddingService = require('../services/embeddingService');
const redisService = require('../services/redisService');

const getSupabaseConfig = () => ({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
});

/**
 * Semantic Search using Gemini Embeddings + pgvector + Redis Cache
 */
const vectorSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Search query required" });

        const normalizedQuery = query.trim().toLowerCase();
        const cacheKey = `search:semantic:${Buffer.from(normalizedQuery).toString('base64')}`;

        // 1. Try Redis cache first
        const cachedResults = await redisService.get(cacheKey);
        if (cachedResults !== null) {
            return res.status(200).json(cachedResults);
        }

        // 2. Generate embedding for the search query using upgraded service
        const embedding = await embeddingService.generateEmbedding(query);
        
        if (!embedding) throw new Error("Failed to generate embedding for query");

        // 3. Search Supabase using match_products RPC
        const { supabaseUrl, supabaseKey } = getSupabaseConfig();

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products`, {
            method: 'POST',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query_embedding: embedding,
                match_threshold: 0.3, // Lowered slightly for Gemini's broader contextual range
                match_count: 10
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Supabase RPC Error: ${errText}`);
        }

        const results = await response.json();

        // Cache vector search results for 10 minutes
        await redisService.set(cacheKey, results, 600);

        res.status(200).json(results);
    } catch (error) {
        console.error("Vector Search Error:", error.message);
        res.status(500).json({ error: "Vector Search failed", details: error.message });
    }
};

/**
 * Synchronize a specific product's embedding
 * Useful after a product is created or updated in the frontend
 */
const syncProductEmbedding = async (req, res) => {
    try {
        const { id } = req.params;
        const { supabaseUrl, supabaseKey } = getSupabaseConfig();

        // 1. Fetch current product data
        const prodRes = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}`, {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
            }
        });
        const products = await prodRes.json();
        if (!products || products.length === 0) return res.status(404).json({ error: "Product not found" });

        const product = products[0];

        // 2. Generate new embedding
        const text = embeddingService.prepareProductText(product);
        const embedding = await embeddingService.generateEmbedding(text);

        // 3. Update DB
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ embedding })
        });

        if (!updateRes.ok) throw new Error("Failed to update embedding in DB");

        // Clear semantic search cache when products change
        await redisService.delPattern('search:semantic:*');

        res.status(200).json({ success: true, message: "Embedding synchronized" });
    } catch (error) {
        console.error("Sync Embedding Error:", error.message);
        res.status(500).json({ error: "Sync failed", details: error.message });
    }
};

module.exports = { vectorSearch, syncProductEmbedding };
