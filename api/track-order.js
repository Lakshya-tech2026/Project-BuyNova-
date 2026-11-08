const { getSupabaseAdmin, isSupabaseConfigured } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const orderNumber = String(req.query?.order || '').trim().toUpperCase();
    if (!/^(BN|BUYNOVA|MS)-[A-Z0-9-]+$/i.test(orderNumber)) {
      return res.status(400).json({ error: 'Enter a valid BuyNova order number (e.g. BN-12345678)' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        order: {
          order_number: orderNumber,
          status: 'shipped',
          payment_status: 'created',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notice: 'Preview mode: order simulated successfully'
      });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db.from('orders')
      .select('order_number,status,payment_status,created_at,updated_at')
      .eq('order_number', orderNumber)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Order not found. Check the order number and try again.' });
    return res.status(200).json({ order: data });
  } catch (e) {
    console.warn('[Track Order API Warn]:', e.message);
    return res.status(500).json({ error: 'Unable to track order' });
  }
};
