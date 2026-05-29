// customer.js — MotoBite Customer App Module
// ============================================
// Customer-specific functionality
// Dependencies: core.js (must be loaded first)
// Loaded by: index.html
// ============================================

//CUSTOMER APP
let curCat='Brand New'

async function launchCustomer(){
    screen('s-customer');
    requestNotifPermission(); // ask for browser notification permission on first launch
    const h=new Date().getHours();
    document.getElementById('c-greet').textContent=`${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}, ${user.name}!`;
    // Fetch menu from backend, fall back to hardcoded MENU if offline
    const data = await apiFetch('/api/menu');
if(data && Object.keys(data).length){
  Object.keys(MENU).forEach(k => delete MENU[k]); // ← wipe hardcoded MENU first
  Object.keys(data).forEach(cat => { MENU[cat] = data[cat]; });

  localStorage.setItem('mb_menu_cache', JSON.stringify({
    data,
    timestamp: Date.now()
  }));
} else {
  // Try to load from cache if fetch fails
  const cached = localStorage.getItem('mb_menu_cache');
  if(cached){
    try {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if(age < 24 * 60 * 60 * 1000){ // cache valid for 24 hours
        Object.keys(MENU).forEach(k => delete MENU[k]); // ← wipe hardcoded MENU first
        Object.keys(data).forEach(cat => { MENU[cat] = data[cat]; });
        toast('Loaded menu from cache (offline mode) 🛠️','warn',5000);
      } 
    } catch {}
  } 
}

    renderCats(); renderMenu(); updateCartUI();

    // Restore active order on login
      const savedOid = localStorage.getItem('mb_active_order');
    if(savedOid){
        const order = await apiFetch(`/api/orders/${savedOid}`);
        if(order && !['delivered','cancelled'].includes(order.status)){
            showTracking(savedOid);
        } else { 
                   localStorage.removeItem('mb_active_order');
        }
    }

    // Act on notification tap intent that survived a page reload
    if(window._pendingNotifIntent){
      const intent = window._pendingNotifIntent;
      window._pendingNotifIntent = null;
      if(intent.action === 'openChat' && intent.orderId){
        setTimeout(() => openChat(intent.orderId, intent.role || 'customer'), 400);
      }
    }
  
}



function cPanel(id, btn=null){
    document.querySelectorAll('#s-customer .sp').forEach(p=>p.classList.remove('on'));
    document.getElementById(`cp-${id}`)?.classList.add('on');
    if(btn){ document.querySelectorAll('#s-customer .bnav-btn').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
}

function renderCats(){
    const cats=Object.keys(MENU);
    document.getElementById('cat-bar').innerHTML=cats.map(c=>`<button class="cat-btn${c===curCat?' on':''}" onclick="filterCat('${c}')">${c}</button>`).join('');
}

function filterCat(cat){ 
  curCat=cat; 
  renderCats(); 
  const section = document.querySelector('.menu-sec-lbl[data-cat="' + cat + '"]');
  if(section){
    section.scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    renderMenu()
  }
}

function initCategoryScroll(){
  if(_catObserver){_catObserver.disconnect(); _catObserver = null; } // prevents duplicate observers

  _catObserver = new IntersectionObserver((entries) => { // watches which cat sections are visible on screen
    const visible = entries // keeps only sections currently visible in viewport
    .filter(e => e.isIntersecting)
    .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top); // sort from top of screen to bottom
    if(!visible.length) return;
    const cat = visible[0].target.dataset.cat;
    if(cat && cat !== curCat){ // prevent unnecessary re-renders
      curCat = cat;
      renderCats(); // highlight new cat
      const activeBtn = document.querySelector('.cat-btn.on'); 
      if(activeBtn) activeBtn.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}); // keeps active cat centered in horizontal bar
    }
  }, {
    threshold: 0.1, // triggers when 10% visible
    rootMargin: '-20% 0px -60% 0px' // adjusts active zone, 20% from top, 60% before bottom
  });
  document.querySelectorAll('.menu-sec-lbl[data-cat]').forEach(el => _catObserver.observe(el));
}

function renderMenu(){
  const allCats = Object.entries(MENU);
    document.getElementById('menu-list').innerHTML=allCats.map(([c,items])=>`
    <div class="menu-sec-lbl" data-cat="${c}">${c}</div>
    <div class="mi-grid">${items.map((item,ii)=>`
        <div class="mi-card" style="animation-delay:${ii*.07}s" onclick="addToCart(${item.id})">
          <div class="mi-card-img">
            ${item.img
              ? `<img src="${item.img}" alt="${item.name}" loading="lazy"/>`
              : `<div class="mi-card-emoji">${F.emoji(c)}</div>`}
          </div>
          <div class="mi-card-body">
            <div class="mi-card-name">${item.name}</div>
            <div class="mi-card-desc">${item.desc || item.description || ''}</div>
            <div class="mi-card-foot">
              <div class="mi-card-price">${F.money(item.price)}</div>
              <div class="mi-add">+</div>
            </div>
          </div>
        </div>`).join('')}</div>
    `).join('');
    requestAnimationFrame(initCategoryScroll);

}




// Items that require a HC / OR chicken type choice before adding to cart
// These are items whose description says "OR / SPICY" — not wings, burgers, nuggets or
// items that already have a fixed type (Butter Chicken, Original Recipe only, Zinger etc.)
// Determines whether an item needs the HC / OR chicken type picker
// Returns true (full HC/OR picker), 'OR_ONLY' (auto-add as OR, no picker),
// or false (no choice needed)
// Name-based — works for hardcoded items AND DB-loaded items regardless of ID

function needsChickenChoice(item) {
  const name = (item.name || '').toLowerCase();
  const desc = (item.desc || item.description || '').toLowerCase();

  // ── Hard exclusions — fixed type, no choice ──────────────────────────────
  if (name.includes('zinger'))           return false;
  if (name.includes('sticky'))           return false;
  if (name.includes('nugget'))           return false;
  if (name.includes('pop'))              return false;
  if (name.includes('strip'))            return false;
  if (name.includes('bawa'))             return false;
  if (name.includes('hash brown'))       return false;
  if (name.includes('wrapstar'))         return false;
  if (name.includes('rice wrap'))        return false;
  if (name.includes('butter chicken') && !name.includes('streetwise')) return false;

  // ── OR only — Colonel Burger is Original Recipe, no HC option ─────────────
  if (name.includes('colonel burger'))   return 'OR_ONLY';

  // ── Full HC / OR choice ────────────────────────────────────────────────────
  if (name.includes('streetwise'))       return true;
  if (desc.includes('or / spicy') || desc.includes('or/spicy')) return true;
  if (name.includes('bucket'))           return true;
  if (name.includes('dipping'))          return true;
  if (name.includes('chicken lunchbox')) return true;
  if (name.includes('kiddie meal 2'))    return true;
  if (name.includes('mega wing box'))    return true;
  if (name.includes('crunch burger'))    return true;
  if (name.includes('double crunch'))    return true;
  if (name.includes('legend burger'))    return true;
  if (name.includes('nyama nyama'))      return true;
  if (name.includes('box master'))       return true;
  if (name.includes('crunch master'))    return true;
  if (name.includes('chicken')) return true;

  return false;
}

function addToCart(id){
  const item=Object.values(MENU).flat().find(i=>i.id===id);
  if(!item) return;

  const choice = needsChickenChoice(item);

  if(choice === 'OR_ONLY'){
    // Colonel Burger is Original Recipe — auto-add, no picker needed
    cart.push({...item, desc: item.desc || item.description || '', note:'', chickenType:'OR'});
    updateCartUI();
    toast(`${item.name} (OR) added! 🛒`);
    return;
  }

  if(choice === true){
    showChickenPicker(item);
    return;
  }

  // No chicken choice needed
  cart.push({...item, desc: item.desc || item.description || '', note:'', chickenType:null});
  updateCartUI();
  toast(`${item.name} added! 🛒`);
}

// ── CHICKEN TYPE PICKER ───────────────────────────────────────────────────────
// Shows a bottom sheet asking HC or OR before adding to cart.
// The choice is stored as chickenType on the cart item and shown in the cart,
// order summary, and kitchen board.

let _pickerItem = null; // item waiting for chicken type selection

