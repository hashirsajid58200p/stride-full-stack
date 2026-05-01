// server/scripts/generate-embeddings.js
const { pipeline } = require('@xenova/transformers');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function run() {
    console.log("🚀 Starting Embedding Generation...");
    
    // 1. Initialize the embedding pipeline
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // 2. Fetch products
    const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id,name,description,brand`, {
        headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
        }
    });
    const products = await res.json();
    console.log(`📦 Found ${products.length} products to index.`);

    for (const p of products) {
        console.log(`🔍 Processing: ${p.name}`);
        
        // Combine text for context
        const text = `${p.name} ${p.brand} ${p.description || ''}`;
        
        // Generate embedding
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

        // Update product
        await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${p.id}`, {
            method: 'PATCH',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ embedding })
        });
    }

    console.log("✅ All products indexed with Vector Embeddings!");
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
