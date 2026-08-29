// server/controllers/productController.js
const embeddingService = require('../services/embeddingService');
const redisService = require('../services/redisService');
const supabaseAdmin = require('../config/supabaseAdmin');
const { sendError } = require('../utils/safeError');

/**
 * Semantic Search using Gemini Embeddings + pgvector + Redis Cache
 */
const vectorSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: "Search query required" });
        }

        const normalizedQuery = query.trim().toLowerCase().slice(0, 100);
        const cacheKey = `search:semantic:${Buffer.from(normalizedQuery).toString('base64')}`;

        // 1. Try Redis cache first
        const cachedResults = await redisService.get(cacheKey);
        if (cachedResults !== null) {
            return res.status(200).json(cachedResults);
        }

        // 2. Generate embedding for the search query
        const embedding = await embeddingService.generateEmbedding(normalizedQuery);
        
        if (!embedding) throw new Error("Failed to generate embedding for query");

        // 3. Search Supabase using match_products RPC
        const { data: results, error: rpcError } = await supabaseAdmin.rpc('match_products', {
            query_embedding: embedding,
            match_threshold: 0.3,
            match_count: 10
        });

        if (rpcError) {
            throw rpcError;
        }

        // Cache vector search results for 10 minutes
        await redisService.set(cacheKey, results || [], 600);

        res.status(200).json(results || []);
    } catch (error) {
        return sendError(res, 500, "Vector search failed", error);
    }
};

/**
 * Synchronize a specific product's embedding
 * Protected by requireAuth, requireAdmin
 */
const syncProductEmbedding = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Product ID is required" });

        // 1. Fetch current product data
        const { data: product, error: fetchError } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // 2. Generate new embedding
        const text = embeddingService.prepareProductText(product);
        const embedding = await embeddingService.generateEmbedding(text);

        // 3. Update DB
        const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({ embedding })
            .eq('id', id);

        if (updateError) throw updateError;

        // Clear semantic search cache when products change
        await redisService.delPattern('search:semantic:*');

        res.status(200).json({ success: true, message: "Embedding synchronized" });
    } catch (error) {
        return sendError(res, 500, "Sync embedding failed", error);
    }
};

module.exports = { vectorSearch, syncProductEmbedding };
