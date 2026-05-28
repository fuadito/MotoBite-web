// admin.js — MotoBite Admin App Module
// ============================================
// Dependencies: core.js (must be loaded first)
// Loaded by: admin.html
// ============================================

// NOTE: Uses Supabase Auth (the ONLY role that does)
// NOTE: aOrders, aRiders are ALREADY declared in core.js — do NOT redeclare

let aPollInterval = null;
let aCurrentTab = 'overview';

// ── ADMIN AUTH ──────────────────────────────────────────────────────────────

async function adminStaffLogin() {
    const email = document.getElementById('adm-email')?.value.trim();
    const pass = document.getElementById('adm-pass')?.value;
    const err = document.getElementById('adm-err');
    const btn = document.getElementById('adm-login-btn');

    err.style.display = 'none';
    if (!email || !pass) {
        err.textContent = 'Enter email and password';
        err.style.display = 'block';
        return;
    }

    btn.innerHTML = '<span class="spin"></span> Signing in...';
    btn.disabled = true;

    try {
        const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;

        document.getElementById('s-admin-login').classList.remove('on');
        document.getElementById('s-admin').classList.add('on');
        toast('Welcome, Admin! ⚙️', 'ok');
        launchAdmin();
    } catch (e) {
        err.textContent = e.message || 'Invalid credentials';
        err.style.display = 'block';
        btn.innerHTML = 'Sign In →';
        btn.disabled = false;
    }
}

function adminSignOut() {
    supa.auth.signOut().then(() => {
        localStorage.removeItem('sb-cylzuyhdnuvmhfjudsmf-auth-token');
        if (aPollInterval) { clearInterval(aPollInterval); aPollInterval = null; }
        window.location.reload();
    });
}

// Restore admin session on page load — if Supabase session exists, skip login screen
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session } } = await supa.auth.getSession();
        if (session) launchAdmin();
    } catch(e) {
        console.warn('Admin session restore failed:', e.message);
    }
});

// ── LAUNCH ADMIN ────────────────────────────────────────────────────────────

async function launchAdmin() {    screen('s-admin');
    aTab('overview');
    startAdminRealtime();
    if (aPollInterval) clearInterval(aPollInterval);
    aPollInterval = setInterval(() => {
        if (aCurrentTab === 'orders') loadAdminOrders();
        else if (aCurrentTab === 'riders') loadAdminRiders();
        else if (aCurrentTab === 'overview') loadAdminOverview();
    }, 10000);
}

function aTab(id, btn = null) {
    aCurrentTab = id;
    document.querySelectorAll('#s-admin .sp').forEach(p => p.classList.remove('on'));
    document.getElementById('ap-' + id)?.classList.add('on');
    if (btn) {
        document.querySelectorAll('#s-admin .a-tab').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
    } else {
        // Find button by onclick content
        document.querySelectorAll('#s-admin .a-tab').forEach(b => {
            if (b.getAttribute('onclick')?.includes("'" + id + "'")) b.classList.add('on');
            else b.classList.remove('on');
        });
    }

    if (id === 'overview') renderAdminOverview();
    else if (id === 'orders') renderAdminOrders();
    else if (id === 'riders') renderAdminRiders();
    else if (id === 'menu') renderAdminMenu();
    else if (id === 'revenue') renderAdminRevenue();
    else if (id === 'staff') renderAdminStaff();
}

// ── OVERVIEW PANEL ───────────────────────────────────────────────────────────

async function renderAdminOverview() {
    await loadAdminOverview();
}

