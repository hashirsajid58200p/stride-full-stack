require('dotenv').config();
const fetch = require('node-fetch');

async function checkDimension() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    try {
        const response = await fetch(`${url}/rest/v1/products?select=embedding&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        
        const data = await response.json();
        if (data && data.length > 0 && data[0].embedding) {
            const vector = JSON.parse(data[0].embedding);
            console.log('Vector Dimension:', vector.length);
        } else {
            console.log('No embedding found or column is null.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkDimension();
