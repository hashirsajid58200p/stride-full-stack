require('dotenv').config();
const fetch = require('node-fetch');

async function checkSchema() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    
    console.log('Checking Supabase at:', url);
    
    try {
        const response = await fetch(`${url}/rest/v1/products?select=*&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        
        const data = await response.json();
        if (data && data.length > 0) {
            console.log('COLUMNS_START');
            console.log(Object.keys(data[0]).join(', '));
            console.log('COLUMNS_END');
        } else {
            console.log('No products found or error:', data);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkSchema();
