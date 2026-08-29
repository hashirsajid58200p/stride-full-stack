const supabaseAdmin = require("../config/supabaseAdmin");
const redisService = require("../services/redisService");

const SITEMAP_CACHE_KEY = "cache:sitemap:xml";
const SITEMAP_TTL_SECONDS = 3600; // 1 hour
const BASE_URL = "https://stride-full-stack.vercel.app";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/products", priority: "0.9", changefreq: "daily" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/support", priority: "0.6", changefreq: "monthly" },
  { path: "/faq", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/track-order", priority: "0.7", changefreq: "always" },
];

/**
 * Generate XML sitemap for Stride
 */
exports.getSitemap = async (req, res) => {
  try {
    // 1. Check Redis cache first
    try {
      const cachedSitemap = await redisService.get(SITEMAP_CACHE_KEY);
      if (cachedSitemap) {
        res.header("Content-Type", "application/xml");
        res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
        return res.send(cachedSitemap);
      }
    } catch (cacheErr) {
      console.warn("[Sitemap] Redis cache lookup failed:", cacheErr.message);
    }

    // 2. Fetch products from Supabase
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, brand, updated_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Sitemap] Failed to query products:", error.message);
    }

    // 3. Build XML String
    const now = new Date().toISOString().split("T")[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static routes
    for (const route of STATIC_ROUTES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${route.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Add dynamic product routes
    if (products && products.length > 0) {
      for (const prod of products) {
        const slug = `${(prod.brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(prod.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${prod.id}`.replace(/^-+|-+$/g, "");
        const lastmod = (prod.updated_at || prod.created_at || now).split("T")[0];
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/products/${encodeURIComponent(slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    // 4. Save to Redis cache
    try {
      await redisService.set(SITEMAP_CACHE_KEY, xml, SITEMAP_TTL_SECONDS);
    } catch (cacheErr) {
      console.warn("[Sitemap] Failed to cache sitemap in Redis:", cacheErr.message);
    }

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.send(xml);
  } catch (err) {
    console.error("[Sitemap Error]:", err.message);
    res.status(500).send("Error generating sitemap");
  }
};
