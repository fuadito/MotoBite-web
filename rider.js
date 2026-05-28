// rider.js — MotoBite Rider App Module (PHONE-BASED AUTH)
// ============================================
// Dependencies: core.js (must be loaded first)
// Loaded by: rider.html
// ============================================

// NOTE: riderState, user, pinBuf, oTimer are ALREADY declared in core.js
// Do NOT redeclare with let/const — use the existing globals

// Override apiFetch for rider to include rider phone header
const _originalApiFetch = window.apiFetch;
window.apiFetch = async function(path, opts = {}) {
  const rawPhone = riderState.phone || user.phone;
  const phone = rawPhone ? F.norm(rawPhone) : '';

  const headers = {
    'Content-Type': 'application/json',
    ...(phone ? { 'x-user-phone': phone } : {}),
    ...(opts.headers || {})
  };

  try {
    const r = await fetch(API + path, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch { return null; }
};

// ── RIDER AUTH (Phone-based, matching DB schema) ────────────────────────────

function showRiderPhoneAuth() {
  document.getElementById('s-rider-login').classList.add('on');
  document.getElementById('s-rider').classList.remove('on');

  const loginSection = document.getElementById('s-rider-login');
  loginSection.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">🏍️</div>
        <h2 class="auth-title">RIDER APP</h2>
        <p class="auth-sub">Enter your registered phone number to sign in</p>
        <div class="field">
          <label class="field-lbl">Phone Number</label>
          <div style="display:flex;gap:8px">
            <span style="padding:12px;background:var(--dark2);border-radius:8px;color:var(--muted)">+254</span>
            <input class="inp" id="rid-phone" placeholder="712345678" inputmode="tel" maxlength="9" style="flex:1"/>
          </div>
        </div>
        <div id="rid-err" class="auth-err" style="display:none"></div>
        <button class="btn btn-primary btn-full" id="rid-login-btn" onclick="riderPhoneLogin()">Sign In →</button>
        <p style="text-align:center;margin-top:16px;font-size:.85rem;color:var(--muted)">
          New rider? 
          <a href="#" onclick="showRiderPhoneRegister(); return false;" style="color:var(--red)">Apply here</a>
        </p>
        <button class="btn btn-ghost btn-full" onclick="window.location.href='/'" style="margin-top:10px">← Back to Main</button>
      </div>
    </div>`;
}

async function riderPhoneLogin() {
  const phoneInput = document.getElementById('rid-phone');
  const err = document.getElementById('rid-err');
  const btn = document.getElementById('rid-login-btn');

  const raw = phoneInput?.value.trim();
  if (!raw || raw.replace(/\D/g, '').length < 9) {
    err.textContent = 'Enter a valid phone number';
    err.style.display = 'block';
    return;
  }

  const phone = F.norm(raw);

  err.style.display = 'none';
  btn.innerHTML = '<span class="spin"></span> Signing in...';
  btn.disabled = true;

  try {
    const data = await apiFetch('/api/rider/login', {
      method: 'POST',
      body: { phone }
    });

    if (!data || data.exists === false) {
      err.textContent = 'No rider account found. Please register first.';
      err.style.display = 'block';
      btn.innerHTML = 'Sign In →';
      btn.disabled = false;
      return;
    }

    if (data.status === 'pending') {
      err.textContent = 'Your application is under review. You will be notified within 24 hours.';
      err.style.display = 'block';
      btn.innerHTML = 'Sign In →';
      btn.disabled = false;
      return;
    }

    if (data.status === 'suspended') {
      err.textContent = 'Your account has been suspended. Contact MotoBite.';
      err.style.display = 'block';
      btn.innerHTML = 'Sign In →';
      btn.disabled = false;
      return;
    }

    // Approved rider — restore state
    riderState = {
      ...riderState,
      name: data.name,
      phone: phone,
      rating: data.rating || 0,
      deliveries: data.total_deliveries || 0,
      todayTrips: data.today_trips || 0,
      status: data.status,
      online: false
    };

    localStorage.setItem('mb_rider', JSON.stringify({
      phone: phone,
      name: data.name,
      rating: data.rating || 0,
      deliveries: data.total_deliveries || 0,
      status: data.status,
      online: false
    }));

    document.getElementById('s-rider-login').classList.remove('on');
    document.getElementById('s-rider').classList.add('on');
    toast(`Welcome back, ${data.name}! 🏍️`, 'ok');
    launchRider();

  } catch (e) {
    err.textContent = 'Network error. Try again.';
    err.style.display = 'block';
    btn.innerHTML = 'Sign In →';
    btn.disabled = false;
  }
}

function showRiderPhoneRegister() {
  const loginSection = document.getElementById('s-rider-login');
  loginSection.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">🏍️</div>
        <h2 class="auth-title">NEW RIDER</h2>
        <p class="auth-sub">Apply to become a MotoBite delivery rider</p>
        <div class="field">
          <label class="field-lbl">Full Name</label>
          <input class="inp" id="reg-name" placeholder="e.g. James Mutua"/>
        </div>
        <div class="field">
          <label class="field-lbl">Phone Number</label>
          <div style="display:flex;gap:8px">
            <span style="padding:12px;background:var(--dark2);border-radius:8px;color:var(--muted)">+254</span>
            <input class="inp" id="reg-phone" placeholder="712345678" inputmode="tel" maxlength="9" style="flex:1"/>
          </div>
        </div>
        <div id="rid-err" class="auth-err" style="display:none"></div>
        <button class="btn btn-primary btn-full" id="rid-reg-btn" onclick="riderPhoneRegister()">Continue →</button>
        <p style="text-align:center;margin-top:16px;font-size:.85rem;color:var(--muted)">
          Already have an account? 
          <a href="#" onclick="showRiderPhoneAuth(); return false;" style="color:var(--red)">Sign In</a>
        </p>
        <button class="btn btn-ghost btn-full" onclick="window.location.href='/'" style="margin-top:10px">← Back to Main</button>
      </div>
    </div>`;
}

async function riderPhoneRegister() {
  const name = document.getElementById('reg-name')?.value.trim();
  const rawPhone = document.getElementById('reg-phone')?.value.trim();
  const err = document.getElementById('rid-err');
  const btn = document.getElementById('rid-reg-btn');

  if (!name || name.length < 3) {
    err.textContent = 'Enter your full name';
    err.style.display = 'block';
    return;
  }

  if (!rawPhone || rawPhone.replace(/\D/g, '').length < 9) {
    err.textContent = 'Enter a valid phone number';
    err.style.display = 'block';
    return;
  }

  const phone = F.norm(rawPhone);

  err.style.display = 'none';
  btn.innerHTML = '<span class="spin"></span> Checking...';
  btn.disabled = true;

  // Check if already applied
  const check = await apiFetch('/api/rider/login', {
    method: 'POST',
    body: { phone }
  });

  if (check && check.exists) {
    err.textContent = 'This number already has an account. Please Sign In instead.';
    err.style.display = 'block';
    btn.innerHTML = 'Continue →';
    btn.disabled = false;
    return;
  }

  // Store for registration flow
  riderState.phone = phone;
  riderState.name = name;
  localStorage.setItem('mb_rider', JSON.stringify({ phone, name }));

  // Go to document upload steps
  riderState.regStep = 0;
  riderState.regData = {};

  document.getElementById('s-rider-login').classList.remove('on');
  document.getElementById('s-rider').classList.add('on');
  renderRiderReg();
}

function riderSignOut() {
  localStorage.removeItem('mb_rider');
  localStorage.removeItem('mb_active_delivery');
  localStorage.removeItem('mb_pending_order');
  riderState = { name: '', phone: '', rating: 0, deliveries: 0, online: false,
    regStep: 0, regData: {}, activeOrder: null, collected: false, todayTrips: 0, todayEarnings: 0 };
  window.location.reload();
}

// ── LAUNCH RIDER ────────────────────────────────────────────────────────────

async function launchRider() {
  screen('s-rider');
  startRiderRealtime();

  // Restore active delivery if rider refreshes mid-delivery
  if (!riderState.activeOrder) {
    const saved = localStorage.getItem('mb_active_delivery');
    if (saved) {
      try {
        riderState.activeOrder = JSON.parse(saved);
        riderState.collected = false;
      } catch {}
    }
  }

  // Restore pending order
  if (!riderState.activeOrder && !riderState.pendingOrder) {
    const pending = localStorage.getItem('mb_pending_order');
    if (pending) {
      try { riderState.pendingOrder = JSON.parse(pending); } catch {}
    }
  }

  if (!riderState.name) {
    riderState.regStep = 0;
    renderRiderReg();
  } else {
    renderRiderHome();
    if (riderState.activeOrder) {
      rPanel('delivery', document.querySelector('[data-s="delivery"]'));
    } else if (riderState.pendingOrder) {
      requestAnimationFrame(() => showRiderOrderAlert(riderState.pendingOrder));
    }

    if (window._pendingNotifIntent) {
      const intent = window._pendingNotifIntent;
      window._pendingNotifIntent = null;
      setTimeout(() => {
        if (intent.action === 'openChat' && intent.orderId) {
          openChat(intent.orderId, intent.role || 'rider');
        } else if (intent.action === 'showOrder' && riderState.pendingOrder) {
          showRiderOrderAlert(riderState.pendingOrder);
        }
      }, 400);
    }
  }
}

function rPanel(id, btn = null) {
  if (btn) {
    document.querySelectorAll('#s-rider .bnav-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
  }
  if (id === 'home') renderRiderHome();
  else if (id === 'delivery') renderRiderDelivery();
  else if (id === 'earnings') renderRiderEarnings();
}

// ── REGISTRATION ──────────────────────────────────────────────────────────────

function renderRiderReg() {
  const steps = ['Name', 'ID', 'License', 'Selfie'];
  const step = riderState.regStep;
  const rc = document.getElementById('rider-content');

  const stepsHTML = `<div class="reg-row">
    ${steps.map((s, i) => `
      ${i > 0 ? `<div class="reg-l${i <= step ? ' dn' : ''}"></div>` : ''}
      <div class="reg-d${i < step ? ' dn' : ''} ${i === step ? ' act' : ''}">${i < step ? '✓' : i + 1}</div>
    `).join('')}
  </div>`;

  if (step === 0) {
    rc.innerHTML = `<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">WELCOME, RIDER! 🏍️</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Earn at least KES 100 per delivery. Let's verify your identity.</p>
      <div class="card">
        <div class="field" style="margin-bottom:13px">
          <label class="field-lbl">Your Full Name</label>
          <input class="inp" id="reg-name" placeholder="e.g. James Mutua" value="${riderState.name || ''}" autocomplete="name"/>
        </div>
        <button class="btn btn-primary btn-full" onclick="regNext()">Next: Upload ID →</button>
      </div>
    </div>`;
  } else if (step === 1) {
    rc.innerHTML = `<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">NATIONAL ID</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Upload a clear photo of your National ID (both sides visible)</p>
      <div class="upload-z${riderState.regData.idFile ? ' dn' : ''}" id="id-zone">
        <input type="file" accept="image/*" onchange="handleUpload(event,'id')"/>
        <div class="uz-ico">🪪</div>
        <div class="uz-name" id="id-fn">${riderState.regData.idFile ? '✅ ' + riderState.regData.idFile.name : 'Tap to choose photo'}</div>
        <div class="uz-txt">JPG or PNG · Clear and readable</div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:13px" onclick="regNext()">Next: Driving License →</button>
    </div>`;
  } else if (step === 2) {
    rc.innerHTML = `<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">DRIVING LICENSE</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Upload your valid Kenyan Driving License</p>
      <div class="upload-z${riderState.regData.licFile ? ' dn' : ''}" id="lic-zone">
        <input type="file" accept="image/*" onchange="handleUpload(event,'lic')"/>
        <div class="uz-ico">🚗</div>
        <div class="uz-name" id="lic-fn">${riderState.regData.licFile ? '✅ ' + riderState.regData.licFile.name : 'Tap to choose photo'}</div>
        <div class="uz-txt">Must show license number and category</div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:13px" onclick="regNext()">Next: Selfie →</button>
    </div>`;
  } else if (step === 3) {
    rc.innerHTML = `<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">YOUR SELFIE</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Take a clear photo of your face to confirm you are who your ID says.</p>
      <div class="upload-z${riderState.regData.selfieFile ? ' dn' : ''}" id="selfie-zone">
        <input type="file" accept="image/*" capture="user" onchange="handleUpload(event,'selfie')"/>
        <div class="uz-ico">🤳</div>
        <div class="uz-name" id="selfie-fn">${riderState.regData.selfieFile ? '✅ ' + riderState.regData.selfieFile.name : 'Tap to take selfie'}</div>
        <div class="uz-txt">Good lighting · Face clearly visible</div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="startCamera()" id="cam-btn">📷 Use Camera Instead</button>
      <button class="btn btn-primary btn-full" style="display:none;margin-top:8px" onclick="takeSelfie()" id="snap-btn">📸 Take Photo</button>
      <button class="btn btn-ghost btn-full" style="display:none;margin-top:4px" onclick="stopCamera()" id="stop-cam-btn">✕ Cancel Camera</button>
      <button class="btn btn-primary btn-full" style="margin-top:13px" onclick="submitReg()">Submit Application ✓</button>
    </div>`;
  }
}

let cameraStream = null;

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    const video = document.getElementById('selfie-video');
    if (!video) {
      const zone = document.getElementById('selfie-zone');
      if (zone) {
        zone.insertAdjacentHTML('afterend', '<video id="selfie-video" style="width:100%;border-radius:10px;display:block;margin-top:10px;" autoplay playsinline></video><canvas id="selfie-canvas" style="display:none"></canvas>');
      }
    }
    const v = document.getElementById('selfie-video');
    if (v) v.srcObject = cameraStream;
    document.getElementById('cam-btn').style.display = 'none';
    document.getElementById('snap-btn').style.display = 'block';
    document.getElementById('stop-cam-btn').style.display = 'block';
    document.getElementById('selfie-zone').style.display = 'none';
  } catch (e) {
    toast('Camera access denied. Please upload a photo instead.', 'err');
  }
}

function takeSelfie() {
  const video = document.getElementById('selfie-video');
  const canvas = document.getElementById('selfie-canvas');
  if (!video || !canvas) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
    riderState.regData.selfieFile = file;
    toast('Selfie captured! ✅', 'ok');
    stopCamera();
    const fn = document.getElementById('selfie-fn');
    if (fn) fn.textContent = '✅ selfie.jpg';
  }, 'image/jpeg', 0.9);
}

