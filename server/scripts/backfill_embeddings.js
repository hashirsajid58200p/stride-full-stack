require('dotenv').config();
const fetch = require('node-fetch');
const embeddingService = require('../services/embeddingService');

async function backfill() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    console.log("🚀 Starting Embeddings Backfill...");

    try {
        // 1. Fetch all products
        const response = await fetch(`${url}/rest/v1/products?select=*`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const products = await response.json();

        console.log(`📦 Found ${products.length} products to process.`);

        for (const product of products) {
            console.log(`✨ Generating embedding for: ${product.name}`);
            const text = embeddingService.prepareProductText(product);
            const embedding = await embeddingService.generateEmbedding(text);

            if (embedding) {
                // 2. Update product with new embedding
                const updateRes = await fetch(`${url}/rest/v1/products?id=eq.${product.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ embedding })
                });

                if (updateRes.ok) {
                    console.log(`✅ Updated ${product.name}`);
                } else {
                    console.error(`❌ Failed to update ${product.name}:`, await updateRes.text());
                }
            }
        }

        console.log("🏁 Backfill complete!");
    } catch (err) {
        console.error("💥 Backfill failed:", err.message);
    }
}

backfill();
