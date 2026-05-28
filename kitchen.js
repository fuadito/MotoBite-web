// kitchen.js — MotoBite Kitchen App Module (PASSCODE-BASED AUTH)
// ============================================
// Dependencies: core.js (must be loaded first)
// Loaded by: kitchen.html
// ============================================

// NOTE: kOrders, kDone are ALREADY declared in core.js
// Do NOT redeclare with let/const — use the existing globals

// ── KITCHEN AUTH (Passcode-based, matching original DB schema) ─────────────

const KITCHEN_CODE_KEY = 'mb_kitchen_auth';

function showKitchenPasscodeAuth() {
  document.getElementById('s-kitchen-login').classList.add('on');
  document.getElementById('s-kitchen').classList.remove('on');

  const loginSection = document.getElementById('s-kitchen-login');
  loginSection.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">👨‍🍳</div>
        <h2 class="auth-title">KITCHEN STAFF</h2>
        <p class="auth-sub">Enter the kitchen passcode to access the order board</p>
        <div class="field">
          <label class="field-lbl">Kitchen Passcode</label>
          <input type="password" class="inp" id="kit-code" placeholder="Enter passcode" autocomplete="off"/>
        </div>
        <div id="kit-err" class="auth-err" style="display:none"></div>
        <button class="btn btn-primary btn-full" id="kit-login-btn" onclick="kitchenPasscodeLogin()">Enter Kitchen →</button>
        <button class="btn btn-ghost btn-full" onclick="window.location.href='/'" style="margin-top:10px">← Back to Main</button>
      </div>
    </div>`;
}

async function kitchenPasscodeLogin() {
  const code = document.getElementById('kit-code')?.value.trim();
  const err = document.getElementById('kit-err');
  const btn = document.getElementById('kit-login-btn');

  if (!code) {
    err.textContent = 'Enter the kitchen passcode';
    err.style.display = 'block';
    return;
  }

  err.style.display = 'none';
  btn.innerHTML = '<span class="spin"></span> Checking...';
  btn.disabled = true;

  try {
    const r = await apiFetch('/api/kitchen/verify', {
      method: 'POST',
      body: { code }
    });

    if (!r || !r.ok) {
      err.textContent = r?.error || 'Wrong passcode — ask your manager';
      err.style.display = 'block';
      btn.innerHTML = 'Enter Kitchen →';
      btn.disabled = false;
      return;
    }

    // Success — store auth and launch
    localStorage.setItem(KITCHEN_CODE_KEY, '1');
    document.getElementById('s-kitchen-login').classList.remove('on');
    document.getElementById('s-kitchen').classList.add('on');
    toast('✅ Kitchen access granted', 'ok');
    launchKitchen();

  } catch (e) {
    err.textContent = 'Network error. Try again.';
    err.style.display = 'block';
    btn.innerHTML = 'Enter Kitchen →';
    btn.disabled = false;
  }
}

function kitchenSignOut() {
  localStorage.removeItem(KITCHEN_CODE_KEY);
  localStorage.removeItem('mb_kitchen');
  kOrders = [];
  kDone = 0;
  if (kInterval) { clearInterval(kInterval); kInterval = null; }
  if (_clockInterval) { clearInterval(_clockInterval); _clockInterval = null; }
  window.location.reload();
}

// ── KITCHEN APP ─────────────────────────────────────────────────────────────

let kInterval = null;
let _clockInterval = null;

function launchKitchen() {
  screen('s-kitchen');
  startClock();
  kOrders = [];
  if (kInterval) clearInterval(kInterval);
  pollKitchen();
  kInterval = setInterval(pollKitchen, 8000);
  startKitchenRealtime();
}

function startClock() {
  if (_clockInterval) { clearInterval(_clockInterval); _clockInterval = null; }
  const tick = () => {
    const el = document.getElementById('k-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-KE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Africa/Nairobi'
    });
  };
  tick();
  _clockInterval = setInterval(tick, 1000);
}

async function pollKitchen() {
  const data = await apiFetch('/api/kitchen/orders');
  if (data?.orders) {
    kOrders = data.orders;
    renderKitchen();
  }
}

function renderKitchen() {
  const nw = kOrders.filter(o => ['pending', 'paid'].includes(o.status));
  const co = kOrders.filter(o => o.status === 'cooking');
  const rd = kOrders.filter(o => ['ready', 'rider_assigned'].includes(o.status));

  document.getElementById('ks-new').textContent = nw.length;
  document.getElementById('ks-cook').textContent = co.length;
  document.getElementById('ks-rdy').textContent = rd.length;
  document.getElementById('ks-done').textContent = kDone;
  document.getElementById('kc-n').textContent = nw.length;
  document.getElementById('kc-c').textContent = co.length;
  document.getElementById('kc-r').textContent = rd.length;

  document.getElementById('kb-new').innerHTML = nw.length
    ? nw.map(o => kCard(o, 'new')).join('')
    : '<div class="empty"><div class="ei" style="font-size:2rem">🍗</div><h3 style="font-size:.85rem">NO NEW ORDERS</h3></div>';

  document.getElementById('kb-cook').innerHTML = co.length
    ? co.map(o => kCard(o, 'cook')).join('')
    : '<div class="empty"><div class="ei" style="font-size:2rem">🔥</div><h3 style="font-size:.85rem">NOTHING COOKING</h3></div>';

  document.getElementById('kb-rdy').innerHTML = rd.length
    ? rd.map(o => kCard(o, 'rdy')).join('')
    : '<div class="empty"><div class="ei" style="font-size:2rem">📦</div><h3 style="font-size:.85rem">NONE READY</h3></div>';
}

function kCard(o, type) {
  const baseTime = o.paid_at || o.created_at;
  const ageMins = Math.floor((Date.now() - new Date(baseTime)) / 60000);
  const urgent = ageMins > 15 && type !== 'rdy';
  const isPickup = o.order_type === 'pickup' || o.customer_area === 'KFC Narok (Self-pickup)';

  const typePill = isPickup
    ? `<span style="background:#1a7a1a;color:#fff;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle">🚶 SELF-PICKUP</span>`
    : `<span style="background:#1a3a7a;color:#fff;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle">🛵 DELIVERY</span>`;

  const locationLine = isPickup
    ? `<div class="kc-area">🚶 Counter collection</div>`
    : `<div class="kc-area">📍 ${o.customer_area || 'Narok'}</div>`;

  const rdyAction = isPickup
    ? `<div class="kb wait" style="background:var(--green);color:#fff">🚶 Ready for Collection</div>`
    : (o.status === 'rider_assigned'
      ? `<div class="kb wait">🏍️ Rider Assigned</div>`
      : `<div class="kb wait">⏳ Awaiting Rider</div><button class="kb cook" style="margin-top:6px;font-size:.75rem" onclick="kRedispatch(${o.id})">🔄 Re-dispatch</button>`);

  const action = {
    new: o.status === 'pending'
      ? `<div style="font-size:.7rem;color:var(--orange);margin-bottom:6px">⏳ AWAITING PAYMENT</div>
         <button class="kb cook" disabled style="opacity:.4;cursor:not-allowed">🔥 Start Cooking</button>`
      : `<div style="font-size:.7rem;color:var(--green);margin-bottom:6px">✅ PAID — Ready to cook</div>
         <button class="kb cook" onclick="kUpdate(${o.id},'cooking')">🔥 Start Cooking</button>`,
    cook: `<button class="kb rdy" onclick="kUpdate(${o.id},'ready')">✅ Mark Ready</button>`,
    rdy: `<div>${rdyAction}</div>`
  }[type];

  return `<div class="kc" id="kc-${o.id}">
    <div class="kc-top">
      <div class="kc-num">${o.order_number}${typePill}</div>
      <div class="kc-age${urgent ? ' urg' : ''}">⏱ ${ageMins}m</div>
    </div>
    <div class="kc-items">${(o.items || []).map(i => `
      <div class="kc-item">${i.name}${i.chickenType ? `<span style="background:var(--red);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:5px">${i.chickenType}</span>` : ''} ${i.note ? `<div class="kc-note">⚠️ ${i.note}</div>` : ''}</div>
    `).join('')}</div>
    ${locationLine}
    ${o.mpesa_reference
      ? `<div style="font-size:.72rem;color:var(--green);font-weight:600;margin-top:4px">💳 ${o.mpesa_reference}</div>`
      : '<div style="font-size:.72rem;color:var(--orange);margin-top:4px">⏳ Awaiting payment proof</div>'}
    <div class="kc-acts">${action}</div>
  </div>`;
}

async function kUpdate(id, status) {
  const o = kOrders.find(x => x.id === id);
  if (o) {
    o.status = status;
    if (status === 'ready') kDone++;
    renderKitchen();
  }
  await apiFetch(`/api/kitchen/orders/${id}/status`, { method: 'POST', body: { status } });
  if (status === 'ready') toast('Order ready! Notifying rider 🏍️', 'ok');
  playBeep();
}

async function kRedispatch(id) {
  toast('Re-dispatching to available riders...', 'ok', 3000);
  const r = await apiFetch(`/api/kitchen/orders/${id}/status`, { method: 'POST', body: { status: 'ready' } });
  if (r?.success) toast('Re-dispatched! ✅', 'ok');
  else toast('Re-dispatch failed — try again', 'err');
  await pollKitchen();
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    g.gain.setValueAtTime(.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .15);
    osc.start();
    osc.stop(ctx.currentTime + .15);
  } catch {}
}