function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
  cameraStream = null;
  const video = document.getElementById('selfie-video');
  if (video) video.style.display = 'none';
  const camBtn = document.getElementById('cam-btn');
  const snapBtn = document.getElementById('snap-btn');
  const stopBtn = document.getElementById('stop-cam-btn');
  if (camBtn) camBtn.style.display = 'block';
  if (snapBtn) snapBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';
  const zone = document.getElementById('selfie-zone');
  if (zone) zone.style.display = 'block';
}

function handleUpload(e, type) {
  const file = e.target.files[0];
  if (!file) return;
  riderState.regData[`${type}File`] = file;
  const fn = document.getElementById(`${type}-fn`);
  if (fn) fn.textContent = '✅ ' + file.name;
  const zone = document.getElementById(`${type}-zone`);
  if (zone) zone.classList.add('dn');
}

function regNext() {
  const step = riderState.regStep;
  if (step === 0) {
    const name = document.getElementById('reg-name')?.value.trim();
    if (!name || name.length < 3) { toast('Enter your full name', 'err'); return; }
    riderState.name = name;
  }
  if (step === 1 && !riderState.regData.idFile) { toast('Please upload your National ID', 'err'); return; }
  if (step === 2 && !riderState.regData.licFile) { toast('Please upload your Driving License', 'err'); return; }
  riderState.regStep++;
  renderRiderReg();
}