function showChickenPicker(item){
  _pickerItem = item;

  // Create sheet if it doesn't exist yet
  if(!document.getElementById('chicken-sheet')){
    document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="chicken-ov" onclick="closeChickenPicker()"></div>
    <aside class="sheet" id="chicken-sheet">
      <div class="sh-in">
        <div class="sh-handle"></div>
        <h2 class="sh-title">CHOOSE YOUR CHICKEN</h2>
        <p style="font-size:.84rem;color:var(--muted);margin-bottom:18px" id="cp-item-name"></p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">

          <button class="chicken-opt" onclick="confirmChickenChoice('HC')">
            <div style="font-size:2rem;margin-bottom:6px">🔥</div>
            <div style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">Spicy</div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:4px">Hot &amp; Crispy</div>
          </button>

          <button class="chicken-opt" onclick="confirmChickenChoice('OR')">
            <div style="font-size:2rem;margin-bottom:6px">🍗</div>
            <div style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">Non-Spicy</div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:4px">Original Recipe</div>
          </button>

        </div>
        <button class="btn btn-ghost btn-full" onclick="closeChickenPicker()">Cancel</button>
      </div>
    </aside>`);

    // Inject button styles once
    const style = document.createElement('style');
    style.textContent=`
      .chicken-opt{
        background:var(--dark3);border:2px solid var(--line2);border-radius:var(--r);
        padding:18px 10px;cursor:pointer;color:var(--white);transition:.15s;width:100%;
      }
      .chicken-opt:hover,.chicken-opt:active{ border-color:var(--red);background:var(--dark2); }
    `;
    document.head.appendChild(style);
  }

  // Update item name label
  document.getElementById('cp-item-name').textContent = item.name;

  // Show sheet
  document.getElementById('chicken-ov').classList.add('on');
  document.getElementById('chicken-sheet').classList.add('on');
  document.body.style.overflow='hidden';
}

function confirmChickenChoice(type){
  // type is 'HC' or 'OR'
  if(!_pickerItem) return;
  const item = _pickerItem;
  _pickerItem = null;
  closeChickenPicker();

  cart.push({
    ...item,
    desc:        item.desc || item.description || '',
    note:        '',
    chickenType: type   // 'HC' or 'OR' — shown in cart, order summary & kitchen
  });
  updateCartUI();
  toast(`${item.name} (${type}) added! 🛒`);
}

function closeChickenPicker(){
  _pickerItem = null;
  document.getElementById('chicken-ov')?.classList.remove('on');
  document.getElementById('chicken-sheet')?.classList.remove('on');
  document.body.style.overflow='';
}


// Returns available add-ons for a cart item based on its name
function getAddOns(item) {
  const name = (item.name || '').toLowerCase();
  const addOns = [];

  // ── Dunk It — Streetwise 2, 3 and 5 only ────────────────────────────────
  if (['streetwise 2','streetwise 2 large','streetwise 2 meal','streetwise 2 crunch'].includes(name))
    addOns.push({ key:'dunk', label:'Dunk It (2 pcs)', price:150});
  if (['streetwise 3','streetwise 3 with rice','streetwise 3 meal','streetwise 3 crunch'].includes(name))
    addOns.push({ key:'dunk', label:'Dunk It (3 pcs)', price:170});
  if (['streetwise 5','streetwise 5 crunch'].includes(name))
    addOns.push({ key:'dunk', label:'Dunk It (5 pcs)', price:290});

  // ── Upsize chips ──────────────────────────────────────────────────────────
  // Regular → Large (+120): Streetwise 1, 2, 3 variants (not crunch, not 5/7)
  if (name.includes('streetwise') && !name.includes('crunch') && !name.includes('with rice') &&
      !name.includes('streetwise 5') && !name.includes('streetwise 7') && !name.includes('streetwise 9'))
    addOns.push({ key:'upsize_lg', label:'Upsize to Large Chips +120', price:120,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/4f7f0a4a-4159-7c62-35f6-1b2220b6167b.jpeg?a=c1974a1a-10e6-e981-ab6c-79ceb536ade5' });
  // Large → Family (+220): Streetwise 5 only (7 already has family chips)
  if (name.includes('streetwise 5') && !name.includes('crunch'))
    addOns.push({ key:'upsize_fam', label:'Upsize to Family Chips +220', price:220,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0838ced2-9f6c-1380-bc7e-b73894eb68dd.jpeg?a=bbffd18d-2738-770b-4b5c-d56f10b6dcf3' });

  // ── Salad — all Streetwise items ─────────────────────────────────────────
  if (name.includes('streetwise') && !name.includes('streetwise 9')) {
    addOns.push({ key:'salad_sm',  label:'Add Salad Small',   price:100,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });
    addOns.push({ key:'salad_reg', label:'Add Salad Regular', price:270,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });
    addOns.push({ key:'salad_lg',  label:'Add Salad Large',   price:350,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });
  }

  // ── Small Coleslaw — Burgers only (not lunchbox) ──────────────────────────
  if (name.includes('burger') && !name.includes('lunchbox'))
    addOns.push({ key:'coleslaw_sm', label:'Add Coleslaw Small', price:100,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });

  return addOns;
}

function toggleAddOn(cartIdx, key, price, label) {
  if(!cart[cartIdx].addOns) cart[cartIdx].addOns = {};
  if(cart[cartIdx].addOns[key]) {
    delete cart[cartIdx].addOns[key];
  } else {
    cart[cartIdx].addOns[key] = {label, price};
  }
  renderCartSheet();
  updateCartUI();
}

function updateCartUI(){
    const count=cart.length;
    const total=cart.reduce((s,item)=>{
      const addOnTotal = Object.values(item.addOns||{}).reduce((a,x)=>a+x.price,0);
      return s + item.price + addOnTotal;
    },0);
    const fl=document.getElementById('cart-float');
    if(count>0){
      fl.classList.remove('hidden');
      document.getElementById('cf-cnt').textContent=count;
      document.getElementById('cf-p').textContent=F.money(total);
    } else { fl.classList.add('hidden'); }
}

function openCart(){ renderCartSheet(); 
  document.getElementById('cart-ov').classList.add('on'); // shows the dark overlay behind the cart sheet
   document.getElementById('cart-sh').classList.add('on'); // slides the cart sheet up
   document.body.style.overflow='hidden'; } // prevents the page behind from scrolling while cart is open

function closeCart(){ document.getElementById('cart-ov').classList.remove('on'); 
  document.getElementById('cart-sh').classList.remove('on'); 
  document.body.style.overflow=''; }

function renderCartSheet(){
  const li=document.getElementById('cart-items'), su=document.getElementById('cart-sum'), ac=document.getElementById('cart-acts');
  if(!cart.length){
    li.innerHTML='<div class="empty"><div class="ei">🛒</div><h3>CART IS EMPTY</h3><p>Add items from the menu</p></div>';
    su.innerHTML=ac.innerHTML=''; return;
  }
  li.innerHTML=cart.map((item,i)=>{
    const addOns = getAddOns(item);
    const selected = item.addOns || {};
    const addOnHTML = addOns.length ? `
      <div style="margin:7px 0 4px;display:flex;flex-direction:column;gap:6px">
        ${addOns.map(a=>`
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--dark3);border-radius:8px;padding:6px 8px;border:1.5px solid ${selected[a.key]?'var(--red)':'var(--line)'}">
            <img src="${a.img}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0"/>
            <span style="flex:1;font-size:.78rem;color:var(--white)">${a.label} <strong style="color:var(--red)">+${F.money(a.price)}</strong></span>
            <input type="checkbox" ${selected[a.key]?'checked':''}
              onchange="toggleAddOn(${i},'${a.key}',${a.price},'${a.label}')"
              style="accent-color:var(--red);width:16px;height:16px;cursor:pointer;flex-shrink:0"/>
          </label>`).join('')}
      </div>` : '';
    return `
    <div class="ci">
      <div class="ci-info">
        <div class="ci-name">${item.name}${item.chickenType?` <span style="background:var(--red);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:.5px;vertical-align:middle">${item.chickenType}</span>`:''}</div>
        ${addOnHTML}
        <input class="note-inp" placeholder="Special note (e.g. no onions)..." value="${item.note||''}" oninput="cart[${i}].note=this.value"/>
      </div>
      <div class="ci-r">
        <div class="ci-price">${F.money(item.price + Object.values(selected).reduce((s,a)=>s+a.price,0))}</div>
        <button class="ci-rm" onclick="removeCartItem(${i})">✕</button>
      </div>
    </div>`;
  }).join('');

  const total = cart.reduce((s,item)=>{
    return s + item.price + Object.values(item.addOns||{}).reduce((a,x)=>a+x.price,0);
  },0);

  su.innerHTML=`<div class="cart-sum">
    <div class="srow"><span>Food subtotal</span><span>${F.money(total)}</span></div>
    <div class="srow">
  <span>Delivery fee</span>
  <span class="nt" style="color:var(--orange);font-size:.75rem">⏳ Agreed with rider on assignment</span>
</div>
    <div class="srow tot"><span>Pay to KFC Till</span><span>${F.money(total)}</span></div>
  </div>`;
  ac.innerHTML=`
  <div style="font-size:.78rem;color:var(--muted);text-align:center;font-weight:700;letter-spacing:.5px;margin-bottom:10px">HOW WOULD YOU LIKE YOUR ORDER?</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">

    <button id="btn-pickup" onclick="chooseOrderType('pickup')"
      style="background:var(--dark3);border:2px solid var(--line2);border-radius:14px;
             padding:18px 10px;cursor:pointer;color:var(--white);text-align:center;transition:.15s">
      <div style="font-size:2.2rem;margin-bottom:6px">🚶</div>
      <div style="font-family:var(--fh);font-size:.88rem;letter-spacing:1px">COLLECT</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:4px">Pick up at KFC Narok</div>
      <div style="font-size:.68rem;color:var(--green);margin-top:3px;font-weight:600">No delivery fee</div>
    </button>

    <button id="btn-delivery" onclick="chooseOrderType('delivery')"
      style="background:var(--dark3);border:2px solid var(--line2);border-radius:14px;
             padding:18px 10px;cursor:pointer;color:var(--white);text-align:center;transition:.15s">
      <div style="font-size:2.2rem;margin-bottom:6px">🛵</div>
      <div style="font-family:var(--fh);font-size:.88rem;letter-spacing:1px">DELIVER</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:4px">Bring it to me</div>
      <div style="font-size:.68rem;color:var(--orange);margin-top:3px;font-weight:600">+ Rider fee applies</div>
    </button>

  </div>
  <button class="btn btn-ghost btn-full" style="color:var(--red);font-size:.82rem" onclick="cart=[];updateCartUI();closeCart()">🗑 Clear Cart</button>`;
}

function chooseOrderType(type){
  orderType = type;
  const pickup   = document.getElementById('btn-pickup');
  const delivery = document.getElementById('btn-delivery');
  if(pickup){
    pickup.style.borderColor  = type==='pickup' ? 'var(--green)' : 'var(--line2)';
    pickup.style.background   = type==='pickup' ? 'rgba(76,175,80,.18)' : 'var(--dark3)';
  }
  if(delivery){
    delivery.style.borderColor = type==='delivery' ? 'var(--red)'   : 'var(--line2)';
    delivery.style.background  = type==='delivery' ? 'rgba(229,57,53,.14)' : 'var(--dark3)';
  }
  // Brief highlight then navigate
  setTimeout(() => {
    closeCart();
    if(type === 'pickup'){
      // Self-pickup: skip location panel, go straight to payment
      userLoc = { lat: null, lng: null, areaName: 'KFC Narok (Self-Pickup)', landmark: '' };
      goToPayment();
    } else {
      // Delivery: show location panel
      cPanelLocation();
    }
  }, 200);
}

function removeCartItem(i){
   cart.splice(i,1); // removes an item from the cart when x is clicked
   updateCartUI(); renderCartSheet();
   if(!cart.length)closeCart(); }


 
// ══════════════════════════════════════════════════════════════════════════════
// LOCATION SYSTEM  —  3-path UX  (GPS → area chips → type landmark)
// Matches the HTML in cp-location: no map, no dragging, no technical concepts.
//
// Flow:
//   1. Panel opens → GPS fires automatically (user does nothing)
//   2a. GPS good + within zone → green confirmed box → one tap to continue
//   2b. GPS bad/out-of-zone   → area picker shown automatically
//   3. Area picker: tap a neighbourhood chip → confirm button lights up
//   4. Landmark field: type any extra detail (optional but helpful for rider)
// ══════════════════════════════════════════════════════════════════════════════

const KFC_LAT = -1.0907;
const KFC_LNG =  35.8710;
const MAX_KM  =  50;

// Known Narok-area delivery spots — shown as tappable chips
const NAROK_AREAS = [
  { name:'Narok Town Centre',   lat:-1.0867, lng:35.8716 },
  { name:'Narok Hospital',      lat:-1.0806, lng:35.8677 },
  { name:'Maasai Mara Uni',     lat:-1.1102, lng:35.8430 },
  { name:'Narok Stage',         lat:-1.0880, lng:35.8695 },
  { name:'Shell Petrol Station',lat:-1.0921, lng:35.8744 },
  { name:'Total Petrol Station',lat:-1.0855, lng:35.8720 },
  { name:'KCB / ABSA Bank',     lat:-1.0872, lng:35.8708 },
  { name:'Ewaso Estate',        lat:-1.0950, lng:35.8660 },
  { name:'Naserian Estate',     lat:-1.0930, lng:35.8680 },
  { name:'Police Station',      lat:-1.0841, lng:35.8699 },
  { name:'Narok Stadium',       lat:-1.0990, lng:35.8750 },
  { name:'Nakuru Road Area',    lat:-1.0820, lng:35.8760 },
  { name:'Oloolaimutia',        lat:-1.0750, lng:35.8800 },
  { name:'Melelo',              lat:-1.0650, lng:35.8550 },
];

let _gpsLat = null;
let _gpsLng = null;
let _selectedArea = null; // { name, lat, lng } from chip tap

// ── Open panel ────────────────────────────────────────────────────────────────
function cPanelLocation(){
  cPanel('location');
  // Reset to clean state every time panel opens
  _gpsLat = null; _gpsLng = null; _selectedArea = null;
  resetLocUI();
  populateAreaGrid();
  tryGPS();
}

function resetLocUI(){
  setEl('loc-gps-bar',       { display:'flex' });
  setEl('loc-gps-confirmed', { display:'none' });
  setEl('loc-area-picker',   { display:'none' });
  setEl('loc-err-box',       { text:'', cls:'hidden' });
  const lbl = document.getElementById('loc-landmark');
  if(lbl) lbl.value = '';
  enableLocBtn(false); // disabled until GPS confirms or chip/landmark selected
  setGpsStatus('📡', 'Getting your location…', false);
}

// ── Helper: set element display/text quickly ──────────────────────────────────
function setEl(id, opts={}){
  const el = document.getElementById(id);
  if(!el) return;
  if(opts.display !== undefined) el.style.display = opts.display;
  if(opts.text    !== undefined) el.textContent = opts.text;
  if(opts.html    !== undefined) el.innerHTML = opts.html;
  if(opts.cls     !== undefined){ el.className=''; if(opts.cls) el.className=opts.cls; }
}

function setGpsStatus(ico, txt, showRetry=false){
  setEl('loc-gps-ico', { text: ico });
  setEl('loc-gps-txt', { text: txt });
  const retry = document.getElementById('loc-gps-retry');
  if(retry) retry.style.display = showRetry ? 'inline' : 'none';
}

// ── GPS ───────────────────────────────────────────────────────────────────────
let _gpsWatcher = null;
let _gpsTimeout = null;
let _gpsBestAccuracy = Infinity;

function tryGPS(){
  setGpsStatus('📡', 'Getting your location…', false);
  if(!navigator.geolocation){ onGPSFail({ code:2 }); return; }

  // Clear any previous watcher
  if(_gpsWatcher != null){ navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null; }
  if(_gpsTimeout)  { clearTimeout(_gpsTimeout); _gpsTimeout=null; }
  _gpsBestAccuracy = Infinity;

  // watchPosition keeps refining — cell-tower (~300m) first, then GPS chip (<20m).
  // We accept the first reading that is (a) within zone OR (b) accurate enough to trust.
  // After 15 s we give up and fall back to the area picker.
  _gpsTimeout = setTimeout(() => {
    if(_gpsWatcher != null){ navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null; }
    if(!_gpsLat){
      setGpsStatus('📍', 'GPS timed out — choose your area below', true);
      showAreaPicker();
    }
  }, 15000);

  _gpsWatcher = navigator.geolocation.watchPosition(
    pos => {
      const { latitude:lat, longitude:lng, accuracy } = pos.coords;
      if(accuracy >= _gpsBestAccuracy) return; // ignore if not improving
      _gpsBestAccuracy = accuracy;

      const dist = haversine(lat, lng, KFC_LAT, KFC_LNG);

      if(dist > MAX_KM && accuracy > 200){
        // Out of zone BUT still low-accuracy — keep watching, GPS may improve
        setGpsStatus('📡', `Improving GPS… (±${Math.round(accuracy)}m)`, false);
        return;
      }

      // Commit: either within zone, or high-accuracy but truly out of zone
      clearTimeout(_gpsTimeout); _gpsTimeout=null;
      navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null;
      onGPSSuccess(pos);
    },
    err => {
      if(_gpsTimeout){ clearTimeout(_gpsTimeout); _gpsTimeout=null; }
      if(_gpsWatcher != null){ navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null; }
      onGPSFail(err);
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

function onGPSSuccess(pos){
  const { latitude:lat, longitude:lng, accuracy } = pos.coords;
  const dist = haversine(lat, lng, KFC_LAT, KFC_LNG);

  // Out of zone = ISP address (Nairobi), not real device GPS
  if(dist > MAX_KM){
    setGpsStatus('⚠️', `GPS shows you ${Math.round(dist)} km away — please choose your area below`, true);
    showAreaPicker();
    return;
  }

  // Good GPS — store and show confirmed box
  _gpsLat = lat; _gpsLng = lng;

  const accLabel = accuracy < 50  ? `±${Math.round(accuracy)}m (high accuracy)`
                 : accuracy < 200 ? `±${Math.round(accuracy)}m — tap "Not right?" if off`
                 :                  `±${Math.round(accuracy)}m (approximate)`;

  setGpsStatus('✅', 'Location found', false);
  setEl('loc-gps-bar', { display:'none' });

  // Reverse geocode — get area name silently in background
  reverseGeocode(lat, lng).then(areaName => {
    _selectedArea = { lat, lng, name: areaName };
    setEl('loc-gps-area', { text: areaName });
    setEl('loc-gps-dist', { text: `${dist.toFixed(1)} km from KFC Narok  ·  ${accLabel}` });
    setEl('loc-gps-confirmed', { display:'block' });
    enableLocBtn(true);
  });
}

function onGPSFail(err){
  const msg = err.code === 1
    ? '📍 Location access denied — choose your area below'
    : '📍 GPS unavailable — choose your area below';
  setGpsStatus('📍', msg, true);
  showAreaPicker();
}

// ── Area picker ───────────────────────────────────────────────────────────────
function populateAreaGrid(){
  const grid = document.getElementById('loc-area-grid');
  if(!grid) return;
  grid.innerHTML = NAROK_AREAS.map((a,i) => `
    <button onclick="selectArea(${i})" id="area-chip-${i}"
      style="padding:11px 8px;background:var(--dark3);border:1.5px solid var(--line2);
             border-radius:10px;color:var(--white);font-size:.8rem;font-weight:600;
             cursor:pointer;text-align:center;line-height:1.25;transition:all .15s">
      ${a.name}
    </button>`).join('');
}

function showAreaPicker(){
  setEl('loc-area-picker', { display:'block' });
}

function selectArea(i){
  const area = NAROK_AREAS[i];
  if(!area) return;
  _selectedArea = { lat:area.lat, lng:area.lng, name:area.name };

  // Highlight selected chip, reset others
  NAROK_AREAS.forEach((_,j) => {
    const chip = document.getElementById(`area-chip-${j}`);
    if(!chip) return;
    if(j === i){
      chip.style.background     = 'var(--red)';
      chip.style.borderColor    = 'var(--red)';
      chip.style.color          = '#fff';
    } else {
      chip.style.background     = 'var(--dark3)';
      chip.style.borderColor    = 'var(--line2)';
      chip.style.color          = 'var(--white)';
    }
  });

  enableLocBtn(true);
  setEl('loc-err-box', { text:'', cls:'hidden' });
}

function onLandmarkInput(){
  // If no area chip is selected yet, treat a typed landmark as confirmation too
  const val = document.getElementById('loc-landmark')?.value.trim();
  if(val && val.length >= 3 && !_selectedArea){
    // Use KFC location as lat/lng fallback — rider uses the landmark text to navigate
    _selectedArea = { lat: KFC_LAT, lng: KFC_LNG, name:'Narok Town' };
  }
  if(val || _selectedArea) enableLocBtn(true);
}

// ── Confirm ───────────────────────────────────────────────────────────────────
function confirmLocation(){
  const landmark = document.getElementById('loc-landmark')?.value.trim();
  const errBox   = document.getElementById('loc-err-box');

  if(!_selectedArea && !landmark){
    errBox.textContent = 'Please choose your area or type a landmark first.';
    errBox.classList.remove('hidden');
    return;
  }

  // Merge GPS coords if available and better than chip coords
  const lat  = (_gpsLat && haversine(_gpsLat, _gpsLng, KFC_LAT, KFC_LNG) <= MAX_KM)
               ? _gpsLat : (_selectedArea?.lat ?? KFC_LAT);
  const lng  = (_gpsLng && haversine(_gpsLat, _gpsLng, KFC_LAT, KFC_LNG) <= MAX_KM)
               ? _gpsLng : (_selectedArea?.lng ?? KFC_LNG);

  const areaName   = _selectedArea?.name || 'Narok Town';
  const fullLabel  = landmark ? `${areaName} — ${landmark}` : areaName;

  userLoc = { lat, lng, areaName: fullLabel, landmark: landmark || '' };
  toast(`📍 Delivering to: ${fullLabel}`, 'ok');
  goToPayment();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function enableLocBtn(on){
  const btn = document.getElementById('loc-btn');
  if(!btn) return;
  btn.disabled     = !on;
  btn.style.opacity = on ? '1' : '0.45';
  btn.textContent  = on ? 'Confirm Location →' : 'Confirm Location →';
}

async function reverseGeocode(lat, lng){
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers:{ 'Accept-Language':'en' } }
    );
    const d = await r.json();
    const a = d.address || {};
    return a.township || a.suburb || a.village || a.town
           || a.city_district || a.city || a.county || 'Narok Town';
  } catch { return 'Narok Town'; }
}

// Legacy stubs — keep so any old references don't crash
function getLocation(){ cPanelLocation(); }
function initLocMap(){  cPanelLocation(); }
function recenterOnGPS(){ tryGPS(); }


function escapeHtml(text) {
  if(!text) return '';
  return text 
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function goToPayment(){
  const total = cart.reduce((s,i)=>s+i.price+Object.values(i.addOns||{}).reduce((a,x)=>a+x.price,0),0);

  // Render the entire payment panel dynamically with M-Pesa + Card tabs
  const panel = document.getElementById('cp-payment');
  if(panel){
    panel.innerHTML = `
      <div class="sp-hdr">
        <button class="back-btn" onclick="cPanel('menu')">←</button>
        <h2 class="sp-title">PAYMENT</h2>
      </div>
      <div style="padding:0 16px 100px;max-width:480px;margin:0 auto">

        <!-- Order total -->
        <div style="text-align:center;margin:18px 0 22px">
          <div style="font-size:.72rem;color:var(--muted);letter-spacing:2px">ORDER TOTAL</div>
          <div style="font-family:var(--fh);font-size:2.4rem;letter-spacing:2px;color:var(--red)" id="pay-amt">${F.money(total)}</div>
        </div>

        <!-- Payment method tabs -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px">
          <button id="tab-mpesa" onclick="switchPayTab('mpesa')"
            style="padding:12px 8px;border-radius:10px;border:2.5px solid var(--red);
                   background:var(--red);color:#fff;font-family:var(--fh);font-size:.8rem;
                   letter-spacing:1px;cursor:pointer;transition:.15s">
            <div style="font-size:1.3rem;margin-bottom:4px">💚</div>M-PESA
          </button>
          <button id="tab-card" onclick="switchPayTab('card')"
            style="padding:12px 8px;border-radius:10px;border:2.5px solid var(--line2);
                   background:var(--dark3);color:var(--white);font-family:var(--fh);font-size:.8rem;
                   letter-spacing:1px;cursor:pointer;transition:.15s">
            <div style="font-size:1.3rem;margin-bottom:4px">💳</div>CARD / OTHER
          </button>
        </div>

        <!-- ── M-PESA PANEL ── -->
        <div id="pay-panel-mpesa">
          <div id="stk-status" style="display:none;background:var(--dark3);border:1px solid var(--green);
            border-radius:10px;padding:14px;margin-bottom:14px;text-align:center">
            <div style="font-size:1.4rem;margin-bottom:6px">📱</div>
            <div style="font-family:var(--fh);font-size:.85rem;color:var(--green);letter-spacing:1px">CHECK YOUR PHONE</div>
            <div style="font-size:.78rem;color:var(--muted);margin-top:4px">Enter your M-Pesa PIN to complete payment</div>
          </div>
          <div id="manual-pay">
            <div style="background:var(--dark3);border-radius:10px;padding:14px;margin-bottom:16px;font-size:.83rem">
              <div style="font-family:var(--fh);font-size:.75rem;color:var(--muted);letter-spacing:1.5px;margin-bottom:10px">HOW TO PAY</div>
              <div style="display:flex;flex-direction:column;gap:8px;color:var(--white)">
                <div>1. Go to <strong>M-Pesa → Lipa na M-Pesa → Buy Goods</strong></div>
                <div>2. Till Number: <strong style="color:var(--red);font-size:1.05rem">9119681</strong></div>
                <div>3. Amount: <strong style="color:var(--red)" id="pay-amt2">${F.money(total)}</strong></div>
              </div>
            </div>
            <div class="field" style="margin-bottom:12px">
              <label class="field-lbl">M-Pesa Registered Name</label>
              <input class="inp" id="mpesa-name" placeholder="e.g. JOHN DOE" style="text-transform:uppercase"/>
            </div>
            <div class="field" style="margin-bottom:18px">
              <label class="field-lbl">Amount Paid (KES)</label>
              <input class="inp" id="mpesa-amount" type="number" inputmode="numeric"
                placeholder="${total}" value="${total}"/>
            </div>
          </div>
          <button class="btn btn-primary btn-full btn-lg" id="pay-btn" onclick="initPay()">
            ✅ I Have Paid — Place Order
          </button>
        </div>

        <!-- ── PESAPAL CARD PANEL ── -->
        <div id="pay-panel-card" style="display:none">
          <div style="background:var(--dark3);border-radius:10px;padding:16px;margin-bottom:16px;text-align:center;font-size:.83rem;color:var(--muted)">
            Pay securely with <strong style="color:var(--white)">Visa · Mastercard · Amex</strong><br>
            or bank transfer — powered by Pesapal.
            <div style="margin-top:12px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                style="height:16px;opacity:.85" alt="Visa"/>
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                style="height:24px;opacity:.85" alt="Mastercard"/>
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg"
                style="height:20px;opacity:.85" alt="Amex"/>
            </div>
          </div>

          <div style="background:var(--dark3);border-radius:10px;padding:12px 14px;margin-bottom:16px;
            display:flex;justify-content:space-between;align-items:center;font-size:.84rem">
            <span style="color:var(--muted)">You will be charged</span>
            <span style="font-family:var(--fh);font-size:1.15rem;color:var(--red);letter-spacing:1px">${F.money(total)}</span>
          </div>

          <div style="background:var(--dark3);border-radius:10px;padding:11px 14px;margin-bottom:20px;
            font-size:.78rem;color:var(--muted);display:flex;gap:8px;align-items:flex-start">
            <span style="color:var(--green);font-size:1rem;flex-shrink:0">🔒</span>
            <span>Your order is placed first. A secure Pesapal payment page opens — your card details never touch our servers.</span>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="card-pay-btn" onclick="initPesapalPayment()">
            💳 Pay ${F.money(total)} with Card
          </button>
          <div style="text-align:center;margin-top:10px;font-size:.72rem;color:var(--muted)">
            Secured by <strong style="color:var(--white)">Pesapal</strong> · PCI-DSS compliant · SSL encrypted
          </div>
        </div>

      </div>`;
  }
  cPanel('payment');
}

// Switch M-Pesa ↔ Card tabs
function switchPayTab(tab){
  const isMpesa = tab === 'mpesa';
  const active  = { background:'var(--red)', borderColor:'var(--red)', color:'#fff' };
  const idle    = { background:'var(--dark3)', borderColor:'var(--line2)', color:'var(--white)' };
  const apply   = (el, styles) => el && Object.assign(el.style, styles);

  apply(document.getElementById('tab-mpesa'), isMpesa ? active : idle);
  apply(document.getElementById('tab-card'),  isMpesa ? idle : active);

  const mpesaPane = document.getElementById('pay-panel-mpesa');
  const cardPane  = document.getElementById('pay-panel-card');
  if(mpesaPane) mpesaPane.style.display = isMpesa ? 'block' : 'none';
  if(cardPane)  cardPane.style.display  = isMpesa ? 'none'  : 'block';
}

async function initPay() {
  if(!cart || !cart.length){
    toast('Your cart is empty! Add items before placing an order.','err',4000); return;
  }
const mpesaName = document.getElementById('mpesa-name')?.value.trim().toUpperCase();
const amountPaid = parseInt(document.getElementById('mpesa-amount')?.value);
const orderTotal = cart.reduce((s,i)=>s+i.price+Object.values(i.addOns||{}).reduce((a,x)=>a+x.price,0),0);

if(!userLoc && orderType !== 'pickup'){
  toast('📍 Please confirm your delivery location first','err',4000);
  cPanelLocation(); return;
}

if(!mpesaName || mpesaName.length < 3){
  toast('Enter your M-Pesa registered name','err',4000); return;
}

if(!amountPaid || amountPaid < orderTotal){
  toast(`Amount must be at least KES ${orderTotal.toLocaleString()}`,'err',4000); return;
}
  const btn=document.getElementById('pay-btn');
  btn.innerHTML='<span class="spin"></span> Placing order...'; btn.disabled=true;
  const total=orderTotal;
  const notes=cart.filter(i=>i.note||i.chickenType||Object.keys(i.addOns||{}).length).map(i=>{
    const addOnStr = Object.values(i.addOns||{}).map(a=>a.label).join(', ');
    return `${i.name}${i.chickenType?' ['+i.chickenType+']':''}${addOnStr?' + '+addOnStr:''}: ${i.note||''}`;
  }).join('; ');
  const orderItems = cart.map(item => ({
    ...item,
    price: item.price + Object.values(item.addOns||{}).reduce((s,a)=>s+a.price,0)
  }));

  const order=await apiFetch('/api/orders',{method:'POST',body:{
    customer_phone: user.phone,
    customer_name:  user.name,
    items:orderItems, notes, 
    order_type: orderType,
    location: orderType === 'pickup' ? null : userLoc,
    customer_lat:  orderType === 'pickup' ? null : userLoc?.lat,
    customer_lng:   orderType === 'pickup' ? null : userLoc?.lng,
    customer_area:  orderType === 'pickup' ? 'KFC Narok (Self-Pickup)' : userLoc?.areaName,
    mpesa_reference:`${mpesaName} · KES ${amountPaid}`
  }});

  

  // If order creation failed — stop here, show error, let customer try again
  if(!order?.id){
    btn.innerHTML='✅ I Have Paid — Place Order'; btn.disabled=false;
    toast('Could not place order — check your connection and try again','err',5000);
    return;
  }

  const oid=order.id;
  active0Id=oid;
  localStorage.setItem('mb_active_order',oid);
 
  // Show STK status box if the backend sent a push, otherwise keep manual instructions
    const stkBox=document.getElementById('stk-status');
  const manualPay=document.getElementById('manual-pay');
  if(order.stkSent){
    // STK push was sent — highlight the phone prompt
    if(stkBox)  stkBox.style.display='block';
    if(manualPay) manualPay.style.display='none';
    cart = []; updateCartUI();
    document.getElementById('cart-float')?.classList.add('hidden'); // hide View Order btn
    btn.innerHTML='📱 Waiting for M-Pesa payment...'; btn.disabled=true;
    toast('Check your phone — M-Pesa prompt sent! 📱','ok',6000);
  } else {
    // Manual payment flow
    btn.innerHTML = '✅ Confirm Payment';
    btn.disabled = false;
    btn.onclick = () => confirmPayment(oid);
    toast('Order placed! Pay via M-Pesa, then click "Confirm Payment" 📱', 'ok', 5000);
    cart = [];
    updateCartUI();
    document.getElementById('cart-float')?.classList.add('hidden'); // hide View Order btn
    showTracking(oid);
  } // end else
} // end initPay

// Customer confirms they have paid via M-Pesa
async function confirmPayment(orderId) {
  const btn = document.getElementById('pay-btn');
  if (!btn) return;
  
  // Confirm with user
  if (!confirm('Have you completed the M-Pesa payment?')) return;
  
  btn.innerHTML = '<span class="spin"></span> Confirming payment...';
  btn.disabled = true;
  
  const res = await apiFetch(`/api/orders/${orderId}/confirm-payment`, {
    method: 'PUT'
  });
  
  if (res?.success) {
    toast('✅ Payment confirmed! Your order is being prepared.', 'ok');
    // Clear cart and hide float so "View Order" button disappears
    cart = [];
    updateCartUI();
    // Update order status
    active0Id = orderId;
    localStorage.setItem('mb_active_order', orderId);
    // Refresh tracking to show updated status
    showTracking(orderId);
  } else {
    toast(res?.error || '❌ Failed to confirm payment. Try again.', 'err');
    btn.innerHTML = '✅ I Have Paid';
    btn.disabled = false;

    if (res?.success) {
    document.getElementById('cart-float')?.classList.add('hidden'); // ADD
    
    }
  }
}

// ── PESAPAL CARD PAYMENT ──────────────────────────────────────────────────────
// Flow:
//  1. Create order in our DB (status: pending)
//  2. Call backend → Pesapal API → get hosted payment URL
//  3. Open full-screen iframe overlay with Pesapal's payment page
//  4. Poll our backend every 3 s for status change
//  5. When status ≠ 'pending' → payment done → close iframe → tracking screen
//  6. Pesapal also sends an IPN webhook to backend (belt-and-suspenders)

let _pesapalPollTimer = null;
// ✅ Fix - track if an order was already created
let _pendingCardOrderId = null;
let _savedCart = []; // In case we need to restore cart if payment fails or is cancelled
async function initPesapalPayment() {
  const btn = document.getElementById('card-pay-btn');

  // ── Guard: cart must have items ──────────────────────────────────────────
  if (!cart || cart.length === 0) {
    toast('Your cart is empty', 'err', 3000);
    return;
  }

  // ── Calculate total & build order data ──────────────────────────────────
  const total = cart.reduce((s, i) =>
    s + i.price + Object.values(i.addOns || {}).reduce((a, x) => a + x.price, 0), 0
  );

  const notes = cart
    .filter(i => i.note || i.chickenType || Object.keys(i.addOns || {}).length)
    .map(i => {
      const addOnStr = Object.values(i.addOns || {}).map(a => a.label).join(', ');
      return `${i.name}${i.chickenType ? ' [' + i.chickenType + ']' : ''}${addOnStr ? ' + ' + addOnStr : ''}: ${i.note || ''}`;
    }).join('; ');

  const orderItems = cart.map(item => ({
    ...item,
    price: item.price + Object.values(item.addOns || {}).reduce((s, a) => s + a.price, 0)
  }));

  // ── Guard: delivery needs a location ────────────────────────────────────
  const orderType = (typeof _orderType !== 'undefined') ? _orderType : 'delivery';

  if (orderType !== 'pickup' && !userLoc) {
    toast('📍 Please confirm your delivery location first', 'err', 4000);
    cPanelLocation();
    return;
  }

  // ── If pending order exists, re-use it ──────────────────────────────────
  if (_pendingCardOrderId) {
    if (btn) { btn.innerHTML = '<span class="spin"></span> Reopening payment...'; btn.disabled = true; }

    const session = await apiFetch(
      `/api/orders/${_pendingCardOrderId}/pesapal-checkout`,
      { method: 'POST' }
    );

    if (session?.redirectUrl) {
      if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
      openPesapalIframe(session.redirectUrl, _pendingCardOrderId, session.orderNumber, total);
      return;
    }

    // Session re-fetch failed — fall through to create a new order
    _pendingCardOrderId = null;
  }

  // ── Disable button ───────────────────────────────────────────────────────
  if (btn) { btn.innerHTML = '<span class="spin"></span> Setting up payment...'; btn.disabled = true; }

  try {
    // ── Step 1: Create order ───────────────────────────────────────────────
    const order = await apiFetch('/api/orders', {
      method: 'POST',
      body: {
        customer_phone:  user.phone,
        customer_name:   user.name,
        items:           orderItems,
        notes,
        location:        userLoc,
        customer_lat:    userLoc?.lat,
        customer_lng:    userLoc?.lng,
        customer_area:   userLoc?.areaName,
        order_type:      orderType,
        payment_method:  'card',
        mpesa_reference: 'CARD — awaiting Pesapal confirmation'
      }
    });

    if (!order?.id) {
      toast('Could not create order — check your connection', 'err', 5000);
      if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
      return;
    }

    // Save order ID in case user cancels and retries
    _pendingCardOrderId = order.id;

    // ── Step 2: Get Pesapal payment URL ───────────────────────────────────
    const session = await apiFetch(
      `/api/orders/${order.id}/pesapal-checkout`,
      { method: 'POST' }
    );

    if (!session?.redirectUrl) {
      toast(session?.error || 'Payment session failed — use M-Pesa instead', 'err', 6000);
      if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
      return;
    }

    // ── Step 3: Clear cart ONLY after URL confirmed ────────────────────────
    _savedCart = [...cart]; // backup in case we need to restore
    cart = [];
    updateCartUI();
    document.getElementById('cart-float')?.classList.add('hidden');

    // ── Step 4: Open iframe ────────────────────────────────────────────────
    if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
    openPesapalIframe(session.redirectUrl, order.id, order.order_number, total);

  } catch (err) {
    console.error('Pesapal init error:', err);
    toast('Something went wrong — please try again', 'err', 5000);
    if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
  }
}

function openPesapalIframe(payUrl, orderId, orderNumber, total){
  // Remove any stale overlay
  document.getElementById('pesapal-overlay')?.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <div id="pesapal-overlay" style="
      position:fixed;inset:0;z-index:9999;background:#000;
      display:flex;flex-direction:column;overflow:hidden">

      <!-- Top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:12px 16px;background:#111;flex-shrink:0;border-bottom:1px solid #222">
        <div>
          <div style="font-size:.7rem;color:#888;letter-spacing:1.5px">SECURE PAYMENT</div>
          <div style="font-family:var(--fh);font-size:.95rem;color:#fff;letter-spacing:1px;margin-top:2px">
            Order ${orderNumber} · ${F.money(total)}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:.7rem;color:var(--green)">🔒 Pesapal</span>
          <button onclick="cancelPesapalPayment()"
            style="background:#222;border:1px solid #333;color:#fff;padding:7px 14px;
                   border-radius:8px;font-size:.82rem;cursor:pointer">
            Cancel
          </button>
        </div>
      </div>

      <!-- Loading indicator (hidden once iframe loads) -->
      <div id="pesapal-loading" style="position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);text-align:center;color:#666">
        <div class="spin" style="width:32px;height:32px;border-width:3px;margin:0 auto 12px"></div>
        <div style="font-size:.82rem">Loading secure payment...</div>
      </div>

      <!-- Pesapal hosted page -->
      <iframe id="pesapal-frame" src="${payUrl}"
        onload="document.getElementById('pesapal-loading').style.display='none'"
        style="flex:1;border:none;width:100%;background:#fff"
        allow="payment *">
      </iframe>

    </div>`);

  document.body.style.overflow = 'hidden';

  // ── Step 4: Poll for payment completion ───────────────────────────────────
  // IPN webhook will update the DB; polling picks it up within 3 s
  if(_pesapalPollTimer) clearInterval(_pesapalPollTimer);
  let pollCount = 0;
  const MAX_POLLS = 200; // 200 × 3 s = 10 minutes max

  _pesapalPollTimer = setInterval(async () => {
    pollCount++;
    if(pollCount > MAX_POLLS){
      clearInterval(_pesapalPollTimer); _pesapalPollTimer = null;
      toast('Payment session timed out — check order history or contact KFC Narok','err',8000);
      closePesapalOverlay();
      return;
    }

    const o = await apiFetch(`/api/orders/${orderId}`);
    if(!o) return; // network blip — retry next poll

    // Any status other than 'pending' means payment was processed
    if(o.status !== 'pending'){
      clearInterval(_pesapalPollTimer); _pesapalPollTimer = null;
      closePesapalOverlay();

      active0Id = orderId;
      localStorage.setItem('mb_active_order', orderId);

      const msg = o.status === 'ready'
        ? `✅ Payment confirmed! Order ${o.order_number} is ready to collect 🏃`
        : `✅ Payment confirmed! Order ${o.order_number} is being prepared 🍗`;
      toast(msg, 'ok', 6000);
      showTracking(orderId);
    }
  }, 3000);
}

