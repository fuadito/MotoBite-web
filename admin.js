

// ADMIN APP
function launchAdmin(){
  screen('s-admin');
  renderAdminOverview();

  // Subscribe to both INSERT (new orders) and UPDATE (status changes)
  supa.channel('admin-orders-watch').unsubscribe().catch(()=>{});
  supa.channel('admin-orders-watch')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},()=>{
      if(document.getElementById('ap-orders')?.classList.contains('on')) renderAdminOrders();
      renderAdminOverview();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},()=>{
      if(document.getElementById('ap-orders')?.classList.contains('on')) renderAdminOrders();
      renderAdminOverview();
    })
    .subscribe();

  // 20-second polling fallback for when Realtime blips
  if(window._adminPollTimer) clearInterval(window._adminPollTimer);
  window._adminPollTimer = setInterval(()=>{
    if(document.getElementById('ap-orders')?.classList.contains('on')) renderAdminOrders();
    renderAdminOverview();
  }, 20000);
}

function aTab(id,btn){
  document.querySelectorAll('#s-admin .sp').forEach(p=>p.classList.remove('on'));
  document.getElementById(`ap-${id}`)?.classList.add('on');
  if(btn){ document.querySelectorAll('.a-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
  if(id==='overview') renderAdminOverview();
  else if(id==='orders') renderAdminOrders();
  else if(id==='riders') renderAdminRiders();
  else if(id==='menu') renderAdminMenu();
  else if(id==='revenue') renderAdminRevenue();
  else if(id==='customers') renderAdminCustomers();
  else if(id==='staff') renderAdminStaff();
}

async function renderAdminOverview() {
  const stats=await apiFetch('/api/admin/stats')||null;
  const active=DEMO_ORDERS_A.filter(o=>!['delivered','cancelled'].includes(o.status)).length;
  const done=DEMO_ORDERS_A.filter(o=>o.status==='delivered').length;
  document.getElementById('a-metrics').innerHTML=`
   <div class="a-mc"><div class="a-mc-ico">📦</div><div class="a-mc-v" style="color:var(--red)">${stats?.active_orders||active}</div><div class="a-mc-l">Active Orders</div></div>
    <div class="a-mc"><div class="a-mc-ico">✅</div><div class="a-mc-v">${stats?.delivered_today||done}</div><div class="a-mc-l">Done Today</div></div>
    <div class="a-mc"><div class="a-mc-ico">💰</div><div class="a-mc-v" style="color:var(--green)">KES ${(stats?.revenue_today||(done*580)).toLocaleString()}</div><div class="a-mc-l">Revenue Today</div></div>
    <div class="a-mc"><div class="a-mc-ico">🏍️</div><div class="a-mc-v">${stats?.online_riders||2}</div><div class="a-mc-l">Online Riders</div></div>`;
  // FIX: fetch real recent orders from the API — DEMO_ORDERS_A is always empty
  const recentData = await apiFetch('/api/admin/orders');
  const recent = (recentData?.orders || []).slice(0, 5);
  document.getElementById('a-recent').innerHTML = recent.length
    ? recent.map(o=>orderRow(o, true)).join('')
    : '<div class="empty"><div class="ei">📦</div><h3>NO RECENT ORDERS</h3></div>';

    // add app launcher section
document.getElementById('a-apps').innerHTML = `
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
    <button onclick="window.open('?role=kitchen','_blank')" class="app-launcher" style="background:#ff6b35;">
      🍗 Kitchen App
    </button>
    <button onclick="window.open('?role=rider','_blank')" class="app-launcher" style="background:#4ecdc4;">
      🏍️ Rider App
    </button>
    <button onclick="window.open('/','_blank')" class="app-launcher" style="background:#45b7d1;">
      🛒 Customer App
    </button>
  </div>
`;
}

// Track current filter globally
let adminOrderFilter = 'all';

async function renderAdminOrders(page = 1, statusFilter = adminOrderFilter) {
  adminOrderFilter = statusFilter; // Update global tracker
  
  // Build query params
  const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
  const data = await apiFetch(`/api/admin/orders?page=${page}&limit=20${statusParam}`);

  // Filter tabs HTML
  const filterTabs = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      <button onclick="renderAdminOrders(1,'all')" class="filter-pill ${statusFilter === 'all' ? 'active' : ''}">All</button>
      <button onclick="renderAdminOrders(1,'pending')" class="filter-pill ${statusFilter === 'pending' ? 'active' : ''}">⏳ Pending</button>
      <button onclick="renderAdminOrders(1,'paid')" class="filter-pill ${statusFilter === 'paid' ? 'active' : ''}">💳 Paid</button>
      <button onclick="renderAdminOrders(1,'cooking')" class="filter-pill ${statusFilter === 'cooking' ? 'active' : ''}">🔥 Cooking</button>
      <button onclick="renderAdminOrders(1,'ready')" class="filter-pill ${statusFilter === 'ready' ? 'active' : ''}">📦 Ready</button>
      <button onclick="renderAdminOrders(1,'delivered')" class="filter-pill ${statusFilter === 'delivered' ? 'active' : ''}">✅ Delivered</button>
      <button onclick="renderAdminOrders(1,'cancelled')" class="filter-pill ${statusFilter === 'cancelled' ? 'active' : ''}" style="${statusFilter === 'cancelled' ? 'background:#3a1a1a;color:#f87171;border-color:#f87171;' : 'color:#f87171;border-color:#f87171;'}">❌ Cancelled</button>
    </div>
  `;

  // Pagination HTML (build separately to append after orders)
  let paginationHtml = '';
  if (data.pagination?.totalPages > 1) {
    paginationHtml = `
      <div style="display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;">
        <button ${!data.pagination?.hasPrev ? 'disabled' : ''} onclick="renderAdminOrders(${page - 1},'${statusFilter}')" class="btn btn-ghost btn-sm">← Prev</button>
        <span style="font-size:.85rem;color:var(--muted);">Page ${page} of ${data.pagination.totalPages}</span>
        <button ${!data.pagination?.hasNext ? 'disabled' : ''} onclick="renderAdminOrders(${page + 1},'${statusFilter}')" class="btn btn-ghost btn-sm">Next →</button>
      </div>
    `;
  }

  // Render orders (NO filter here — backend handles it via status param)
  const orders = data.orders || [];
  
  document.getElementById('a-orders').innerHTML = filterTabs + (
    orders.length
      ? orders.map(o => orderRow(o)).join('') + paginationHtml
      : '<div class="empty"><div class="ei">📦</div><h3>NO ORDERS FOUND</h3></div>'
  );
}


async function renderAdminStaff() {
  const el = document.getElementById('a-staff');
  if (!el) return;

  // Fetch all staff
  const staff = await apiFetch('/api/admin/staff') || [];

  el.innerHTML = `
    <div class="staff-header">
      <h2>👥 Staff Management</h2>
      <button onclick="showCreateStaffModal()" class="btn-primary">+ Add Staff</button>
    </div>
    
    <div class="staff-tabs">
      <button onclick="filterStaff('all')" class="active">All</button>
      <button onclick="filterStaff('kitchen')">🍗 Kitchen</button>
      <button onclick="filterStaff('rider')">🏍️ Riders</button>
      <button onclick="filterStaff('admin')">🔐 Admins</button>
    </div>

    <div class="staff-list">
      ${staff.map(s => `
        <div class="staff-row" data-role="${s.role}">
          <div class="staff-info">
            <strong>${s.name}</strong>
            <span class="role-badge role-${s.role}">${s.role}</span>
            <div class="staff-meta">${s.email} · ${s.phone || 'No phone'}</div>
            <div class="staff-meta">Last login: ${s.last_login_at ? F.date(s.last_login_at) : 'Never'}</div>
          </div>
          <div class="staff-actions">
            <button onclick="resetStaffPassword('${s.id}', '${s.name}')" class="btn-sm">Reset Password</button>
            <button onclick="toggleStaffStatus('${s.id}', ${s.is_active})" class="btn-sm ${s.is_active ? 'btn-warn' : 'btn-success'}">
              ${s.is_active ? 'Suspend' : 'Activate'}
            </button>
            <button onclick="deleteStaff('${s.id}', '${s.name}')" class="btn-sm btn-danger">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function showCreateStaffModal() {
 const onSubmit = async () => {
    const name = document.getElementById('staff-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const phone = document.getElementById('staff-phone').value.trim();
    const role = document.getElementById('staff-role').value;

    if (!name || !email || !role) {
      toast('Name, email, and role are required', 'err');
      return;
    }

    // Show loading
    const btn = document.getElementById('create-staff-btn');
    btn.innerHTML = '⏳ Creating...';
    btn.disabled = true;

    const res = await apiFetch('/api/staff/create', {
      method: 'POST',
      body: { name, email, phone: phone || null, role }
    });

    btn.innerHTML = '+ Add Staff';
    btn.disabled = false;

    if (res?.success) {
      // Show result modal
      let resultHtml = `
        <div class="modal-overlay" onclick="this.remove()">
          <div class="modal-card">
            <h3>✅ Staff Created</h3>
            <p><strong>${res.staff.name}</strong> (${res.staff.role})</p>
            <p>Email: ${res.staff.email}</p>
      `;
      
      if (res.staff.phone) {
        resultHtml += `
          <p style="color: var(--green);">📱 Credentials sent via SMS to ${res.staff.phone}</p>
        `;
      } else if (res.tempPassword) {
        resultHtml += `
          <div style="background: var(--bg2); padding: 12px; border-radius: 8px; margin: 12px 0;">
            <p style="color: var(--red); font-size: 12px;">⚠️ No phone — share manually:</p>
            <p style="font-family: monospace; font-size: 14px;">${res.tempPassword}</p>
            <button onclick="navigator.clipboard.writeText('${res.tempPassword}');toast('Copied','ok')" 
              style="margin-top: 8px; font-size: 12px;">Copy Password</button>
          </div>
        `;
      }
      
      resultHtml += `<button onclick="this.closest('.modal-overlay').remove()" class="btn-primary">Done</button></div></div>`;
      
      document.body.insertAdjacentHTML('beforeend', resultHtml);
      renderAdminStaff();
    } else {
      toast(res?.error || 'Failed to create staff', 'err');
    }
  };
}

async function adminStaffLogin() {
  const email = document.getElementById('adm-email').value.trim();
  const pass  = document.getElementById('adm-pass').value;
  const err   = document.getElementById('adm-err');
  const btn   = document.getElementById('adm-login-btn');

  err.style.display = 'none';
  if (!email || !pass) {
    err.textContent = 'Enter email and password';
    err.style.display = 'block'; return;
  }
  btn.innerHTML = '⏳ Signing in...'; btn.disabled = true;

  const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
  btn.innerHTML = 'Sign In →'; btn.disabled = false;

  if (error || !data.session) {
    err.textContent = error?.message || 'Invalid credentials';
    err.style.display = 'block'; return;
  }
  launchAdmin();
}

async function adminSignOut() {
  await supa.auth.signOut();
  if (window._adminPollTimer) clearInterval(window._adminPollTimer);
  document.getElementById('s-admin').classList.remove('on');
  document.getElementById('s-admin-login').classList.add('on');
}
function orderRow(o) {
  const items = (o.items || []).slice(0, 2).map(i => i.name).join(', ') + (o.items?.length > 2 ? '…' : '');
  const isPickup = o.order_type === 'pickup';
  const isCancelled = o.status === 'cancelled';
  
  const typeBadge = isPickup
    ? `<span style="background:#1a3a2a;color:#4ade80;border:1px solid #4ade80;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:5px;letter-spacing:.5px;margin-left:6px;vertical-align:middle">🏃 SELF-PICKUP</span>`
    : `<span style="background:#1a1a3a;color:#60a5fa;border:1px solid #60a5fa;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:5px;letter-spacing:.5px;margin-left:6px;vertical-align:middle">🛵 DELIVERY</span>`;

  // Build action buttons based on status
  let actions = '';
  
  if (o.status === 'pending') {
    // Pending: Mark Paid + Reject
    actions = `
      <button class="btn btn-ghost btn-sm" style="margin-top:6px;color:var(--green);font-size:.75rem;display:block;width:100%;" 
        onclick="markOrderPaid('${o.order_number}','${o.id}','${o.order_type || 'delivery'}')">✅ Mark as Paid</button>
      <button class="btn btn-ghost btn-sm" style="margin-top:4px;color:var(--red);font-size:.75rem;display:block;width:100%;" 
        onclick="rejectOrder('${o.order_number}',${o.id})">🚫 Reject Order</button>
    `;
  } else if (isCancelled) {
    // Cancelled: Show who cancelled and reason
    actions = `
      <div style="margin-top:6px;font-size:.7rem;color:var(--red);line-height:1.4;">
        ❌ Cancelled${o.cancelled_by ? ` by <strong>${escapeHtml(o.cancelled_by)}</strong>` : ''}
        ${o.cancellation_reason ? `<br>Reason: ${escapeHtml(o.cancellation_reason)}` : ''}
        ${o.cancelled_at ? `<br><span style="color:var(--muted);">${F.date(o.cancelled_at)}</span>` : ''}
      </div>
    `;
  }

  // Status badge color override for cancelled
  const badgeStyle = isCancelled 
    ? 'background:#3a1a1a !important;color:#f87171 !important;border-color:#f87171 !important;' 
    : '';

  return `<div class="o-row" style="${isCancelled ? 'opacity:.55;' : ''}">
    <div class="or-l">
      <div class="or-num">${o.order_number}${typeBadge}</div>
      <div class="or-m">${o.customer_name ? o.customer_name + ' · ' : ''}${items} · ${o.customer_area || 'Narok'} · ${F.date(o.created_at)}</div>
      ${o.mpesa_reference
        ? `<div style="font-size:.72rem;color:var(--green);font-weight:600;margin-top:3px">💳 ${o.mpesa_reference}</div>`
        : `<div style="font-size:.72rem;color:var(--orange);margin-top:3px">⏳ No payment proof</div>`
      }${o.rider_phone
        ? `<div style="font-size:.72rem;color:var(--blue);margin-top:2px">🏍️ ${o.rider_name || o.rider_phone}</div>`
        : ''}
    </div>
    <div class="or-r">
      <div class="or-p">${F.money(o.food_amount)}</div>
      <span class="badge ${F.badge(o.status)}" style="margin-top:3px;${badgeStyle}">${isCancelled ? 'CANCELLED' : F.status(o.status)}</span>
      ${actions}
    </div>
  </div>`;
}


async function markOrderPaid(num, id, orderType) {
  if(!confirm(`Confirm payment received for ${num}?`)) return;
  const result = await apiFetch(`/api/admin/orders/${id}/mark-paid`, {method:'POST'});
  if(result?.success){
    const isPickup = result.isPickup || orderType === 'pickup';
    showPinOnceModal(num, result.pin, isPickup);
    await renderAdminOrders();
  } else {
    toast(`Could not mark ${num} as paid — try again`, 'err');
  }
}

async function rejectOrder(orderNum, id) {
  const reason = prompt(`Reject order ${orderNum}?\n\nEnter reason (or leave blank):`, 'Payment not received');
  if (reason === null) return; // user cancelled

  if (!confirm(`Reject ${orderNum}?\nReason: ${reason || 'Payment not received'}`)) return;

  const res = await apiFetch(`/api/admin/orders/${id}/reject`, {
    method: 'POST',
    body: { reason: reason || 'Payment not received' }
  });

  if (res?.success) {
    toast(`Order ${orderNum} rejected`, 'warn');
    renderAdminOrders();
    renderAdminOverview();
  } else {
    toast(res?.error || 'Could not reject order', 'err');
  }
}

function showPinOnceModal(orderNum, pin, isPickup){
  // Remove any existing modal
  document.getElementById('pin-once-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`
    <div id="pin-once-modal" style="
      position:fixed;inset:0;background:rgba(0,0,0,.75);
      display:flex;align-items:center;justify-content:center;z-index:3000">
      <div style="
        background:var(--dark2);border-radius:18px;padding:28px 24px;
        max-width:340px;width:92%;text-align:center;border:1px solid var(--line2)">
        <div style="font-size:2.5rem;margin-bottom:8px">${isPickup ? '🏃' : '✅'}</div>
        <div style="font-family:var(--fh);font-size:1.1rem;letter-spacing:2px;margin-bottom:4px">${isPickup ? 'PICKUP ORDER — PAYMENT CONFIRMED' : 'ORDER MARKED AS PAID'}</div>
        <div style="font-size:.82rem;color:var(--muted);margin-bottom:20px">Order: <strong style="color:var(--white)">${orderNum}</strong></div>
        <div style="background:var(--dark3);border:2px solid var(--red);border-radius:12px;padding:18px;margin-bottom:16px">
          <div style="font-size:.72rem;color:var(--muted);letter-spacing:1px;margin-bottom:6px">🏃 SELF-PICKUP ORDER</div>
          <div style="font-size:.84rem;color:var(--white);line-height:1.5">
            Customer will collect at the counter.<br>
            Kitchen has been notified to prepare this order.
          </div>
          <div style="font-family:var(--fh);font-size:3rem;letter-spacing:12px;color:var(--red)">${pin}</div>
          <div style="font-size:.73rem;color:var(--muted);margin-top:8px">Sent to customer via SMS</div>
        </div>
        <div style="font-size:.75rem;color:var(--orange);margin-bottom:18px">
          ⚠️ This PIN will <strong>not</strong> be shown again. The customer received it by SMS.
        </div>
        <button onclick="document.getElementById('pin-once-modal').remove()"
          style="background:var(--red);color:#fff;border:none;border-radius:10px;
                 padding:12px 28px;font-family:var(--fh);font-size:.9rem;
                 letter-spacing:1px;cursor:pointer;width:100%">
          Got it — Close
        </button>
      </div>
    </div>`);
}


async function renderAdminRiders(){
  const [pendingData, approvedData, suspendedData] = await Promise.all([
    apiFetch('/api/admin/riders/pending'),
    apiFetch('/api/admin/riders/approved'),
    apiFetch('/api/admin/riders/suspended'),
  ]);
  const pending   = pendingData   || [];
  const approved  = approvedData  || [];
  const suspended = suspendedData || [];

  const getImgUrl = async (path) => {
    if(!path) return null;
    const { data } = await supa.storage.from('rider-docs').createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  // Pending — full doc review cards
  const pendingCards = await Promise.all(pending.map(async r => {
    const idUrl      = await getImgUrl(r.id_photo_url);
    const licUrl     = await getImgUrl(r.license_photo_url);
    const selfieUrl  = await getImgUrl(r.selfie_url);
    return `
      <div class="rider-rev" id="rr-${r.phone}">
        <div class="rr-top">
          <div class="rr-av">👤</div>
          <div>
            <div class="rr-name">${r.name||'Unknown'}</div>
            <div class="rr-phone">${F.phone(r.phone)} · Applied ${F.date(r.created_at)}</div>
          </div>
        </div>
        <div class="doc-row">
          ${r.id_photo_url ? `<div class="dc"><img src="${idUrl}" style="width:100%;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"/><div style="font-size:.7rem;color:var(--muted);margin-top:4px">National ID</div></div>` : '<div class="dc"><span class="dc-e">🪪</span>No ID uploaded</div>'}
          ${r.license_photo_url ? `<div class="dc"><img src="${licUrl}" style="width:100%;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"/><div style="font-size:.7rem;color:var(--muted);margin-top:4px">License</div></div>` : '<div class="dc"><span class="dc-e">🚗</span>No License uploaded</div>'}
          ${r.selfie_url ? `<div class="dc"><img src="${selfieUrl}" style="width:100%;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"/><div style="font-size:.7rem;color:var(--muted);margin-top:4px">Selfie</div></div>` : '<div class="dc"><span class="dc-e">🤳</span>No Selfie uploaded</div>'}
        </div>
        <div class="rr-btns">
          <button class="btn btn-green btn-full btn-sm" onclick="approveRider('${r.phone}')">✅ Approve Rider</button>
          <button class="btn btn-danger btn-sm" onclick="rejectRider('${r.phone}')">Reject</button>
        </div>
      </div>`;
  }));

  // Approved — compact rows with suspend button
  const approvedRows = approved.map(r => `
    <div class="o-row" id="rr-${r.phone}">
      <div class="or-l">
        <div class="or-num">🏍️ ${r.name||'Unknown'}</div>
        <div class="or-m">${F.phone(r.phone)} · ⭐ ${r.rating||'New'} · ${r.total_deliveries||0} deliveries · ${r.is_available?'<span style="color:var(--green)">🟢 Online</span>':'⚪ Offline'}</div>
      </div>
      <div class="or-r">
        <button class="btn btn-ghost btn-sm" style="color:var(--orange);font-size:.73rem;border:1px solid var(--orange)"
          onclick="suspendActiveRider('${r.phone}','${r.name||'this rider'}')">🚫 Suspend</button>
      </div>
    </div>`).join('');

  // Suspended — compact rows with reinstate button
  const suspendedRows = suspended.map(r => `
    <div class="o-row" id="rr-${r.phone}" style="border-left:3px solid var(--red)">
      <div class="or-l">
        <div class="or-num" style="color:var(--red)">🚫 ${r.name||'Unknown'}</div>
        <div class="or-m">${F.phone(r.phone)} · Suspended</div>
      </div>
      <div class="or-r">
        <button class="btn btn-green btn-sm" onclick="unsuspendRider('${r.phone}','${r.name||'this rider'}')">✅ Reinstate</button>
      </div>
    </div>`).join('');

  document.getElementById('a-riders').innerHTML = `
    <div class="a-sec-t">PENDING APPROVAL (${pending.length})</div>
    ${pending.length
      ? pendingCards.join('')
      : '<div class="empty" style="padding:16px"><div class="ei" style="font-size:1.8rem">✅</div><p style="font-size:.82rem">No pending applications</p></div>'}

    <div class="a-sec-t" style="margin-top:20px">ACTIVE RIDERS (${approved.length})</div>
    ${approved.length
      ? `<div style="background:var(--dark2);border-radius:var(--r);overflow:hidden">${approvedRows}</div>`
      : '<div style="color:var(--muted);font-size:.82rem;padding:12px 4px">No approved riders yet</div>'}

    ${suspended.length ? `
    <div class="a-sec-t" style="margin-top:20px">SUSPENDED RIDERS (${suspended.length})</div>
    <div style="background:var(--dark2);border-radius:var(--r);overflow:hidden">${suspendedRows}</div>` : ''}
  `;
}

async function approveRider(phone) {
  await apiFetch('/api/admin/riders/approve',{method:'POST',body:{phone}});
  const el=document.getElementById(`rr-${phone}`);
  if(el){ el.style.opacity='0'; el.style.transform='scale(.95)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }
  toast('✅ Rider approved and notified!','ok');
}

async function rejectRider(phone) {
  if(!confirm('Reject this rider application?')) return;
  await apiFetch('/api/admin/riders/suspend',{method:'POST',body:{phone}});
  const el=document.getElementById(`rr-${phone}`);
  if(el) { el.style.opacity='0'; setTimeout(()=>el.remove(),300); }
  toast('Rider rejected','warn');
}

// Suspend an already-approved rider
async function suspendActiveRider(phone, name) {
  if(!confirm(`Suspend ${name}?\nThey will be logged out and cannot accept orders until reinstated.`)) return;
  const res = await apiFetch('/api/admin/riders/suspend',{method:'POST',body:{phone}});
  if(res?.success || res !== null){
    toast(`🚫 ${name} suspended`,'warn');
    renderAdminRiders();
  } else {
    toast('Could not suspend rider — try again','err');
  }
}

// Lift a suspension — rider goes back to approved
async function unsuspendRider(phone, name) {
  if(!confirm(`Reinstate ${name}?\nThey will be able to log in and accept orders again.`)) return;
  const res = await apiFetch('/api/admin/riders/unsuspend',{method:'POST',body:{phone}});
  if(res?.success){
    toast(`✅ ${name} reinstated — SMS sent`,'ok');
    renderAdminRiders();
  } else {
    toast(res?.error || 'Could not reinstate rider','err');
  }
}


async function renderAdminMenu() {
  const el = document.getElementById('a-menu');
  if (!el) return;

  // ── Loading state ──────────────────────────────────────────────────────
  el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
    <div class="spin" style="margin:0 auto 12px"></div>
    Loading menu...
  </div>`;

  const data = await apiFetch('/api/menu?all=true'); // FIX: fetch all items with categories in one go, instead of multiple calls per category

  // ── Normalize items ────────────────────────────────────────────────────
  // API returns { "Category Name": [items] }
  const items = data
    ? Object.entries(data).flatMap(([cat, catItems]) =>       // ✅ 'cat' matches usage below
        (catItems || []).map(i => ({ ...i, category: i.category || cat }))
      )
    : Object.entries(MENU).flatMap(([cat, catItems]) =>       // ✅ 'catItems' matches usage below
        catItems.map(i => ({ ...i, category: cat, available: true }))
      );

  // ── Debug: log what we got ────────────────────────────────────────────
  console.log('Menu data from API:', data);
  console.log('Normalized items:', items);

  if (!items || items.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      No menu items found. Add your first item below.
    </div>`;
    return;
  }

  // ── Group by category ──────────────────────────────────────────────────
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  console.log('Grouped by category:', Object.keys(byCategory));

  // ── Render ─────────────────────────────────────────────────────────────
  el.innerHTML =

    // ADD NEW ITEM FORM
    `<div class="card" style="margin-bottom:20px">
      <div class="card-t">ADD NEW ITEM</div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Name</label>
        <input class="inp" id="new-item-name" placeholder="e.g. Spicy Twister"/>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Category</label>
        <select class="inp" id="new-item-cat">
          ${['Brand New', ...Object.keys(MENU).filter(c => c !== 'Brand New')]
            .map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Price (KES)</label>
        <input class="inp" id="new-item-price" type="number" placeholder="e.g. 650"/>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Description</label>
        <input class="inp" id="new-item-desc"
          placeholder="e.g. Crispy chicken in tortilla wrap"/>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Image URL (optional)</label>
        <input class="inp" id="new-item-img" placeholder="https://..."/>
      </div>

      <div class="field" style="margin-bottom:14px">
        <label class="field-lbl">Position in Category</label>
        <input class="inp" id="new-item-order" type="number" min="1"
          placeholder="e.g. 3 — leave blank to add at end"/>
        <div style="font-size:.74rem;color:var(--muted);margin-top:4px">
          Lower number = appears higher in the list
        </div>
      </div>

      <button class="btn btn-primary btn-full" onclick="addMenuItem()">
        + Add to Menu
      </button>
    </div>`

    // ITEMS GROUPED BY CATEGORY
    + Object.entries(byCategory).map(([cat, catItems]) => `

      <div style="margin-bottom:22px">

        <!-- Category header -->
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:8px;
          font-family:var(--fh);
          font-size:.72rem;
          letter-spacing:1.5px;
          color:var(--muted);
          border-radius:8px;
          padding:7px 12px;
          background:var(--dark3)">
          <span>${cat.toUpperCase()}</span>
          <span style="color:var(--orange)">
            ${catItems.length} item${catItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <!-- Items -->
        ${catItems.map(item => `
          <div class="menu-toggle-item" id="mti-${item.id}">

            <div class="mt-info">
              <div class="mt-name">${item.name}</div>
              <div class="mt-cat"
                style="font-size:.72rem;color:var(--muted);margin-top:2px">
                ${item.description || ''}
              </div>
            </div>

            <div class="mt-price">${F.money(item.price)}</div>

            <div class="toggle-sm${item.available ? ' on' : ''}"
              id="mt-${item.id}"
              onclick="toggleMenuItem(${item.id}, this)"
              title="${item.available
                ? 'Available — click to hide'
                : 'Hidden — click to show'}">
            </div>

            <button
              onclick="deleteMenuItem(${item.id},
                '${item.name.replace(/'/g, "\\'")}', this)"
              style="background:none;border:none;cursor:pointer;
                     font-size:1.1rem;padding:4px 6px;
                     opacity:.6;line-height:1;flex-shrink:0"
              title="Delete ${item.name}">
              🗑️
            </button>

          </div>
        `).join('')}

      </div>
    `).join('');
}
// ── ADMIN REVENUE HISTORY ─────────────────────────────────────────────────────
// Separate tab — does not touch or replace today's metrics on Overview.
// Shows a day-by-day breakdown for the past N days with totals.

async function renderAdminRevenue() {
  const el = document.getElementById('a-revenue');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:30px"><span class="spin"></span></div>`;

  const days = parseInt(document.getElementById('rev-days-sel')?.value || '30');
  const data = await apiFetch(`/api/admin/revenue/history?days=${days}`);

  if (!data) {
    el.innerHTML = `<div class="empty">
      <div class="ei">📊</div>
      <h3>COULD NOT LOAD REVENUE</h3>
      <p>Check your connection and try again</p>
    </div>`;
    return;
  }

  // ── Apply frontend clear filter ────────────────────────────────────────
  const clearedAt = localStorage.getItem(REVENUE_CLEAR_KEY); // e.g. "2025-05-12"
  
  let { history = [], grand_total = 0 } = data;

  if (clearedAt) {
    // Hide all days on or before the cleared date
    history = history.filter(d => d.date > clearedAt);
    // Recalculate grand total for visible entries only
    grand_total = history.reduce((s, d) => s + (d.total || 0), 0);
  }

  const fmtDate = dateStr => {
    const today = new Date().toISOString().slice(0, 10);
    const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return 'Today';
    if (dateStr === yest)  return 'Yesterday';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short' });
  };

  const maxTotal = history.length ? Math.max(...history.map(d => d.total), 1) : 1;

  const rows = history.length
    ? history.map(d => {
        const barPct = Math.round((d.total / maxTotal) * 100);
        return `
          <div style="background:var(--dark3);border-radius:10px;
               padding:14px 16px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;
                 align-items:center;margin-bottom:6px">
              <span style="font-weight:700;font-size:.9rem">${fmtDate(d.date)}</span>
              <span style="font-family:var(--fh);color:var(--green);
                   font-size:1.05rem;letter-spacing:1px">
                KES ${d.total.toLocaleString()}
              </span>
            </div>
            <div style="height:4px;background:var(--line);border-radius:2px;
                 margin-bottom:8px;overflow:hidden">
              <div style="height:100%;width:${barPct}%;background:var(--green);
                   border-radius:2px;transition:width .4s"></div>
            </div>
            <div style="display:flex;gap:16px;font-size:.75rem;color:var(--muted)">
              <span>📦 ${d.orders} order${d.orders !== 1 ? 's' : ''}</span>
              <span>🍗 Food: KES ${d.food_revenue.toLocaleString()}</span>
              <span>🏍️ Delivery: KES ${d.delivery_revenue.toLocaleString()}</span>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:30px">
        <div class="ei">📊</div>
        <p style="font-size:.82rem;margin-bottom:14px">
          No revenue to display for this period
        </p>
        ${clearedAt ? `
          <button class="btn btn-ghost btn-sm" onclick="resetRevenueHistory()">
            ↩ Restore Hidden History
          </button>` : ''}
      </div>`;

  el.innerHTML = `

    <!-- Header row -->
    <div style="display:flex;justify-content:space-between;align-items:center;
         margin-bottom:14px;flex-wrap:wrap;gap:10px">

      <div class="a-sec-t" style="margin:0">REVENUE HISTORY</div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">

        <!-- Period selector -->
        <select id="rev-days-sel" class="inp"
          style="width:auto;padding:8px 12px;font-size:.82rem"
          onchange="renderAdminRevenue()">
          <option value="7"   ${days === 7   ? 'selected' : ''}>Last 7 days</option>
          <option value="30"  ${days === 30  ? 'selected' : ''}>Last 30 days</option>
          <option value="90"  ${days === 90  ? 'selected' : ''}>Last 90 days</option>
          <option value="365" ${days === 365 ? 'selected' : ''}>Last year</option>
        </select>

        <!-- Clear button -->
        <button onclick="clearRevenueHistory()"
          style="background:var(--dark3);border:1px solid var(--line);
                 color:var(--muted);padding:8px 14px;border-radius:8px;
                 font-size:.78rem;cursor:pointer;white-space:nowrap">
          🗑 Clear View
        </button>

        <!-- Restore button — only shown when history is cleared -->
        ${clearedAt ? `
          <button onclick="resetRevenueHistory()"
            style="background:none;border:1px solid var(--green);
                   color:var(--green);padding:8px 14px;border-radius:8px;
                   font-size:.78rem;cursor:pointer;white-space:nowrap">
            ↩ Restore
          </button>` : ''}

      </div>
    </div>

    <!-- Cleared notice -->
    ${clearedAt ? `
      <div style="background:rgba(255,165,0,.08);border:1px solid var(--orange);
           border-radius:8px;padding:10px 14px;margin-bottom:14px;
           font-size:.78rem;color:var(--orange);display:flex;
           justify-content:space-between;align-items:center">
        <span>📅 Showing history after ${clearedAt} only</span>
        <button onclick="resetRevenueHistory()"
          style="background:none;border:none;color:var(--orange);
                 font-size:.78rem;cursor:pointer;text-decoration:underline">
          Show all
        </button>
      </div>` : ''}

    <!-- Grand total card -->
    <div style="background:var(--dark2);border:1px solid var(--line2);
         border-radius:var(--r);padding:18px 20px;margin-bottom:16px;
         display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:.75rem;color:var(--muted);
             letter-spacing:1px;margin-bottom:4px">
          TOTAL REVENUE · ${days} DAYS
        </div>
        <div style="font-family:var(--fh);font-size:2rem;
             color:var(--green);letter-spacing:2px">
          KES ${grand_total.toLocaleString()}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px">
          DAYS WITH ORDERS
        </div>
        <div style="font-family:var(--fh);font-size:1.6rem">
          ${history.length}
        </div>
      </div>
    </div>

    <!-- Daily rows -->
    ${rows}
  `;
}

// Frontend "clear history" — does not delete data, just hides it from view until the next reload

const REVENUE_CLEAR_KEY = 'mb_revenue_cleared_at';
function clearRevenueHistory() {
  if (!confirm('Clear revenue history from view? This does not delete any data, but hides all days on or before today to help you focus on recent performance. You can restore the full history at any time.')) return;

  localStorage.setItem(REVENUE_CLEAR_KEY, new Date().toISOString().slice(0, 10)); // e.g. "2025-05-12"  
  toast('Revenue history cleared from view. Showing only entries after today.', 'ok', 4000);
  renderAdminRevenue();
}

// Remove the "clear" filter and show all history again
function resetRevenueHistory() {
  localStorage.removeItem(REVENUE_CLEAR_KEY);
  toast('Full revenue history restored.', 'ok', 3000);
  renderAdminRevenue();
}

async function renderAdminCustomers() {
  const el = document.getElementById('a-customers');
  if (!el) return;
  
  el.innerHTML = `<div class="loading">Loading customers...</div>`;
  
  const customers = await apiFetch('/api/admin/customers') || [];
  
  el.innerHTML = customers.length
    ? customers.map(c => `
      <div class="customer-row" style="padding:12px;border-bottom:1px solid var(--line2);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>${c.name || 'Unknown'}</strong>
            <div style="color:var(--muted);font-size:13px;">${c.phone}</div>
            <div style="font-size:12px;color:var(--muted);">
              ${c.orders?.count || 0} orders · Joined ${F.date(c.created_at)}
            </div>
          </div>
          <button onclick="deleteCustomer('${c.phone}', '${c.name}')" 
            style="background:var(--red);color:white;border:none;padding:6px 12px;border-radius:6px;font-size:12px;">
            🗑️ Remove
          </button>
        </div>
      </div>
    `).join('')
    : '<div class="empty">No customers found</div>';
}

async function deleteCustomer(phone, name) {
  if (!confirm(`PERMANENTLY delete ${name} (${phone})?\n\nThis will delete ALL their orders and data. This cannot be undone.`)) return;
  
  const res = await apiFetch(`/api/admin/customers/${encodeURIComponent(phone)}`, { method: 'DELETE' });
  
  if (res?.success) {
    toast(`Customer ${name} deleted`, 'ok');
    renderAdminCustomers();
  } else {
    toast(res?.error || 'Could not delete customer', 'err');
  }
}

async function addMenuItem() {
    const name        = document.getElementById('new-item-name')?.value.trim();
    const category    = document.getElementById('new-item-cat')?.value;
    const price       = document.getElementById('new-item-price')?.value.trim();
    const img         = document.getElementById('new-item-img')?.value.trim();
    const description = document.getElementById('new-item-desc')?.value.trim();
    const sortOrder   = document.getElementById('new-item-order')?.value.trim();

    if(!name || !price){ toast('Name and price are required','err'); return; }
    const result = await apiFetch('/api/menu', {
      method: 'POST',
      body: {
        name, category, price, description, img,
        sort_order: sortOrder ? parseInt(sortOrder) : 999
      }
    });

    if(result?.success) {
      toast(`✅ ${name} added to menu!`, 'ok');
        document.getElementById('new-item-name').value  = '';
        document.getElementById('new-item-price').value = '';
        document.getElementById('new-item-desc').value  = '';
        document.getElementById('new-item-img').value   = '';
        document.getElementById('new-item-order').value = '';
        renderAdminMenu();
    } else {
      toast('Could not add item','err');
    }
}


async function toggleMenuItem(id,el) {
  el.classList.toggle('on');
  const on=el.classList.contains('on');
  await apiFetch(`/api/menu/${id}`,{method:'PATCH',body:{available:on}});
  toast(on?'Item enabled':'Item hidden');
}

async function deleteMenuItem(id, name, btn){
  if(!confirm(`Permanently delete "${name}" from the menu?\n\nThis cannot be undone.`)) return;
  btn.innerHTML = '⏳'; btn.disabled = true;
  const res = await apiFetch(`/api/menu/${id}`, {method:'DELETE'});
  if(res?.success || res !== null){
    const row = document.getElementById(`mti-${id}`);
    if(row){
      row.style.transition = 'opacity .2s, transform .2s, max-height .3s';
      row.style.opacity = '0';
      row.style.transform = 'scaleY(0)';
      row.style.maxHeight = '0';
      row.style.overflow = 'hidden';
      setTimeout(()=>row.remove(), 320);
    }
    toast(`"${name}" deleted from menu`, 'ok');
  } else {
    btn.innerHTML = '🗑️'; btn.disabled = false;
    toast('Could not delete item — try again', 'err');
  }
}