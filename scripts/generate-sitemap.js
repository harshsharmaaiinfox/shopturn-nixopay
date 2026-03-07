#!/usr/bin/env node
/**
 * Sitemap Generator for Shop Turn Life
 * Fetches products, blogs, brands, and store slugs from API and generates complete sitemap.xml
 * 
 * Usage: node scripts/generate-sitemap.js
 * Run before deployment to include dynamic product/blog URLs
 * 
 * Set API_URL env var to override (default: https://nixopay.com/public/api)
 * Set SITE_URL env var to override (default: https://shopturnlife.com)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = process.env.API_URL || 'https://nixopay.com/public/api';
const SITE_URL = (process.env.SITE_URL || 'https://shopturnlife.com').replace(/\/$/, '');
const OUTPUT_PATH = path.join(__dirname, '../src/sitemap.xml');

const lastmod = new Date().toISOString().split('T')[0];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllProducts() {
  const products = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${API_URL}/product?status=1&paginate=100&page=${page}`;
      const res = await fetchJson(url);
      if (res.data && res.data.length) {
        products.push(...res.data.map(p => p.slug).filter(Boolean));
        hasMore = res.current_page < res.last_page;
        page++;
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.warn(`Warning: Could not fetch products page ${page}:`, e.message);
      hasMore = false;
    }
  }
  return products;
}

async function fetchAllBlogs() {
  const blogs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${API_URL}/blog?status=1&paginate=100&page=${page}`;
      const res = await fetchJson(url);
      if (res.data && res.data.length) {
        blogs.push(...res.data.map(b => b.slug).filter(Boolean));
        hasMore = res.current_page < res.last_page;
        page++;
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.warn(`Warning: Could not fetch blogs page ${page}:`, e.message);
      hasMore = false;
    }
  }
  return blogs;
}

async function fetchAllBrands() {
  try {
    const res = await fetchJson(`${API_URL}/brand?status=1&paginate=200`);
    return (res.data || []).map(b => b.slug).filter(Boolean);
  } catch (e) {
    console.warn('Warning: Could not fetch brands:', e.message);
    return [];
  }
}

async function fetchAllStores() {
  try {
    const res = await fetchJson(`${API_URL}/store?status=1&paginate=200`);
    return (res.data || []).map(s => s.slug).filter(Boolean);
  } catch (e) {
    console.warn('Warning: Could not fetch stores:', e.message);
    return [];
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, changefreq, priority) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

// Static URLs - same as sitemap.xml base
const staticUrls = [
  { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/collections`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${SITE_URL}/blogs`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/about-us`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE_URL}/Contact-Us`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE_URL}/privacy-policy`, changefreq: 'yearly', priority: '0.5' },
  { loc: `${SITE_URL}/term-condition`, changefreq: 'yearly', priority: '0.5' },
  { loc: `${SITE_URL}/return-policy`, changefreq: 'yearly', priority: '0.5' },
  { loc: `${SITE_URL}/refund-and-cancellation`, changefreq: 'yearly', priority: '0.5' },
  { loc: `${SITE_URL}/shipping-policy`, changefreq: 'yearly', priority: '0.5' },
  { loc: `${SITE_URL}/faq`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE_URL}/offers`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${SITE_URL}/order/tracking`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE_URL}/search`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${SITE_URL}/become-a-supplier`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE_URL}/investor-relations`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE_URL}/seller/stores`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${SITE_URL}/seller/become-seller`, changefreq: 'monthly', priority: '0.5' },
];

// Categories from API structure (matches sitemap.xml)
const categorySlugs = [
  'active-style', 'gym-training', 'leggings', 'tank-tops', 'stringers', 'compression-wear',
  'sports-performance', 'jerseys', 'tracksuits', 'gym-shorts', 'men-s-collection', 'men-s-western-wear',
  'jeans', 'shirt', 'shorts', 'suit-sets', 'track-suits', 'pants', 't-shirts', 'men-s-ethnic-wear',
  'ethnic-jackets', 'sherwani-sets', 'kurtas', 'pyjamas-churidars', 'ethnic-suit-sets', 'men-s-innerwear',
  'boxers', 'briefs', 'trunks', 'winter-essentials', 'women-s-collection', 'women-s-western-wear',
  'dresses', 'women-s-jeans', 'tops', 'trousers-pants', 'women-s-t-shirts', 'women-s-shirts',
  'women-s-leggings', 'co-ord-sets', 'women-s-ethnic-wear', 'dresses-gowns', 'kurta-suit-sets',
  'kurta-bottom-sets', 'kurtis', 'lehenga-choli-sets', 'salwars-churidars', 'sarees', 'women-s-innerwear',
  'bras', 'night-shirts-nighties', 'panties', 'shapewear', 'pyjamas-shorts'
];

async function main() {
  console.log('Generating sitemap for', SITE_URL);
  console.log('Fetching dynamic content from API...');

  const [products, blogs, brands, stores] = await Promise.all([
    fetchAllProducts(),
    fetchAllBlogs(),
    fetchAllBrands(),
    fetchAllStores()
  ]);

  console.log(`Found: ${products.length} products, ${blogs.length} blogs, ${brands.length} brands, ${stores.length} stores`);

  const urls = [];

  // Static + Categories
  staticUrls.forEach(u => urls.push(urlEntry(u.loc, u.changefreq, u.priority)));
  categorySlugs.forEach(slug => urls.push(urlEntry(`${SITE_URL}/category/${slug}`, 'weekly', '0.8')));

  // Products
  const seenProducts = new Set();
  products.forEach(slug => {
    const clean = (slug || '').toLowerCase().trim();
    if (clean && !seenProducts.has(clean)) {
      seenProducts.add(clean);
      urls.push(urlEntry(`${SITE_URL}/product/${clean}`, 'weekly', '0.7'));
    }
  });

  // Blogs
  const seenBlogs = new Set();
  blogs.forEach(slug => {
    const clean = (slug || '').toLowerCase().trim();
    if (clean && !seenBlogs.has(clean)) {
      seenBlogs.add(clean);
      urls.push(urlEntry(`${SITE_URL}/blog/${clean}`, 'monthly', '0.6'));
    }
  });

  // Brands
  brands.forEach(slug => {
    const clean = (slug || '').toLowerCase().trim();
    if (clean) urls.push(urlEntry(`${SITE_URL}/brand/${clean}`, 'weekly', '0.7'));
  });

  // Seller stores
  stores.forEach(slug => {
    const clean = (slug || '').toLowerCase().trim();
    if (clean) urls.push(urlEntry(`${SITE_URL}/seller/store/${clean}`, 'weekly', '0.6'));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log(`Sitemap written to ${OUTPUT_PATH} (${urls.length} URLs)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