function closePesapalOverlay(){
  if(_pesapalPollTimer){ clearInterval(_pesapalPollTimer); _pesapalPollTimer = null; }
  const overlay = document.getElementById('pesapal-overlay');
  if(overlay){ overlay.style.opacity='0'; overlay.style.transition='opacity .25s'; setTimeout(()=>overlay.remove(),260); }
  document.body.style.overflow = '';
}

function cancelPesapalPayment(total){
  closePesapalOverlay();

  // Restore cart so customer can try again or choose M-Pesa instead
  if(_savedCart && _savedCart.length){
  cart = [..._savedCart];
  updateCartUI();
  }
  // Order exists in DB as 'pending' — customer can retry or pay via M-Pesa
  // Admin can see it and ignore if not paid after 30 min
  toast('Payment cancelled — your order is saved. Try again or use M-Pesa.','', 6000);
  const btn = document.getElementById('card-pay-btn');
  if(btn){ btn.innerHTML=`💳 Pay with Card`; btn.disabled=false; }
}
// ── END PESAPAL ───────────────────────────────────────────────────────────────

function showTracking(oid){
    cPanel('track');
    document.querySelectorAll('#s-customer .bnav-btn').forEach(b=>b.classList.toggle('on',b.dataset.s==='track'));

      // ADD — hide cart float once order is placed
  document.getElementById('cart-float')?.classList.add('hidden');

    renderTracking(oid);
    startOrderRealtime(oid); // FIX: get instant status updates instead of waiting for next poll
    if(oTimer) clearInterval(oTimer);
    oTimer = setInterval(()=>renderTracking(oid), 12000);
    setTimeout(()=>{ clearInterval(oTimer); oTimer=null; }, 300000);
}