async function submitReg() {
  if (!riderState.regData.selfieFile) { toast('Please take a selfie', 'err'); return; }

  const phone = riderState.phone;
  const name = riderState.name;

  if (!phone || !name) {
    toast('Phone and name required', 'err');
    return;
  }

  const uploadFile = async (file, type) => {
    const ext = file.name.split('.').pop();
    const path = `${phone}/${type}.${ext}`;
    const { error } = await supa.storage.from('rider-docs').upload(path, file, { upsert: true });
    if (error) console.error(`Upload ${type} error:`, error.message);
    return path;
  };

  toast('Uploading documents...', '', 8000);

  const [idPath, licPath, selfiePath] = await Promise.all([
    uploadFile(riderState.regData.idFile, 'national-id'),
    uploadFile(riderState.regData.licFile, 'license'),
    uploadFile(riderState.regData.selfieFile, 'selfie'),
  ]);

  await apiFetch('/api/rider/register', {
    method: 'POST',
    body: { phone, name, idPath, licPath, selfiePath }
  });

  document.getElementById('rider-content').innerHTML = `
    <div style="text-align:center;padding:80px 20px">
      <div style="font-size:4rem;margin-bottom:18px">⏳</div>
      <div class="h2" style="letter-spacing:2px;margin-bottom:8px">UNDER REVIEW</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:28px">Your documents are being verified. We'll notify you within 24 hours.</p>
      <div class="card" style="max-width:320px;margin:0 auto">
        <p style="font-size:.82rem;color:var(--muted)">Questions? Call us at</p>
        <p style="font-family:var(--fh);font-size:1.2rem;letter-spacing:1px;margin-top:4px">0702 923 826</p>
      </div>
    </div>`;
  toast('Application submitted! Under review 📋', 'ok', 5000);
}

