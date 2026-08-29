// server/scripts/migrate_cloudinary_folders.js
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function migrateFolder(oldFolder, newFolder) {
  console.log(`\n📂 Migrating from "${oldFolder}" to "${newFolder}"...`);
  
  let nextCursor = null;
  let totalMoved = 0;

  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${oldFolder}/`,
      max_results: 100,
      next_cursor: nextCursor,
    });

    for (const resource of res.resources) {
      const oldPublicId = resource.public_id;
      // Extract file name
      const filename = oldPublicId.replace(`${oldFolder}/`, '');
      const newPublicId = `${newFolder}/${filename}`;

      try {
        console.log(`  Moving: ${oldPublicId} -> ${newPublicId}`);
        await cloudinary.uploader.rename(oldPublicId, newPublicId, { overwrite: true });
        totalMoved++;
      } catch (err) {
        console.error(`  ❌ Error renaming ${oldPublicId}:`, err.message);
      }
    }

    nextCursor = res.next_cursor;
  } while (nextCursor);

  console.log(`✅ Moved ${totalMoved} assets from "${oldFolder}" to "${newFolder}".`);

  // Delete old root folder if empty
  try {
    await cloudinary.api.delete_folder(oldFolder);
    console.log(`🗑️ Deleted old folder "${oldFolder}".`);
  } catch (err) {
    console.warn(`  Note on deleting folder "${oldFolder}":`, err.message);
  }
}

async function updateSupabaseUrls() {
  console.log('\n🔄 Updating image URLs in Supabase...');

  // 1. Update products
  const prodRes = await fetch(`${supabaseUrl}/rest/v1/products?select=id,main_image_url`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const products = await prodRes.json();

  for (const p of products) {
    if (p.main_image_url && p.main_image_url.includes('/stride_products/')) {
      const newUrl = p.main_image_url.replace('/stride_products/', '/stride/stride_products/');
      await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${p.id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ main_image_url: newUrl })
      });
      console.log(`  Updated product ${p.id} main_image_url`);
    }
  }

  // 2. Update product_colors
  const colRes = await fetch(`${supabaseUrl}/rest/v1/product_colors?select=id,image_url`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const colors = await colRes.json();

  for (const c of colors) {
    if (c.image_url && c.image_url.includes('/stride_products/')) {
      const newUrl = c.image_url.replace('/stride_products/', '/stride/stride_products/');
      await fetch(`${supabaseUrl}/rest/v1/product_colors?id=eq.${c.id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ image_url: newUrl })
      });
    }
  }
  console.log(`  Updated ${colors.length} product_colors image URLs.`);

  console.log('✅ Supabase image URLs successfully updated!');
}

async function run() {
  console.log('🚀 Starting Cloudinary folder reorganization under "stride/"...');
  
  // 1. Migrate folders in Cloudinary
  await migrateFolder('stride_avatars', 'stride/stride_avatars');
  await migrateFolder('stride_products', 'stride/stride_products');
  await migrateFolder('stride_profiles', 'stride/stride_profiles');

  // 2. Update Supabase URLs
  await updateSupabaseUrls();

  console.log('\n🎉 ALL DONE! Check Cloudinary dashboard now.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