async function loadHistory(){
  const data = await apiFetch('/api/orders/history');
  const orders = data?.orders || [];
  document.getElementById('hist-list').innerHTML = orders.length
    ? orders.map(o => historyRow(o)).join('')
    : '<div class="empty"><div class="ei">📋</div><h3>NO ORDERS YET</h3><p>Your order history will appear here</p></div>';
}

function historyRow(o){
  const items = (o.items||[]).slice(0,2).map(i=>i.name).join(', ') + (o.items?.length>2?'…':'');
  return `<div class="o-row">
    <div class="or-l">
      <div class="or-num">${o.order_number}</div>
      <div class="or-m">${items} · ${o.customer_area||'Narok'} · ${F.date(o.created_at)}</div>
    </div>
    <div class="or-r">
      <div class="or-p">${F.money(o.food_amount)}</div>
      <span class="badge ${F.badge(o.status)}" style="margin-top:3px">${F.status(o.status, o.order_type)}</span>
    </div>
  </div>`;
}

async function renderTracking(oid) {
  document.getElementById('cart-float')?.classList.add('hidden');

  let o = await apiFetch(`/api/orders/${oid}`);
  if(!o){
    document.getElementById('track-body').innerHTML = `
      <div class="empty" style="padding-top:60px">
        <div class="ei">📦</div>
        <h3>ORDER NOT FOUND</h3>
        <p style="font-size:.83rem;color:var(--muted)">
          Could not load order #${oid}.<br>
          Check your connection or contact KFC Narok.
        </p>
        <button class="btn btn-ghost" style="margin-top:16px"
          onclick="cPanel('menu')">← Back to Menu</button>
      </div>`;
    return;
  }



  const isPickup = o.order_type === 'pickup';

  // ── Steps ──────────────────────────────────────────────────────────────
  const steps = isPickup ? [
    {lbl:'Order Placed', ico:'📋', match:['pending','paid','cooking','ready','delivered']},
    {lbl:'Being Prepared',      ico:'🍗', match:['cooking','ready','delivered']},
    {lbl:'Ready for pickup',        ico:'✅', match:['ready','delivered']},
    {lbl:'Collected',    ico:'🏃', match:['delivered']},
  ] : [
    {lbl:'Order Placed', ico:'📋', match:['pending','paid','cooking','ready','rider_assigned','picked_up','delivered']},
    {lbl:'Cooking',      ico:'🍗', match:['cooking','ready','rider_assigned','picked_up','delivered']},
    {lbl:'On Way',       ico:'🏍️', match:['picked_up','delivered']},
    {lbl:'Done',         ico:'✅', match:['delivered']},
  ];

  const ai = steps.findLastIndex(s => s.match.includes(o.status));

  // ── ETA text ───────────────────────────────────────────────────────────
const etaText = o.status === 'delivered'
  ? (isPickup ? 'Order collected — enjoy your meal! 🍗' : 'Delivered successfully 🎉')
  : isPickup
    ? o.status === 'ready'
      ? '🎉 Ready for pickup! Come to the counter with your order number'
      : o.status === 'cooking'
        ? '🍗 Being prepared — Est. 10–15 minutes'
        : '⏳ Order received — Est. 15–25 minutes'
    : '🏍️ Out for delivery — Est. 20–40 minutes';
  // ── Pickup info card ───────────────────────────────────────────────────
  // ✅ Bug 4 fixed — added padding
  const pickupInfoCard = isPickup ? `
    <div style="background:var(--dark3);border-radius:12px;padding:16px;
         margin-bottom:12px;display:flex;align-items:flex-start;gap:14px">
      <div style="font-size:2rem;flex-shrink:0">🏪</div>
      <div>
        <div style="font-weight:700;font-size:.9rem;color:var(--white);margin-bottom:4px">
          SELF PICKUP — KFC NAROK
        </div>
        <div style="font-size:.8rem;color:var(--muted);line-height:1.5">
          Come to the counter and show your order number.<br>
          <strong style="color:var(--white)">${o.order_number}</strong>
        </div>
      </div>
    </div>
  ` : '';

  // ── Ready card ─────────────────────────────────────────────────────────
  const readyCard = (isPickup && o.status === 'ready') ? `
    <div style="background:rgba(46,204,113,0.12);border:2px solid var(--green);
         border-radius:12px;padding:18px 16px;margin-bottom:12px;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:8px">🎉</div>
      <div style="font-family:var(--fh);font-size:1.1rem;color:var(--green);
           letter-spacing:1px;margin-bottom:6px">YOUR ORDER IS READY!</div>
      <div style="font-size:.83rem;color:var(--muted);margin-bottom:16px">
        Please collect from the counter.<br>
        Show order number
        <strong style="color:var(--white)">${o.order_number}</strong>
      </div>
      <button class="btn btn-primary btn-full btn-lg"
        onclick="markPickupCollected('${oid}')"
        style="background:var(--green);color:#000;border-color:var(--green)">
        ✅ I Have Collected My Order
      </button>
    </div>
  ` : '';

  // ── Collected confirmation card ────────────────────────────────────────
  // ✅ Bug 1 fixed — styl=e → style
  const collectedCard = (isPickup && o.status === 'delivered') ? `
    <div style="background:rgba(46,204,113,0.1);border:1.5px solid var(--green);
         border-radius:12px;padding:16px;margin-bottom:12px;text-align:center">
      <div style="font-size:2rem;margin-bottom:8px">✅</div>
      <div style="font-weight:700;color:var(--green);margin-bottom:4px">
        ORDER COLLECTED!
      </div>
      <div style="font-size:.8rem;color:var(--muted)">
        Enjoy your meal — thank you for choosing KFC Narok 🍗
      </div>
    </div>
  ` : '';

  // ── Delivery only sections ─────────────────────────────────────────────
  const riderSection = (!isPickup &&
    (o.status === 'pending' || o.status === 'paid') && !o.rider_name) ? `
    <div class="card" style="margin-top:11px">
      <div class="card-t">🚴 CHOOSE YOUR RIDER</div>
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:12px">
        Select a rider to deliver your order
      </p>
      <div id="rider-list" style="max-height:200px;overflow-y:auto">
        <div style="text-align:center;padding:20px">
          <span class="spin"></span> Loading riders...
        </div>
      </div>
    </div>
  ` : '';

  const assignedRider = (!isPickup && o.rider_name) ? `
    <div class="card" style="margin-top:11px;background:var(--dark2)">
      <div class="card-t">🏍️ RIDER ASSIGNED</div>
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
        <div style="font-size:2rem">🏍️</div>
        <div>
          <div style="font-weight:600">${o.rider_name}</div>
          <div style="font-size:.8rem;color:var(--muted)">
            ⭐ ${o.rider_rating || 'New'} · On the way
          </div>
        </div>
      </div>
      ${o.status !== 'delivered' ? `
        <button class="btn btn-ghost btn-full" style="margin-top:8px"
          onclick="openChat(${o.id},'customer')">💬 Chat with Rider</button>
      ` : ''}
    </div>
  ` : '';

  const mapSection = !isPickup ? `
    ${o.rider_lat ? `
      <div class="map-ph">
        <span style="position:relative;z-index:1;font-size:.85rem;color:var(--muted2)">
          Rider location
        </span>
        <a class="map-link"
          href="https://maps.google.com/?q=${o.rider_lat},${o.rider_lng}"
          target="_blank">📍 Open Map</a>
      </div>
    ` : `
      <div class="map-ph">
        <span style="position:relative;z-index:1;font-size:.8rem;color:var(--muted)">
          Map updates when rider is assigned
        </span>
      </div>
    `}
  ` : '';

  const pinReminder = !isPickup ? `
    <div class="card" style="margin-top:11px;text-align:center;
         font-size:.81rem;color:var(--muted)">
      🔐 Delivery PIN sent to your phone via SMS<br>
      <span style="font-size:.73rem">
        Share it with your rider
        <strong style="color:var(--white)">only after</strong> receiving your food
      </span>
    </div>
  ` : '';

  // ── Rating card ────────────────────────────────────────────────────────
  // ✅ Bug 5 fixed — unified rating system using setRating() + submitRating()

  // ✅ After — also checks if already rated:
const alreadyRated = o.rated ||localStorage.getItem(`mb_rated_${oid}`) === 'true';

const ratingCard = (o.status === 'delivered' && !alreadyRated) ? `
  <div class="card" style="margin-top:11px" id="rating-card">
    <div class="card-t">RATE YOUR EXPERIENCE</div>

    <p style="font-size:.8rem;color:var(--muted);margin-bottom:10px">
      Food quality:
    </p>
    <div class="stars" id="food-stars">
      ${[1,2,3,4,5].map(n =>
        `<span class="star" onclick="setRating('food',${n})">☆</span>`
      ).join('')}
    </div>

    ${!isPickup ? `
      <p style="font-size:.8rem;color:var(--muted);margin:12px 0 8px">
        Rider service:
      </p>
      <div class="stars" id="rider-stars">
        ${[1,2,3,4,5].map(n =>
          `<span class="star" onclick="setRating('rider',${n})">☆</span>`
        ).join('')}
      </div>
    ` : ''}

    <button class="btn btn-primary btn-full" style="margin-top:14px"
      onclick="submitRating()">
      Submit Rating
    </button>
  </div>
` : (o.status === 'delivered' && alreadyRated) ? `

  <!-- ✅ Show thank you message instead of rating card -->
  <div style="text-align:center;padding:16px;font-size:.82rem;color:var(--muted)">
    ⭐ Thanks for rating this order!
  </div>

` : '';
 


  // ── Cancel button ──────────────────────────────────────────────────────
  const cancelButton = (o.status === 'pending') ? `
  <div class="card" style="margin-top:11px;text-align:center">
    <button type="button" onclick="cancelOrder('${oid}')" class="btn btn-ghost btn-full" style="color:var(--red);border-color:var(--red)">
      ❌ Cancel Order
    </button>
    <p style="color: var(--muted); font-size: 12px; margin-top: 8px;">
      You can cancel while awaiting payment. This cannot be undone.
    </p>
  </div>
` : '';

    // ── Render HTML ────────────────────────────────────────────────────────
  document.getElementById('track-body').innerHTML = `

    <div class="trk-hdr">
      <div class="trk-no">Order ${o.order_number}</div>
      <div style="display:flex;align-items:center;gap:8px;
           justify-content:center;margin-top:4px">

        ${isPickup
          // ✅ Bug 2 & 3 fixed — quoted style, correct color
          ? `<span style="background:var(--green);color:#000;font-size:.65rem;
                font-weight:800;padding:2px 8px;border-radius:4px;
                letter-spacing:1px">SELF PICKUP</span>`
          : `<span style="background:var(--red);color:#fff;font-size:.65rem;
                font-weight:800;padding:2px 8px;border-radius:4px;
                letter-spacing:1px">DELIVERY</span>`
        }

        <div class="trk-st">${F.status(o.status, isPickup ? 'pickup' : 'delivery')}</div>
      </div>
      <div class="trk-eta" style="margin-top:6px">${etaText}</div>
    </div>

    <div class="prog">
      ${steps.map((s,i) => `
        <div class="ps ${i<ai?'done':''} ${i===ai?'act':''}">
          <div class="pd">${i<ai?'✓':s.ico}</div>
          <div class="pl">${s.lbl}</div>
        </div>
        ${i<steps.length-1 ? `
          <div style="flex:1;height:2px;
            background:${i<ai?'var(--green)':'var(--line2)'};
            margin-bottom:20px">
          </div>` : ''}
      `).join('')}
    </div>

    <div style="padding:0 16px 16px;max-width:500px;margin:0 auto">
      ${pickupInfoCard}
      ${readyCard}
      ${collectedCard}
      ${mapSection}
      ${riderSection}
      ${assignedRider}

      <div class="card">
        <div class="card-t">ORDER SUMMARY</div>
        ${(o.items||[]).map(i => `
          <div style="display:flex;justify-content:space-between;padding:7px 0;
               border-bottom:1px solid var(--line);font-size:.87rem">
            <span>
              ${i.name}
              ${i.chickenType ? `
                <span style="background:var(--red);color:#fff;font-size:.62rem;
                     font-weight:700;padding:1px 5px;border-radius:3px;
                     margin-left:4px">${i.chickenType}</span>` : ''}
              ${i.note ? `
                <span style="color:var(--orange);font-size:.73rem">
                  (${i.note})
                </span>` : ''}
            </span>
            <span style="font-family:var(--fh);color:var(--red);letter-spacing:1px">
              ${F.money(i.price)}
            </span>
          </div>
        `).join('')}
      </div>

      ${pinReminder}
      ${ratingCard}
      ${cancelButton}
    </div>
  `;

  // ✅ Bug 6 fixed — closing brace was missing
  if (!isPickup && (o.status === 'pending' || o.status === 'paid') && !o.rider_name) {
    loadAvailableRiders(o.id);
  }
} // ← closes renderTracking()


// ── PICKUP COLLECTED ──────────────────────────────────────────────────────────
async function markPickupCollected(oid) {
  const btn = document.querySelector(`[onclick="markPickupCollected('${oid}')"]`);
  if (btn) { btn.innerHTML = '<span class="spin"></span> Confirming...'; btn.disabled = true; }

  const res = await apiFetch(`/api/orders/${oid}/collected`, { method: 'POST' });

  if (res?.success) {
    toast('✅ Order collected — enjoy your meal! 🍗', 'ok', 5000);
    renderTracking(oid);
  } else {
    toast(res?.error || 'Failed to confirm collection — try again', 'err', 4000);
    if (btn) { btn.innerHTML = '✅ I Have Collected My Order'; btn.disabled = false; }
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Cancel this order?\n\nThis will remove it from your history.')) return;

  const res = await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });

  if (res?.success) {
    toast('Order cancelled', 'ok');
    
    // STOP POLLING — clear the tracking interval
    if (typeof oTimer !== 'undefined' && oTimer) {
      clearInterval(oTimer);
      oTimer = null;
    }
    
    // Clear any local tracking state
    localStorage.removeItem('mb_active_order');
    localStorage.removeItem('mb_order_' + orderId);
    
    // Go to history page instead of home (avoids re-checking active order)
    setTimeout(() => {
      cPanel('history');
      loadHistory();
    }, 500);
    
  } else {
    toast(res?.error || 'Could not cancel order', 'err');
  }
}