// ── RIDER DASHBOARD ─────────────────────────────────────────────────────────

function renderRiderHome() {
  const rc = document.getElementById('rider-content');
  rc.innerHTML = `
    <div style="padding:14px 16px 100px">
      <div class="r-prof">
        <div class="r-av">🏍️</div>
        <div>
          <div class="r-name">${riderState.name || 'Rider'}</div>
          <div class="r-meta">⭐ ${riderState.rating} · ${riderState.deliveries} total deliveries</div>
        </div>
      </div>
      <div id="r-alert-zone"></div>
      <div class="toggle-c">
        <div>
          <div class="tg-lbl" id="tg-lbl">${riderState.online ? '🟢 ONLINE' : 'Go Online'}</div>
          <div class="tg-sub">${riderState.online ? 'Receiving orders' : 'Tap to start receiving orders'}</div>
        </div>
        <div class="tg-sw${riderState.online ? ' on' : ''}" id="tg-sw" onclick="toggleOnline()"></div>
      </div>
      <div class="stats2">
        <div class="sm"><div class="sm-v" id="r-trips">${riderState.todayTrips}</div><div class="sm-l">Today's Trips</div></div>
        <div class="sm"><div class="sm-v" id="r-earn">KES ${riderState.todayEarnings || 0}</div><div class="sm-l">Today's Earnings</div></div>
        <div class="sm"><div class="sm-v">${riderState.deliveries}</div><div class="sm-l">Total Trips</div></div>
        <div class="sm"><div class="sm-v" style="color:var(--green)">${riderState.rating}</div><div class="sm-l">Rating</div></div>
      </div>
    </div>`;
  if (riderState.pendingOrder && !riderState.activeOrder) {
    showRiderOrderAlert(riderState.pendingOrder);
  }
}