async function loadAdminOverview() {
    const [ordersRes, ridersRes] = await Promise.all([
        apiFetch('/api/admin/orders'),
        apiFetch('/api/admin/riders')
    ]);

    const orders = ordersRes?.orders || [];
    const riders = ridersRes?.riders || [];
    aOrders = orders;
    aRiders = riders;

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const cookingOrders = orders.filter(o => o.status === 'cooking').length;
    const todayOrders = orders.filter(o => {
        const d = new Date(o.created_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).length;
    const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.food_amount || 0), 0);
    const pendingRiders = riders.filter(r => r.status === 'pending').length;
    const onlineRiders = riders.filter(r => r.is_available && r.status === 'approved').length;

    document.getElementById('a-metrics').innerHTML = `
        <div class="a-met"><div class="am-v">${todayOrders}</div><div class="am-l">Today's Orders</div></div>
        <div class="a-met"><div class="am-v">${pendingOrders}</div><div class="am-l">Pending Payment</div></div>
        <div class="a-met"><div class="am-v">${cookingOrders}</div><div class="am-l">Cooking</div></div>
        <div class="a-met"><div class="am-v" style="color:var(--green)">KES ${totalRevenue.toLocaleString()}</div><div class="am-l">Total Revenue</div></div>
        <div class="a-met"><div class="am-v">${onlineRiders}</div><div class="am-l">Riders Online</div></div>
        <div class="a-met"><div class="am-v" style="color:var(--orange)">${pendingRiders}</div><div class="am-l">Pending Riders</div></div>
    `;

    // Pending rider applications
    const pendingApps = riders.filter(r => r.status === 'pending');
    document.getElementById('a-apps').innerHTML = pendingApps.length ? `
        <section class="a-sec">
            <div class="asec-t">PENDING RIDER APPLICATIONS (${pendingApps.length})</div>
            ${pendingApps.map(r => `
                <div class="a-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
                    <div>
                        <div style="font-weight:700">${r.name}</div>
                        <div style="font-size:.78rem;color:var(--muted)">${F.phone(r.phone)}</div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-sm" onclick="adminApproveRider('${r.phone}')" style="background:var(--green);color:#000">✅ Approve</button>
                        <button class="btn btn-ghost btn-sm" onclick="adminRejectRider('${r.phone}')" style="color:var(--red)">❌ Reject</button>
                    </div>
                </div>
            `).join('')}
        </section>
    ` : '';

    // Recent orders
    const recent = orders.slice(0, 5);
    document.getElementById('a-recent').innerHTML = recent.length ? recent.map(o => adminOrderRow(o)).join('') : '<div style="text-align:center;padding:20px;color:var(--muted)">No orders yet</div>';
}

// ── ORDERS PANEL ────────────────────────────────────────────────────────────

async function renderAdminOrders() {
    document.getElementById('a-orders').innerHTML = '<div style="text-align:center;padding:40px"><span class="spin"></span></div>';
    await loadAdminOrders();
}

async function loadAdminOrders() {
    const data = await apiFetch('/api/admin/orders');
    if (data?.orders) {
        aOrders = data.orders;
        renderAdminOrderList();
    } else {
        document.getElementById('a-orders').innerHTML = '<div class="empty" style="padding-top:40px"><div class="ei">📋</div><h3>NO ORDERS</h3></div>';
    }
}

function renderAdminOrderList() {
    const list = document.getElementById('a-orders');
    if (!aOrders.length) {
        list.innerHTML = '<div class="empty" style="padding-top:40px"><div class="ei">📋</div><h3>NO ORDERS</h3></div>';
        return;
    }
    list.innerHTML = aOrders.map(o => adminOrderRow(o)).join('');
}

