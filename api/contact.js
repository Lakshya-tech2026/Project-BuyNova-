const { getSupabaseAdmin } = require('./_supabase');

function clean(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Honeypot for simple bot protection. Real customers leave this empty.
    if (clean(body.website, 100)) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, message: 'Your message has been received.' }));
    }

    const name = clean(body.name, 100);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 30);
    const orderNumber = clean(body.orderNumber, 80);
    const message = clean(body.message, 3000);

    if (!name || !email || !message) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Name, email and message are required.' }));
    }
    if (!validEmail(email)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
    }
    if (message.length < 5) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Please enter a little more detail in your message.' }));
    }

    const { isSupabaseConfigured } = require('./_supabase');
    if (!isSupabaseConfigured()) {
      res.statusCode = 201;
      return res.end(JSON.stringify({
        ok: true,
        message: 'Thanks! Your support request has been received (Preview mode: configure Supabase in .env for persistent storage).'
      }));
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('support_messages').insert({
      name,
      email,
      phone: phone || null,
      order_number: orderNumber || null,
      message,
      status: 'new'
    });

    if (error) throw error;

    res.statusCode = 201;
    return res.end(JSON.stringify({
      ok: true,
      message: 'Thanks! Your support request has been sent. Our team will get back to you soon.'
    }));
  } catch (error) {
    console.error('Support request error:', error);
    res.statusCode = 500;
    return res.end(JSON.stringify({
      error: 'We could not send your request right now. Please email support.buynova@gmail.com.'
    }));
  }
};