function toggleOnline() {
  riderState.online = !riderState.online;
  const sw = document.getElementById('tg-sw');
  const lbl = document.getElementById('tg-lbl');
  if (sw) sw.classList.toggle('on', riderState.online);
  if (lbl) {
    lbl.textContent = riderState.online ? '🟢 ONLINE' : 'Go Online';
    lbl.nextElementSibling.textContent = riderState.online ? 'Receiving orders' : 'Tap to start receiving orders';
  }
  apiFetch('/api/rider/availability', { method: 'POST', body: { available: riderState.online } });
  try {
    const rd = JSON.parse(localStorage.getItem('mb_rider') || '{}');
    rd.online = riderState.online;
    localStorage.setItem('mb_rider', JSON.stringify(rd));
  } catch {}
  toast(riderState.online ? 'You are now ONLINE 🟢' : 'You are now offline');
  if (riderState.online) startLocTracking();
}

function showRiderOrderAlert(o) {
  const z = document.getElementById('r-alert-zone');
  if (!z) return;
  let t = 180;

  riderState.activeOrder = o;
  riderState.pendingOrder = o;

  const lat = o.customer_lat || o.location?.lat;
  const lng = o.customer_lng || o.location?.lng;
  const delivHint = o.delivery_hint
    || (o.landmark ? `${o.customer_area || 'Narok Town'} — ${o.landmark}` : null)
    || o.customer_area
    || 'Narok Town';

  const mapHtml = (lat && lng) ? `
    <div style="margin:10px 0;border-radius:10px;overflow:hidden;height:155px;position:relative;border:1px solid var(--line2)">
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.012).toFixed(6)},${(lat - 0.012).toFixed(6)},${(lng + 0.012).toFixed(6)},${(lat + 0.012).toFixed(6)}&layer=mapnik&marker=${lat},${lng}"
        style="width:100%;height:100%;border:0;pointer-events:none" loading="lazy"></iframe>
      <div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,.65);padding:3px 7px;font-size:.68rem;border-radius:4px 0 0 0;color:#fff">📍 Customer location</div>
    </div>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving" target="_blank"
      style="display:block;background:#1565c0;color:#fff;text-align:center;padding:9px;border-radius:8px;text-decoration:none;font-size:.82rem;font-weight:600;margin:4px 0">🗺️ Open Navigation (Google Maps)</a>
  ` : '';

  z.innerHTML = `<div class="o-alert">
    <div class="oa-top"><div class="oa-title">🔔 NEW ORDER!</div><div class="oa-timer" id="ot">${fmtTime(t)}</div></div>
    <div class="oa-detail">📍 Collect from: <strong>KFC Narok</strong></div>
    <div class="oa-detail">🏠 Deliver to: <strong>${delivHint}</strong></div>
    <div class="oa-detail" style="color:var(--green);font-weight:700;font-size:.92rem">💰 Delivery Fee: KES ${o.delivery_fee > 0 ? o.delivery_fee : '— (agree via chat)'}</div>
    ${mapHtml}
    <div class="oa-items" style="margin-top:8px">${(o.items || []).map(i => `• ${i.name}${i.note ? ` (${i.note})` : ''}`).join('<br>')}</div>
    <button class="btn btn-ghost btn-full" style="margin-top:10px" onclick="openPreAcceptChat(${o.id})">💬 Chat with Customer First</button>
    <div class="oa-btns"><button class="btn-accept" onclick="acceptOrder()">✅ ACCEPT</button><button class="btn-decline" onclick="declineOrder()">Pass</button></div>
  </div>`;

  supa.channel('order-chat-' + o.id)
    .on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (chatOrderId !== o.id) {
        toast(`💬 Customer: ${payload.text.substring(0, 30)}...`, 'ok', 5000);
        playBeep();
      }
    })
    .subscribe();

  if (oTimer) clearInterval(oTimer);
  oTimer = setInterval(() => {
    t--;
    const el = document.getElementById('ot');
    if (el) el.textContent = fmtTime(t);
    if (t <= 0) {
      clearInterval(oTimer);
      z.innerHTML = '';
      riderState.activeOrder = null;
      toast('Order expired — no response in time', 'warn');
    }
  }, 1000);
}

