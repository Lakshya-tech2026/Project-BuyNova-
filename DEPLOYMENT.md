# BuyNova Deployment & Publishing Guide

A complete, production-ready guide to deploy and run the **BuyNova** storefront using the built-in Node.js server and Supabase database.

---

## 1. Supabase Database Setup

1. Log in to [Supabase](https://supabase.com/) and create a project.
2. Go to the **SQL Editor** from the left navigation.
3. Open `supabase/schema.sql` from this repository, paste the entire contents into the SQL Editor, and click **Run**.
   - This creates:
     - `products` (with initial starter catalog)
     - `customers`
     - `orders`
     - `order_items`
     - `payments`
     - `support_messages` (for customer inquiries from `/contact/`)
   - Automatically enables **Row Level Security (RLS)** and configures read access for active products while protecting customer/order data.
4. Go to **Project Settings** → **API** to copy your credentials:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret key** (`SUPABASE_SECRET_KEY`) *(Keep this private; it allows the server API routes to manage orders securely).*

---

## 2. Publish to GitHub

Initialize the repository and push your project to your GitHub account:

```bash
git init
git add .
git commit -m "feat: initial commit for BuyNova website"
git branch -M main
git remote add origin https://github.com/Lakshya-tech2026/buynova.git
git push -u origin main
```

*(Replace the URL with your own GitHub repository URL).*

---

## 3. Deploying to Cloud Providers

BuyNova uses a standard `server.js` with **zero framework lock-in**, making deployment simple on any modern host.

### Option A: Render (Web Service)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New** → **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. In **Environment Variables**, add:
   - `SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
   - `SUPABASE_SECRET_KEY` = `your_server_service_role_key`
5. Click **Create Web Service**.

### Option B: Railway
1. Go to [railway.app](https://railway.app/) and click **New Project** → **Deploy from GitHub repo**.
2. Select your `buynova` repository.
3. In the project **Variables** tab, add `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
4. Railway will automatically detect `server.js` and launch your store.

### Option C: VPS (Ubuntu / Debian / EC2 / DigitalOcean)
```bash
# Clone and install
git clone https://github.com/Lakshya-tech2026/buynova.git
cd buynova
npm install

# Configure environment
cp .env.example .env
nano .env

# Run with PM2 process manager
npm install -g pm2
pm2 start server.js --name "buynova"
pm2 save
```

---

## 4. Local Testing & Verification Checklist

To test locally:
```bash
npm start
```
Visit `http://localhost:3000`.

| Check | What to test | Expected Result |
|-------|--------------|-----------------|
| 🌐 Storefront | Open root URL `/` | Hero section, products, and navigation load cleanly |
| 🏷️ Catalog | Check product grid | Supabase products display (or fallback products if Supabase is offline) |
| 🔍 Search & Filters | Type in search and switch category tabs | Instant filtering of displayed items |
| 🛒 Cart Drawer | Add items, change quantities | Cart persists in `localStorage` across page reloads |
| 💳 Checkout | Click "Proceed to checkout" | Validation requires full name, phone, address, city, and pincode |
| 📦 Cash on Delivery | Submit checkout form | Creates order, returns `BN-XXXXXX` order number, clears cart |
| 🚚 Live Order Tracking | Track the generated order number | Real-time status with 4-stage visual milestone pipeline |
| 💬 Contact & Support | Submit `/contact/` form | Successfully saved to Supabase `support_messages` |
| 📄 Policy Pages | Visit `/shipping/`, `/returns/`, `/privacy/`, `/terms/` | All pages render with proper branding, favicon, and back links |

---

## 5. Maintenance & Updates

- **Adding new products**: Insert or edit directly in the Supabase `products` table (`id`, `name`, `category`, `price_inr`, `compare_at_price_inr`, `stock`, `image_url`, `active`). The storefront automatically reflects changes immediately.
- **Reviewing support inquiries**: Check the `support_messages` table in the Supabase Table Editor.
