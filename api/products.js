const { getSupabaseAdmin, isSupabaseConfigured } = require('./_supabase');

const starterProducts = [
  { id: 1, name: "BuyNova Everyday Pack", price_inr: 799, compare_at_price_inr: 999, category: "Essentials", stock: 100 },
  { id: 2, name: "BuyNova Urban Kit", price_inr: 999, compare_at_price_inr: 1299, category: "Lifestyle", stock: 100 },
  { id: 3, name: "BuyNova Pro Bundle", price_inr: 1799, compare_at_price_inr: 2199, category: "Premium", stock: 50 },
  { id: 4, name: "BuyNova Mini Organizer", price_inr: 599, compare_at_price_inr: 799, category: "Essentials", stock: 100 },
  { id: 5, name: "BuyNova Travel Set", price_inr: 699, compare_at_price_inr: 899, category: "Travel", stock: 75 },
  { id: 6, name: "BuyNova Daily Bottle", price_inr: 499, compare_at_price_inr: 699, category: "Lifestyle", stock: 100 },
  { id: 7, name: "BuyNova Executive Kit", price_inr: 1299, compare_at_price_inr: 1599, category: "Premium", stock: 50 },
  { id: 8, name: "BuyNova Signature Set", price_inr: 1599, compare_at_price_inr: 1999, category: "Premium", stock: 50 }
];

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  if (!isSupabaseConfigured()) {
    // Return starter catalog smoothly in local preview mode
    return res.status(200).json({ products: starterProducts, source: 'starter' });
  }

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from('products')
      .select('id,name,category,price_inr,compare_at_price_inr,stock,image_url,active')
      .eq('active', true)
      .order('id', { ascending: true });
    if (error) throw error;
    return res.status(200).json({ products: data || [] });
  } catch (e) {
    console.warn('[Products API Notice]: Using starter catalog fallback (%s)', e.message);
    return res.status(200).json({ products: starterProducts, source: 'starter_fallback' });
  }
};