function openPreAcceptChat(orderId) {
  openChat(orderId, 'rider');
}

function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

function acceptOrder() {
  if (oTimer) clearInterval(oTimer);
  riderState.pendingOrder = null;
  localStorage.removeItem('mb_pending_order');
  if (riderState.activeOrder) riderState.activeOrder.status = 'rider_assigned';

  apiFetch(`/api/orders/${riderState.activeOrder.id}/accept`, { method: 'POST' });
  localStorage.setItem('mb_active_delivery', JSON.stringify(riderState.activeOrder));

  const orderId = riderState.activeOrder.id;
  startRiderChatListener(orderId);

  toast('Order accepted! Head to KFC Narok 🏍️', 'ok');
  const alertZone = document.getElementById('r-alert-zone');
  if (alertZone) alertZone.innerHTML = '';
  riderState.collected = false;
  rPanel('delivery', document.querySelector('[data-s="delivery"]'));
}

function declineOrder() {
  if (oTimer) clearInterval(oTimer);
  const alertZone = document.getElementById('r-alert-zone');
  if (alertZone) alertZone.innerHTML = '';
  if (riderState.activeOrder?.id) {
    apiFetch(`/api/orders/${riderState.activeOrder.id}/decline`, { method: 'POST' });
  }
  riderState.activeOrder = null;
  riderState.pendingOrder = null;
  localStorage.removeItem('mb_pending_order');
  toast('Order passed');
}

// ── DELIVERY SCREEN ───────────────────────────────────────────────────────────

function renderRiderDelivery() {
  const rc = document.getElementById('rider-content');
  const o = riderState.activeOrder;
  if (!o) {
    rc.innerHTML = `<div class="empty" style="padding-top:80px"><div class="ei">🏍️</div><h3>NO ACTIVE DELIVERY</h3><p>Go online to receive orders</p></div>`;
    return;
  }

  const agreedFee = riderState.agreedFee || parseInt(localStorage.getItem('mb_agreed_fee')) || 0;

  rc.innerHTML = `<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="width:7px;height:7px;background:var(--red);border-radius:50%;animation:blink 1s infinite"></span>
        <span style="font-size:.7rem;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.08em">Active Delivery · ${o.order_number}</span>
      </div>
      <div class="receipt">
        <div class="receipt-hdr">🧾 KFC NAROK COLLECTION RECEIPT</div>
        <div>Order: <strong>${o.order_number}</strong></div>
        ${(o.items || []).map(i => `<div>• ${i.name}${i.chickenType ? ` <strong style="color:var(--red)">[${i.chickenType}]</strong>` : ''}${i.note ? ` <span style="color:var(--orange)">(${escapeHtml(i.note)})</span>` : ''}</div>`).join('')}
        <div class="receipt-note">Show this screen to KFC staff at the counter</div>
      </div>
      <div style="background:var(--dark3);border-radius:var(--r);padding:12px;margin-bottom:12px;font-size:.85rem">
        📍 Deliver to: <strong>${o.delivery_hint || [o.customer_area, o.landmark].filter(Boolean).join(' — ') || o.customer_area}</strong><br>
        💰 Delivery fee: <strong style="color:var(--green)">${agreedFee ? `KES ${agreedFee} (agreed)` : 'Agree with customer'}</strong> — collect cash at door
      </div>
      ${(o.location?.lat || o.customer_lat) ? `
        <div style="background:var(--dark3);border-radius:var(--r);padding:12px;margin-bottom:12px">
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:.5px">📍 CUSTOMER LOCATION</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${o.location?.lat || o.customer_lat},${o.location?.lng || o.customer_lng}" target="_blank"
              style="flex:1;background:var(--red);color:#fff;text-align:center;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.85rem">🗺️ Navigate (Google Maps)</a>
            <a href="https://maps.apple.com/?daddr=${o.location?.lat || o.customer_lat},${o.location?.lng || o.customer_lng}&dirflg=d" target="_blank"
              style="flex:1;background:var(--dark2);color:var(--white);text-align:center;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.85rem;border:1px solid var(--line2)">🍎 Apple Maps</a>
          </div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:6px;text-align:center">${(o.location?.lat || o.customer_lat).toFixed(5)}, ${(o.location?.lng || o.customer_lng).toFixed(5)}</div>
        </div>
      ` : `
        <div style="background:var(--dark3);border-radius:var(--r);padding:10px 12px;margin-bottom:12px;font-size:.8rem;color:var(--orange)">⚠️ No GPS coordinates — ask customer for their exact location via chat</div>
      `}
      ${riderState.collected
        ? `<button class="btn btn-primary btn-full" onclick="showPin()">🔐 Enter Customer PIN</button>`
        : (o.status === 'paid' || o.status === 'rider_assigned')
          ? `<button class="btn btn-green btn-full" onclick="markCollected()">✅ Food Collected — Start Delivery</button>`
          : `<div style="text-align:center;padding:10px;color:var(--orange);font-size:.85rem">⏳ Awaiting payment confirmation from admin</div>`
      }
    </div>
  </div>`;
}

