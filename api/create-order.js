const { getSupabaseAdmin, isSupabaseConfigured } = require('./_supabase');

const starterPrices = { 1: 799, 2: 999, 3: 1799, 4: 599, 5: 699, 6: 499, 7: 1299, 8: 1599 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { items, customer, paymentMethod } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });
    if (!customer?.name || !customer?.phone || !customer?.address || !customer?.city || !customer?.pincode) {
      return res.status(400).json({ error: 'Name, phone, address, city and pincode are required' });
    }
    if (paymentMethod !== 'cod') return res.status(400).json({ error: 'The selected payment method is not available yet.' });

    // Local preview mode fallback if Supabase credentials are not yet configured
    if (!isSupabaseConfigured()) {
      let previewTotal = 0;
      for (const item of items) {
        const qty = Number(item.qty) || 1;
        const price = starterPrices[Number(item.id)] || 799;
        previewTotal += price * qty;
      }
      const orderNumber = 'BN-' + String(Date.now()).slice(-8);
      return res.status(200).json({ 
        orderNumber, 
        total: previewTotal, 
        paymentMethod: 'cod',
        notice: 'Preview order created successfully'
      });
    }

    const db = getSupabaseAdmin();
    const ids = [...new Set(items.map(x => Number(x.id)))];
    const { data: products, error: productError } = await db.from('products')
      .select('id,name,price_inr,stock,active').in('id', ids);
    if (productError) throw productError;

    const byId = new Map((products || []).map(p => [Number(p.id), p]));
    const orderItems = [];
    let total = 0;
    for (const item of items) {
      const id = Number(item.id), qty = Number(item.qty), product = byId.get(id);
      if (!product || !product.active || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        return res.status(400).json({ error: 'Invalid cart item' });
      }
      if (qty > product.stock) return res.status(400).json({ error: `${product.name} is out of stock` });
      const line = product.price_inr * qty;
      total += line;
      orderItems.push({ product_id: id, product_name: product.name, unit_price_inr: product.price_inr, quantity: qty, line_total_inr: line });
    }

    const { data: existingCustomer } = await db.from('customers').select('id').eq('phone', String(customer.phone)).limit(1).maybeSingle();
    let customerId = existingCustomer?.id;
    if (customerId) {
      const { error } = await db.from('customers').update({ name: customer.name, email: customer.email || null, address: customer.address, city: customer.city, state: customer.state || null, pincode: customer.pincode, updated_at: new Date().toISOString() }).eq('id', customerId);
      if (error) throw error;
    } else {
      const { data: newCustomer, error } = await db.from('customers').insert({ name: customer.name, email: customer.email || null, phone: String(customer.phone), address: customer.address, city: customer.city, state: customer.state || null, pincode: customer.pincode }).select('id').single();
      if (error) throw error;
      customerId = newCustomer.id;
    }

    // Reserve stock before creating the order. Restore it if a later write fails.
    const reserved = [];
    try {
      for (const item of orderItems) {
        const { data: updated, error } = await db.from('products').update({ stock: byId.get(Number(item.product_id)).stock - item.quantity, updated_at: new Date().toISOString() }).eq('id', item.product_id).gte('stock', item.quantity).select('id').maybeSingle();
        if (error || !updated) throw new Error(`${item.product_name} is no longer available in the requested quantity`);
        reserved.push(item);
      }

      const orderNumber = 'BN-' + String(Date.now()).slice(-8);
      const { data: savedOrder, error: saveError } = await db.from('orders').insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: 'pending',
        payment_status: 'created',
        subtotal_inr: total,
        total_inr: total,
        payment_method: 'cod',
        shipping_address: customer
      }).select('id,order_number').single();
      if (saveError) throw saveError;

      const rows = orderItems.map(x => ({ ...x, order_id: savedOrder.id }));
      const { error: itemError } = await db.from('order_items').insert(rows);
      if (itemError) throw itemError;
      const { error: paymentError } = await db.from('payments').insert({ order_id: savedOrder.id, provider: 'cod', amount_inr: total, status: 'created', raw_response: { method: 'cod' } });
      if (paymentError) throw paymentError;

      return res.status(200).json({ orderNumber, total, paymentMethod: 'cod' });
    } catch (inner) {
      for (const item of reserved) {
        const current = await db.from('products').select('stock').eq('id', item.product_id).single();
        if (current.data) await db.from('products').update({ stock: current.data.stock + item.quantity, updated_at: new Date().toISOString() }).eq('id', item.product_id);
      }
      throw inner;
    }
  } catch (e) {
    console.warn('[Create Order API Warn]:', e.message);
    return res.status(500).json({ error: e.message || 'Unable to place order' });
  }
};