// Load available riders and display them
async function loadAvailableRiders(orderId) {
  const list = document.getElementById('rider-list');
  if (!list) return;
  
  // Correct URL — route is /api/rider/available
  const riders = await apiFetch('/api/rider/available');
  
  if (!riders || riders.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">No riders available right now. Please try again in a moment...</div>';
    // Retry after 10 seconds
    setTimeout(() => loadAvailableRiders(orderId), 10000);
    return;
  }
  
  list.innerHTML = riders.map(r => `
    <div class="rider-select" onclick="selectRider(${orderId}, '${r.phone}', this)" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--dark3);border-radius:8px;margin-bottom:8px;cursor:pointer;border:1.5px solid transparent;transition:all 0.2s">
      <div style="font-size:1.8rem">🏍️</div>
      <div style="flex:1">
        <div style="font-weight:600">${r.name}</div>
        <div style="font-size:.75rem;color:var(--muted)">⭐ ${r.rating || 'New'} · ${r.total_deliveries || 0} deliveries</div>
      </div>
      <div style="color:var(--green);font-size:0.9rem">Select →</div>
    </div>
  `).join('');
}


// Customer selects a rider
async function selectRider(orderId, riderPhone, el) {
   console.log('✅ selectRider called:', orderId, riderPhone);
  if (!confirm('Assign this rider to your order?')) return;
  
  if(el) el.innerHTML = '<span class="spin"></span> Assigning...';
  
  // ✅ FIXED: Correct route is /api/orders/:id/assign-rider with PUT method
  const res = await apiFetch(`/api/orders/${orderId}/assign-rider`, {
    method: 'PUT',  // ← Changed from POST to PUT
    body: { rider_phone: riderPhone }
  });
  
    if (res?.success) {
    toast('Rider notified! Waiting for response... 🚴', 'ok');
    renderTracking(orderId);
    // Customer waits — rider will chat back if interested
  } else {
    toast(res?.error || 'Failed. Try another rider .', 'err');
    loadAvailableRiders(orderId);
  }
}