function markCollected() {
  riderState.collected = true;
  toast('Great! Now deliver to the customer 🏍️', 'ok');
  renderRiderDelivery();
  apiFetch(`/api/orders/${riderState.activeOrder?.id}/collected`, { method: 'POST' });
}

function showPin() {
  pinBuf = '';
  const rc = document.getElementById('rider-content');
  rc.innerHTML = `<div style="padding:24px 16px 100px;max-width:468px;margin:0 auto;text-align:center">
    <div style="font-size:2.5rem;margin-bottom:12px">🔐</div>
    <div class="h2" style="letter-spacing:2px;margin-bottom:6px">DELIVERY PIN</div>
    <p style="font-size:.87rem;color:var(--muted);margin-bottom:0">Ask for the 4-digit PIN <strong>after</strong> handing over the food</p>
    <div class="pin-disp">
      <div class="pc" id="p0">_</div><div class="pc" id="p1">_</div>
      <div class="pc" id="p2">_</div><div class="pc" id="p3">_</div>
    </div>
    <div class="numpad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `
        <button class="nk ${k === '' ? 'em' : ''} ${k === '⌫' ? 'bk' : ''}"
          onclick="${k === '⌫' ? 'pinDel()' : k !== '' ? `pinTap(${k})` : ''}">${k}</button>
      `).join('')}
    </div>
  </div>`;
  updatePinDisplay();
}

function pinTap(n) {
  if (pinBuf.length < 4) {
    pinBuf += n;
    updatePinDisplay();
    if (pinBuf.length === 4) setTimeout(confirmPin, 300);
  }
}

function pinDel() {
  pinBuf = pinBuf.slice(0, -1);
  updatePinDisplay();
}

function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`p${i}`);
    if (el) {
      el.textContent = pinBuf[i] ? '●' : '_';
      el.classList.toggle('f', !!pinBuf[i]);
      el.classList.remove('err');
    }
  }
}

async function confirmPin() {
  const r = await apiFetch(`/api/orders/${riderState.activeOrder?.id}/confirm-pin`, {
    method: 'POST',
    body: { pin: pinBuf }
  });

  if (r?.success) {
    const agreedFee = riderState.agreedFee
      || parseInt(localStorage.getItem('mb_agreed_fee'))
      || riderState.activeOrder?.delivery_fee
      || 0;

    const completedOrderId = riderState.activeOrder?.id;
    riderState.activeOrder = null;
    riderState.collected = false;
    riderState.todayTrips++;
    riderState.deliveries++;
    riderState.todayEarnings = (riderState.todayEarnings || 0) + agreedFee;
    riderState.agreedFee = 0;
    localStorage.removeItem('mb_agreed_fee');

    document.querySelectorAll('#s-rider .bnav-btn').forEach(b => b.classList.toggle('on', b.dataset.s === 'home'));
    renderRiderHome();
    toast(`🎉 PIN correct! Delivery complete${agreedFee ? ` · KES ${agreedFee} earned` : ''}. Collect cash from customer.`, 'ok', 6000);
    localStorage.removeItem('mb_active_delivery');
    if (completedOrderId) localStorage.removeItem('mb_chat_' + completedOrderId);
  } else {
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`p${i}`);
      if (el) el.classList.add('err');
    }
    pinBuf = '';
    setTimeout(updatePinDisplay, 600);
    toast('Wrong PIN. Ask customer to check their SMS.', 'err');
  }
}

// ── EARNINGS ──────────────────────────────────────────────────────────────────