function adminOrderRow(o) {
    const isPickup = o.order_type === 'pickup';
    const items = (o.items || []).slice(0, 2).map(i => i.name).join(', ') + (o.items?.length > 2 ? '…' : '');
    return `
    <div class="a-row" style="padding:12px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
                <span style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">${o.order_number}</span>
                <span class="badge ${F.badge(o.status)}" style="margin-left:8px">${F.status(o.status, isPickup ? 'pickup' : 'delivery')}</span>
                ${isPickup ? '<span style="background:var(--green);color:#000;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px">🚶 PICKUP</span>' : ''}
            </div>
            <span style="font-family:var(--fh);color:var(--red)">${F.money(o.food_amount)}</span>
        </div>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px">${F.date(o.created_at)} · ${o.customer_name} · ${F.phone(o.customer_phone)}</div>
        <div style="font-size:.78rem;color:var(--white);margin-bottom:8px">${items || 'No items'}</div>
        ${o.rider_name ? `<div style="font-size:.78rem;color:var(--muted);margin-bottom:6px">🏍️ ${o.rider_name} · ${F.phone(o.rider_phone)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${o.status === 'pending' ? `<button class="btn btn-sm" onclick="adminConfirmPayment(${o.id})" style="background:var(--green);color:#000">✅ Confirm Payment</button>` : ''}
            ${o.status === 'paid' ? `<button class="btn btn-sm" onclick="adminAssignRider(${o.id})" style="background:var(--blue)">🏍️ Assign Rider</button>` : ''}
            ${o.status === 'ready' && !o.rider_name ? `<button class="btn btn-sm" onclick="adminAssignRider(${o.id})" style="background:var(--blue)">🏍️ Assign Rider</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="adminCancelOrder(${o.id})" style="color:var(--red)">❌ Cancel</button>
        </div>
    </div>`;
}

async function adminConfirmPayment(orderId) {
    const res = await apiFetch(`/api/orders/${orderId}/confirm-payment`, { method: 'PUT' });
    if (res?.success) {
        toast('Payment confirmed ✅', 'ok');
        loadAdminOrders();
    } else {
        toast(res?.error || 'Failed', 'err');
    }
}

async function adminAssignRider(orderId) {
    const riders = await apiFetch('/api/rider/available') || [];
    if (!riders.length) {
        toast('No riders available', 'err');
        return;
    }
    const riderPhone = prompt(`Available riders:\n${riders.map((r, i) => `${i + 1}. ${r.name} (${r.phone})`).join('\n')}\n\nEnter phone number to assign:`);
    if (!riderPhone) return;
    const res = await apiFetch(`/api/orders/${orderId}/assign-rider`, {
        method: 'PUT',
        body: { rider_phone: F.norm(riderPhone) }
    });
    if (res?.success) {
        toast('Rider assigned 🏍️', 'ok');
        loadAdminOrders();
    } else {
        toast(res?.error || 'Failed to assign', 'err');
    }
}

async function adminCancelOrder(orderId) {
    if (!confirm('Cancel this order?')) return;
    const res = await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    if (res?.success) {
        toast('Order cancelled', 'ok');
        loadAdminOrders();
    } else {
        toast(res?.error || 'Failed', 'err');
    }
}

// ── RIDERS PANEL ────────────────────────────────────────────────────────────

async function renderAdminRiders() {
    document.getElementById('a-riders').innerHTML = '<div style="text-align:center;padding:40px"><span class="spin"></span></div>';
    await loadAdminRiders();
}

async function loadAdminRiders() {
    const data = await apiFetch('/api/admin/riders');
    aRiders = data?.riders || [];
    renderAdminRiderList();
}

function renderAdminRiderList() {
    const list = document.getElementById('a-riders');
    if (!aRiders.length) {
        list.innerHTML = '<div class="empty" style="padding-top:40px"><div class="ei">🏍️</div><h3>NO RIDERS</h3></div>';
        return;
    }

    const pending = aRiders.filter(r => r.status === 'pending');
    const approved = aRiders.filter(r => r.status === 'approved');
    const suspended = aRiders.filter(r => r.status === 'suspended');

    list.innerHTML = `
        ${pending.length ? `<div style="font-size:.75rem;font-weight:700;letter-spacing:1px;color:var(--orange);margin:0 0 8px">PENDING APPROVAL (${pending.length})</div>` : ''}
        ${pending.map(r => adminRiderCard(r)).join('')}

        ${approved.length ? `<div style="font-size:.75rem;font-weight:700;letter-spacing:1px;color:var(--green);margin:16px 0 8px">APPROVED (${approved.length})</div>` : ''}
        ${approved.map(r => adminRiderCard(r)).join('')}

        ${suspended.length ? `<div style="font-size:.75rem;font-weight:700;letter-spacing:1px;color:var(--red);margin:16px 0 8px">SUSPENDED (${suspended.length})</div>` : ''}
        ${suspended.map(r => adminRiderCard(r)).join('')}
    `;
}

function adminRiderCard(r) {
    return `
    <div class="a-row" style="padding:12px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-weight:700">${r.name}</div>
            <span class="badge ${r.status === 'approved' ? 'b-green' : r.status === 'pending' ? 'b-orange' : 'b-muted'}">${r.status.toUpperCase()}</span>
        </div>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px">${F.phone(r.phone)}</div>
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:8px">
            ⭐ ${r.rating || 'New'} · ${r.total_deliveries || 0} deliveries${r.is_available ? ' · <span style="color:var(--green)">🟢 Online</span>' : ''}
        </div>
        <div style="display:flex;gap:8px">
            ${r.status === 'pending' ? `
                <button class="btn btn-sm" onclick="adminApproveRider('${r.phone}')" style="background:var(--green);color:#000">✅ Approve</button>
                <button class="btn btn-ghost btn-sm" onclick="adminRejectRider('${r.phone}')" style="color:var(--red)">❌ Reject</button>
            ` : r.status === 'approved' ? `
                <button class="btn btn-ghost btn-sm" onclick="adminSuspendRider('${r.phone}')" style="color:var(--orange)">🚫 Suspend</button>
            ` : `
                <button class="btn btn-sm" onclick="adminApproveRider('${r.phone}')" style="background:var(--green);color:#000">✅ Re-activate</button>
            `}
        </div>
    </div>`;
}

async function adminApproveRider(phone) {
    const res = await apiFetch('/api/admin/riders/approve', {
        method: 'POST',
        body: { phone: F.norm(phone) }
    });
    if (res?.success) {
        toast('Rider approved ✅', 'ok');
        if (aCurrentTab === 'riders') loadAdminRiders();
        else if (aCurrentTab === 'overview') loadAdminOverview();
    } else {
        toast(res?.error || 'Failed', 'err');
    }
}

async function adminRejectRider(phone) {
    if (!confirm('Reject this rider application?')) return;
    const res = await apiFetch('/api/admin/riders/reject', {
        method: 'POST',
        body: { phone: F.norm(phone) }
    });
    if (res?.success) {
        toast('Rider rejected', 'ok');
        loadAdminRiders();
    } else {
        toast(res?.error || 'Failed', 'err');
    }
}

async function adminSuspendRider(phone) {
    if (!confirm('Suspend this rider?')) return;
    const res = await apiFetch('/api/admin/riders/suspend', {
        method: 'POST',
        body: { phone: F.norm(phone) }
    });
    if (res?.success) {
        toast('Rider suspended', 'ok');
        loadAdminRiders();
    } else {
        toast(res?.error || 'Failed', 'err');
    }
}

// ── MENU PANEL ──────────────────────────────────────────────────────────────

function renderAdminMenu() {
    document.getElementById('a-menu').innerHTML = `
        <div class="card" style="margin-bottom:10px">
            <div class="card-t">MENU MANAGEMENT</div>
            <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">
                Menu is currently hardcoded in core.js. To update items, edit the MENU object in core.js and redeploy.
            </p>
            <div style="font-size:.8rem;color:var(--muted);line-height:1.8">
                <strong style="color:var(--white)">Categories:</strong><br>
                ${Object.keys(MENU).map(c => `• ${c} (${MENU[c].length} items)`).join('<br>')}
            </div>
        </div>
        <div class="card" style="margin-bottom:10px">
            <div class="card-t">QUICK STATS</div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
                <span style="color:var(--muted)">Total menu items</span>
                <span style="font-weight:700">${Object.values(MENU).flat().length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem">
                <span style="color:var(--muted)">Categories</span>
                <span style="font-weight:700">${Object.keys(MENU).length}</span>
            </div>
        </div>
    `;
}

// ── REVENUE PANEL ────────────────────────────────────────────────────────────

async function renderAdminRevenue() {
    document.getElementById('a-revenue').innerHTML = '<div style="text-align:center;padding:40px"><span class="spin"></span></div>';
    const data = await apiFetch('/api/admin/orders');
    const orders = data?.orders || [];

    const completed = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completed.reduce((s, o) => s + (o.food_amount || 0), 0);
    const totalDeliveryFees = completed.reduce((s, o) => s + (o.delivery_fee || 0), 0);

    // Group by date
    const byDate = {};
    completed.forEach(o => {
        const date = new Date(o.created_at).toISOString().slice(0, 10);
        if (!byDate[date]) byDate[date] = { count: 0, revenue: 0, delivery: 0 };
        byDate[date].count++;
        byDate[date].revenue += o.food_amount || 0;
        byDate[date].delivery += o.delivery_fee || 0;
    });

    const sortedDates = Object.keys(byDate).sort().reverse().slice(0, 7);

    document.getElementById('a-revenue').innerHTML = `
        <div class="card" style="margin-bottom:10px">
            <div class="card-t">REVENUE OVERVIEW</div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
                <span style="color:var(--muted)">Total delivered orders</span>
                <span style="font-weight:700">${completed.length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
                <span style="color:var(--muted)">Food revenue</span>
                <span style="font-family:var(--fh);color:var(--green)">${F.money(totalRevenue)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem">
                <span style="color:var(--muted)">Delivery fees collected</span>
                <span style="font-family:var(--fh);color:var(--blue)">${F.money(totalDeliveryFees)}</span>
            </div>
        </div>
        <div style="font-size:.75rem;font-weight:700;letter-spacing:1px;color:var(--muted);margin:16px 0 8px">LAST 7 DAYS</div>
        ${sortedDates.map(date => {
            const d = byDate[date];
            const label = new Date(date + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
            return `
                <div class="a-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
                    <div>
                        <div style="font-weight:700">${label}</div>
                        <div style="font-size:.78rem;color:var(--muted)">${d.count} orders</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-family:var(--fh);color:var(--green)">${F.money(d.revenue)}</div>
                        <div style="font-size:.72rem;color:var(--muted)">+${F.money(d.delivery)} delivery</div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// ── STAFF PANEL ────────────────────────────────────────────────────────────

function renderAdminStaff() {
    document.getElementById('a-staff').innerHTML = `
        <div class="card" style="margin-bottom:10px">
            <div class="card-t">STAFF & SYSTEM</div>
            <div style="font-size:.84rem;color:var(--muted);line-height:1.8">
                <strong style="color:var(--white)">API Endpoint:</strong> ${API}<br>
                <strong style="color:var(--white)">Supabase:</strong> ${SUPA_URL.slice(0, 35)}...<br>
                <strong style="color:var(--white)">Current Role:</strong> ${role || 'none'}<br>
                <strong style="color:var(--white)">User:</strong> ${user.name || 'N/A'} · ${user.phone || 'N/A'}
            </div>
        </div>
        <div class="card" style="margin-bottom:10px">
            <div class="card-t">ENVIRONMENT VARIABLES NEEDED</div>
            <div style="font-size:.8rem;color:var(--muted);line-height:1.8">
                • <code>KITCHEN_CODE</code> — Kitchen staff passcode<br>
                • <code>ADMIN_EMAIL</code> / <code>ADMIN_PASSWORD</code> — Or use Supabase Auth<br>
                • <code>SUPABASE_URL</code> / <code>SUPABASE_KEY</code> — Database connection<br>
                • <code>RENDER_API_URL</code> — Your backend URL
            </div>
        </div>
        <div class="card">
            <div class="card-t">ACTIONS</div>
            <button class="btn btn-ghost btn-full" onclick="adminSignOut()" style="color:var(--red);margin-top:8px">🚪 Sign Out All Sessions</button>
        </div>
    `;
}

// ── REALTIME ─────────────────────────────────────────────────────────────────

function startAdminRealtime() {
    supa.channel('admin-orders-watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            if (aCurrentTab === 'orders') loadAdminOrders();
            else if (aCurrentTab === 'overview') loadAdminOverview();
        })
        .subscribe();
}