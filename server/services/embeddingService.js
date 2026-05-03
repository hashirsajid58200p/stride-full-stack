const { GoogleGenerativeAI } = require("@google/generative-ai");
const { pipeline } = require('@xenova/transformers');
const dotenv = require('dotenv');

dotenv.config();

class EmbeddingService {
    constructor() {
        this.genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
        this.localModel = null;
    }

    async getLocalModel() {
        if (!this.localModel) {
            this.localModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        return this.localModel;
    }

    /**
     * Generate embedding for a given text.
     * Tries Gemini first, falls back to local Transformers.
     * @param {string} text 
     * @returns {Promise<number[]>}
     */
    async generateEmbedding(text) {
        if (!text) return null;

        // Try Gemini if API key is present
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
                // We use 384 dimensionality to match existing pgvector column if needed,
                // or we can use 768 if the user upgrades the DB.
                // For now, let's assume we want to match the current 384 if we are backfilling,
                // BUT the user wants to "upgrade", so maybe we should use 768 and tell them to update DB.
                // Actually, let's use default (768 for v4) and I'll provide SQL to update DB.
                const result = await model.embedContent(text);
                return Array.from(result.embedding.values);
            } catch (err) {
                console.error("Gemini Embedding Error:", err.message);
                console.log("Falling back to local embeddings...");
            }
        }

        // Fallback to local
        try {
            const model = await this.getLocalModel();
            const output = await model(text, { pooling: 'mean', normalize: true });
            return Array.from(output.data);
        } catch (err) {
            console.error("Local Embedding Error:", err.message);
            throw new Error("Failed to generate embedding");
        }
    }

    /**
     * Prepare product text for embedding.
     * Combines name, brand, description and tags.
     */
    prepareProductText(product) {
        return `${product.name} ${product.brand} ${product.description || ''} ${product.tags || ''}`.trim();
    }
}

module.exports = new EmbeddingService();