let _foodRating=0;
let _riderRating=0; // global vars to store current ratings before submission

function setRating(type, stars){
    if(type==='food')_foodRating=stars;   
    if(type==='rider')_riderRating=stars;

    // Highlight stars up to the selected rating for both food and rider
    const container = document.getElementById(`${type}-stars`);
    if(!container) return;

 container.querySelectorAll('.star').forEach((s,i)=>{
  s.textContent = i<stars ? '⭐' : '☆';
 });

 // visual feedback: briefly scale up the selected stars
 const selectedStars = container.querySelectorAll('.star')[stars-1];
 if(selectedStars){
  selectedStars.style.transform = 'scale(1.4)';
  setTimeout(() => 
    selectedStars.style.transform = 'scale(1)', 200);
  
 }
}
async function submitRating(){
  // Check order type to determine if rider rating is required
  const o = await apiFetch(`/api/orders/${active0Id}`);
  const isPickup = o?.order_type === 'pickup' || o?.customer_area === 'KFC Narok (Self-pickup)';

  // Food rating is always required

    if(!_foodRating){
        toast('Please rate the food quality', 'err');
        return;
    }

    // Rider rating is required for delivery orders
    if(!isPickup && !_riderRating){
        toast('Please rate the rider service', 'err');
        return;
    }

    const btn = document.querySelector('#rating-card button');
    if(btn){ btn.innerHTML = '<span class="spin"></span> Submitting...'; btn.disabled = true; }

    const res = await apiFetch(`/api/orders/${active0Id}/rate`, {
        method: 'POST',
        body: {
            foodStars: _foodRating,
            riderStars: isPickup ? null : _riderRating
        }
    });

    if(res?.success){
        toast('⭐ Thanks for your rating!', 'ok');

        // mark order as rated to prevent multiple submissions (in case of re-render) 
        localStorage.setItem(`mb_rated_${active0Id}`, 'true');
        // Hide rating card after successful submission
        document.getElementById('rating-card')?.remove();
        // Reset
        _foodRating = 0;
        _riderRating = 0;
        renderTracking(active0Id); // re-render to show updated ratings
    }
      else {
        toast(res?.error || 'Failed to submit rating. Please try again.', 'err');
        if(btn){ btn.innerHTML = 'Submit Rating'; btn.disabled = false; }
    }
}     

   