async function renderRiderEarnings() {
  const rc = document.getElementById('rider-content');
  rc.innerHTML = `<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <div style="text-align:center;padding:20px 0 8px"><span class="spin"></span></div>
  </div>`;

  const data = await apiFetch('/api/rider/earnings') || {};

  const todayEarnings = data.today_earnings ?? riderState.todayEarnings ?? 0;
  const todayDeliveries = data.today_deliveries ?? riderState.todayTrips ?? 0;
  const totalEarnings = data.total_earnings ?? 0;
  const totalDeliveries = data.total_deliveries ?? riderState.deliveries ?? 0;
  const history = data.history ?? [];

  const historyHTML = history.length
    ? history.map(day => {
        const dateLabel = (() => {
          const today = new Date().toISOString().slice(0, 10);
          const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (day.date === today) return 'Today';
          if (day.date === yest) return 'Yesterday';
          const d = new Date(day.date + 'T00:00:00');
          return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
        })();
        return `
          <div style="background:var(--dark3);border-radius:10px;padding:14px;margin-bottom:9px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:700;font-size:.92rem">${dateLabel}</span>
              <span style="font-family:var(--fh);color:var(--green);font-size:1.1rem;letter-spacing:1px">KES ${day.earnings.toLocaleString()}</span>
            </div>
            <div style="font-size:.77rem;color:var(--muted);margin-bottom:8px">${day.deliveries} deliver${day.deliveries === 1 ? 'y' : 'ies'}</div>
            ${(day.orders || []).map(o => `
              <div style="display:flex;justify-content:space-between;font-size:.76rem;padding:4px 0;border-top:1px solid var(--line)">
                <span style="color:var(--muted)">#${o.order_number} · ${o.customer_area || ''}</span>
                <span style="font-weight:700">KES ${(o.delivery_fee || 0).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>`;
      }).join('')
    : `<div style="text-align:center;padding:30px;color:var(--muted);font-size:.85rem">No deliveries yet${data.history_cleared_at ? ' since last clear' : ''}</div>`;

  rc.innerHTML = `<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <div class="card">
      <div class="card-t">TODAY</div>
      <div style="text-align:center;padding:12px 0">
        <div style="font-family:var(--fh);font-size:3rem;color:var(--green);letter-spacing:2px">KES ${todayEarnings.toLocaleString()}</div>
        <div style="font-size:.82rem;color:var(--muted);margin-top:4px">${todayDeliveries} deliver${todayDeliveries === 1 ? 'y' : 'ies'} today</div>
      </div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="card-t">ALL-TIME TOTALS${data.history_cleared_at ? ` <span style="font-size:.68rem;color:var(--muted);font-family:var(--fb)">(since ${new Date(data.history_cleared_at).toLocaleDateString('en-KE')})</span>` : ''}</div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
        <span style="color:var(--muted)">Total earned</span>
        <span style="font-family:var(--fh);color:var(--green);font-size:1rem">KES ${totalEarnings.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
        <span style="color:var(--muted)">Total deliveries</span>
        <span style="font-weight:700">${totalDeliveries}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem">
        <span style="color:var(--muted)">Average rating</span>
        <span style="color:var(--green)">⭐ ${riderState.rating || 'N/A'}</span>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px">
      <div style="font-size:.8rem;font-weight:700;letter-spacing:1px;color:var(--muted)">EARNINGS HISTORY</div>
      ${history.length ? `<button onclick="clearEarningsHistory()" style="background:transparent;border:1px solid var(--line2);color:var(--muted);padding:5px 12px;border-radius:8px;font-size:.74rem;cursor:pointer">🗑 Clear History</button>` : ''}
    </div>
    ${historyHTML}
    <div class="card" style="margin-top:11px">
      <div class="card-t">TIPS TO EARN MORE</div>
      <div style="font-size:.84rem;color:var(--muted);line-height:1.85">
        • Stay online during peak hours (12–2pm, 6–9pm)<br>
        • Maintain 4.5+ rating for priority assignments<br>
        • Confirm PINs promptly for good customer reviews<br>
        • Be professional — customers rate higher when you are
      </div>
    </div>
  </div>`;
}

async function clearEarningsHistory() {
  if (!confirm('Clear your earnings history display?\n\nYour delivery records are kept safely — only the display counter resets.')) return;
  const res = await apiFetch('/api/rider/earnings/clear', { method: 'DELETE' });
  if (res?.success) {
    toast('✅ Earnings history cleared', 'ok');
    riderState.todayEarnings = 0;
    riderState.todayTrips = 0;
    renderRiderEarnings();
  } else {
    toast('Could not clear history', 'err');
  }
}

// ── LOCATION TRACKING ───────────────────────────────────────────────────────

function startLocTracking() {
  if (!navigator.geolocation) return;
  if (_locInterval) clearInterval(_locInterval);

  const interval = riderState.activeOrder ? 30000 : 300000;
  _locInterval = setInterval(() => {
    if (!riderState.online && !riderState.activeOrder) return;
    navigator.geolocation.getCurrentPosition(pos => {
      apiFetch('/api/rider/location', {
        method: 'POST',
        body: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString()
        }
      });
    }, err => console.warn('GPS error:', err), { enableHighAccuracy: !!riderState.activeOrder });
  }, interval);
}