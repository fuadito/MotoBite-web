# 🍗 MotoBite — KFC Narok Food Delivery Platform

A modern, multi-role food delivery web application built for **KFC Narok**. MotoBite connects customers, kitchen staff, delivery riders, and admins in a single seamless platform with real-time order tracking and a Progressive Web App (PWA) experience.

**Live Demo:** [moto-bite-web.vercel.app](https://moto-bite-web.vercel.app)

---

## 📱 Multi-Role Architecture

MotoBite uses a **clean, multi-entry point architecture** — each role gets its own dedicated app with a unique URL, optimized for real-world workflows.

| Role | Route | Entry File | Purpose |
|------|-------|------------|---------|
| 🛒 **Customer** | `/` | `index.html` + `customer.js` | Browse menu, place orders, track status, view history |
| 👨‍💼 **Admin** | `/admin` | `admin.html` + `admin.js` | Manage users, orders, analytics, and real-time updates |
| 👨‍🍳 **Kitchen** | `/kitchen` | `kitchen.html` + `kitchen.js` | Receive orders, manage preparation, mark items ready |
| 🛵 **Rider** | `/rider` | `rider.html` + `rider.js` | Accept deliveries, manage queue, track completed trips |

All roles share a unified design system via `core.js` and `style.css`, ensuring a consistent KFC-branded experience.

---

## 🚀 Features

### Customer
- Browse the full KFC Narok menu with categories
- Add items to cart and customize orders
- Secure checkout with order confirmation
- Real-time order status tracking (Pending → Preparing → Ready → Out for Delivery → Delivered)
- View complete order history
- PWA install support for mobile app-like experience

### Admin
- Real-time dashboard with live order counts
- Manage all orders across the platform
- User management and role assignments
- Analytics and reporting overview
- Instant notifications for new orders

### Kitchen Staff
- Dedicated incoming order queue
- One-tap status updates (Accept → Preparing → Ready)
- Badge notifications for new orders
- Clear order details with item breakdowns

### Rider
- Delivery assignment queue
- Accept or decline delivery jobs
- Track active deliveries
- Completed delivery history with timestamps

### Platform-Wide
- **Multi-role authentication** via Supabase Auth
- **Real-time updates** powered by Supabase realtime channels
- **Toast notifications** for all critical actions
- **Responsive design** — works on mobile, tablet, and desktop
- **Service Worker** for offline caching and faster reloads
- **Clean URLs** — no `.html` extensions (e.g., `/rider`, `/kitchen`)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **State & Logic** | `core.js` (shared utilities, auth, API helpers) |
| **Backend** | REST API + Supabase (Authentication & Database) |
| **API Proxy** | Vercel Rewrites → `https://motobite-api.onrender.com` |
| **PWA** | Service Worker (`sw.js`), Web App Manifest |
| **Deployment** | Vercel (Static Hosting + Serverless Rewrites) |

---

## 📁 Project Structure

```
MotoBite-web/
│
├── index.html              # 🛒 Customer app entry point
├── customer.js             # Customer-specific logic
│
├── admin.html              # 👨‍💼 Admin app entry point
├── admin.js                # Admin dashboard logic
│
├── kitchen.html            # 👨‍🍳 Kitchen app entry point
├── kitchen.js              # Kitchen order management logic
│
├── rider.html              # 🛵 Rider app entry point
├── rider.js                # Rider delivery queue logic
│
├── core.js                 # 🔧 Shared utilities, auth, API client, helpers
├── style.css               # 🎨 Global styles and KFC theme
├── sw.js                   # ⚡ Service Worker for PWA caching
│
├── vercel.json             # 🔀 URL rewrites, API proxy, headers
├── site.webmanifest        # 📲 PWA manifest
│
├── public/                 # Static assets (if any)
├── favicon.ico             # Brand icons
├── favicon.svg
├── favicon-96x96.png
├── apple-touch-icon.png
├── web-app-manifest-192x192.png
├── web-app-manifest-512x512.png
│
├── README.md               # 📄 This file
└── vercel/                 # Vercel CLI metadata (auto-generated)
```

---

## 🔌 API Configuration

The app automatically routes API calls through Vercel's serverless edge:

```
Production API  →  https://motobite-api.onrender.com
Local Proxy     →  /api/*  (rewritten by Vercel to production API)
```

This setup avoids CORS issues and keeps the frontend completely static while securely proxying requests to the backend.

---

## ⚙️ Installation & Local Development

### 1. Clone the repository
```bash
git clone https://github.com/fuadito/MotoBite-web.git
cd MotoBite-web
```

### 2. Serve locally
Since this is a static site, any local server works:

**Option A — VS Code Live Server**
- Right-click `index.html` → "Open with Live Server"

**Option B — Python**
```bash
python3 -m http.server 3000
```

**Option C — Node.js (npx)**
```bash
npx serve .
```

Then open:
- Customer: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`
- Kitchen: `http://localhost:3000/kitchen.html`
- Rider: `http://localhost:3000/rider.html`

> **Note:** Clean URLs (`/admin`, `/kitchen`, `/rider`) only work when deployed on Vercel. Locally, use the `.html` versions.

---

## 🚢 Deployment

This project is configured for **zero-config deployment on Vercel**.

1. Push to GitHub (`main` branch)
2. Import `fuadito/MotoBite-web` on [vercel.com](https://vercel.com)
3. Set **Framework Preset** to `Other`
4. Leave **Build Command** and **Output Directory** empty
5. Deploy 🚀

Vercel will automatically:
- Serve clean URLs (`/rider`, `/kitchen`, `/admin`)
- Proxy `/api/*` requests to the Render backend
- Apply cache headers for optimal PWA performance

---

## 🖼️ Screenshots

| Customer | Admin | Kitchen | Rider |
|----------|-------|---------|-------|
| *(Add screenshot)* | *(Add screenshot)* | *(Add screenshot)* | *(Add screenshot)* |

---

## 🚧 Future Improvements

- [ ] M-Pesa payment integration
- [ ] Real-time order updates via WebSockets
- [ ] Google Maps delivery tracking for riders
- [ ] Admin analytics dashboard with charts
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Dark mode toggle

---

## 👨‍💻 Author

**Fuady Kimori** — [@fuadito](https://github.com/fuadito)

Frontend Developer passionate about building modern web applications and solving real-world problems through technology.

---

## 📄 License

This project is created for **educational and portfolio purposes**. All KFC branding elements are property of their respective owners.