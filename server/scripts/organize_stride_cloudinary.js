// server/scripts/organize_stride_cloudinary.js
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

async function organizeFolder(queryExpr, targetPublicPrefix, targetAssetFolder) {
  console.log(`\n📦 Organizing assets into "${targetAssetFolder}"...`);
  
  let nextCursor = null;
  let count = 0;

  do {
    const searchRes = await cloudinary.search
      .expression(queryExpr)
      .max_results(100)
      .next_cursor(nextCursor)
      .execute();

    for (const r of searchRes.resources) {
      const oldPublicId = r.public_id;
      const filename = oldPublicId.split('/').pop();
      const newPublicId = `${targetPublicPrefix}/${filename}`;

      // 1. Rename public_id if needed
      if (oldPublicId !== newPublicId) {
        try {
          await cloudinary.uploader.rename(oldPublicId, newPublicId, { overwrite: true });
        } catch (e) {
          console.warn(`  Rename note for ${oldPublicId}:`, e.message);
        }
      }

      // 2. Set asset_folder (which controls the Cloudinary Media Library UI tree)
      try {
        await cloudinary.api.update(newPublicId, {
          asset_folder: targetAssetFolder
        });
        count++;
        console.log(`  ✓ Updated: ${newPublicId} (asset_folder: ${targetAssetFolder})`);
      } catch (e) {
        console.error(`  ❌ Failed asset_folder update for ${newPublicId}:`, e.message);
      }
    }

    nextCursor = searchRes.next_cursor;
  } while (nextCursor);

  console.log(`✅ Finished organizing ${count} assets in "${targetAssetFolder}".`);
}

async function deleteOldRootFolders() {
  console.log('\n🗑️ Removing empty legacy root folders...');
  for (const f of ['stride_avatars', 'stride_products', 'stride_profiles']) {
    try {
      const res = await cloudinary.api.delete_folder(f);
      console.log(`  ✓ Deleted root folder "${f}":`, res);
    } catch (e) {
      console.log(`  Note on root folder "${f}":`, e.message || 'Already deleted/cleared');
    }
  }
}

async function updateSupabase() {
  console.log('\n🔄 Updating Supabase URLs to clean /stride/products/ paths...');

  // 1. Update products
  const prodRes = await fetch(`${supabaseUrl}/rest/v1/products?select=id,main_image_url`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const products = await prodRes.json();

  for (const p of products) {
    if (p.main_image_url) {
      let newUrl = p.main_image_url;
      if (newUrl.includes('/stride/stride_products/')) {
        newUrl = newUrl.replace('/stride/stride_products/', '/stride/products/');
      } else if (newUrl.includes('/stride_products/')) {
        newUrl = newUrl.replace('/stride_products/', '/stride/products/');
      }

      if (newUrl !== p.main_image_url) {
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
      }
    }
  }

  // 2. Update product_colors
  const colRes = await fetch(`${supabaseUrl}/rest/v1/product_colors?select=id,image_url`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const colors = await colRes.json();

  for (const c of colors) {
    if (c.image_url) {
      let newUrl = c.image_url;
      if (newUrl.includes('/stride/stride_products/')) {
        newUrl = newUrl.replace('/stride/stride_products/', '/stride/products/');
      } else if (newUrl.includes('/stride_products/')) {
        newUrl = newUrl.replace('/stride_products/', '/stride/products/');
      }

      if (newUrl !== c.image_url) {
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
  }

  console.log('✅ Supabase database URLs updated to clean /stride/products/ paths!');
}

async function verifyFolders() {
  console.log('\n🔍 Verifying Cloudinary UI Root Folders:');
  const root = await cloudinary.api.root_folders();
  console.log('Root Folders in Cloudinary:', root.folders.map(x => x.name));

  const strideSub = await cloudinary.api.sub_folders('stride');
  console.log('Folders inside stride/:', strideSub.folders.map(x => x.name));
}

async function run() {
  console.log('🚀 Organizing Cloudinary into root "stride" folder with subfolders...');

  // Ensure folders exist
  await cloudinary.api.create_folder('stride').catch(() => {});
  await cloudinary.api.create_folder('stride/products').catch(() => {});
  await cloudinary.api.create_folder('stride/avatars').catch(() => {});
  await cloudinary.api.create_folder('stride/profiles').catch(() => {});

  // Migrate all images into stride/avatars, stride/products, stride/profiles
  await organizeFolder('public_id:stride_avatars/* OR public_id:stride/stride_avatars/* OR public_id:stride/avatars/*', 'stride/avatars', 'stride/avatars');
  await organizeFolder('public_id:stride_products/* OR public_id:stride/stride_products/* OR public_id:stride/products/*', 'stride/products', 'stride/products');
  await organizeFolder('public_id:stride_profiles/* OR public_id:stride/stride_profiles/* OR public_id:stride/profiles/*', 'stride/profiles', 'stride/profiles');

  // Delete old root folders
  await deleteOldRootFolders();

  // Update Supabase URLs
  await updateSupabase();

  // Verify
  await verifyFolders();

  console.log('\n🎉 ALL DONE! Check Cloudinary dashboard now.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
