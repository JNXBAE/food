/* ===========================================================
   JUNGLE FOODS — core site behaviour
   Shared across every page: nav, loader, reveal, cart, toast
   =========================================================== */

const JF = (() => {
  const CART_KEY = 'jf_cart_v1';

  function getCart(){
    try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch(e){ return []; }
  }
  function saveCart(cart){
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartBadge();
  }
  function addToCart(item){
    const cart = getCart();
    const existing = cart.find(c => c.key === item.key);
    if(existing){ existing.qty += 1; }
    else { cart.push({ ...item, qty: 1 }); }
    saveCart(cart);
    renderCartDrawer();
    toast(`${item.name} added to cart`);
  }
  function removeFromCart(key){
    let cart = getCart().filter(c => c.key !== key);
    saveCart(cart);
    renderCartDrawer();
  }
  function updateQty(key, delta){
    let cart = getCart();
    const it = cart.find(c => c.key === key);
    if(!it) return;
    it.qty += delta;
    if(it.qty <= 0){ cart = cart.filter(c => c.key !== key); }
    saveCart(cart);
    renderCartDrawer();
  }
  function cartTotal(){
    return getCart().reduce((sum, c) => sum + (parseInt(c.price) || 0) * c.qty, 0);
  }
  function cartCount(){
    return getCart().reduce((sum, c) => sum + c.qty, 0);
  }

  function renderCartBadge(){
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = cartCount());
  }

  function renderCartDrawer(){
    const wrap = document.getElementById('cartItems');
    if(!wrap) return;
    const cart = getCart();
    if(cart.length === 0){
      wrap.innerHTML = `<div class="empty-cart">
        <div style="font-size:2.4rem;margin-bottom:10px;">🧺</div>
        Your basket is empty.<br>Add something delicious from the menu.
      </div>`;
    } else {
      wrap.innerHTML = cart.map(c => `
        <div class="cart-item">
          <img src="assets/icons/${c.icon}.svg" alt="${c.name}">
          <div class="cart-item-info">
            <h5>${c.name}${c.variant ? ` <small style="color:var(--mist)">(${c.variant})</small>` : ''}</h5>
            <div class="qty-control">
              <button aria-label="Decrease quantity" onclick="JF.updateQty('${c.key}',-1)">−</button>
              <span>${c.qty}</span>
              <button aria-label="Increase quantity" onclick="JF.updateQty('${c.key}',1)">+</button>
              <button aria-label="Remove item" onclick="JF.removeFromCart('${c.key}')" style="margin-left:8px;color:var(--red-spice);border-color:var(--red-spice);">✕</button>
            </div>
          </div>
          <div style="font-family:var(--font-display);color:var(--gold);">₹${(parseInt(c.price)||0) * c.qty}</div>
        </div>
      `).join('');
    }
    const totalEl = document.getElementById('cartTotal');
    if(totalEl) totalEl.textContent = `₹${cartTotal()}`;
  }

  function toast(msg){
    let stack = document.querySelector('.toast-stack');
    if(!stack){
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function openCart(){
    document.getElementById('cartOverlay')?.classList.add('open');
    document.getElementById('cartDrawer')?.classList.add('open');
    renderCartDrawer();
  }
  function closeCart(){
    document.getElementById('cartOverlay')?.classList.remove('open');
    document.getElementById('cartDrawer')?.classList.remove('open');
  }

  function initNav(){
    const nav = document.getElementById('siteNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
      if(window.scrollY > 40) nav?.classList.add('scrolled');
      else nav?.classList.remove('scrolled');

      const progress = document.getElementById('scrollProgress');
      if(progress){
        const h = document.documentElement;
        const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
        progress.style.width = scrolled + '%';
      }
      const backTop = document.getElementById('backTop');
      if(backTop){
        if(window.scrollY > 500) backTop.classList.add('show');
        else backTop.classList.remove('show');
      }
    });
    toggle?.addEventListener('click', () => links?.classList.toggle('open'));
    document.querySelectorAll('#navLinks a').forEach(a => a.addEventListener('click', () => links?.classList.remove('open')));
  }

  function initLoader(){
    window.addEventListener('load', () => {
      setTimeout(() => document.querySelector('.page-loader')?.classList.add('hide'), 350);
    });
    // fallback in case load already fired
    setTimeout(() => document.querySelector('.page-loader')?.classList.add('hide'), 1800);
  }

  function initReveal(){
    const els = document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){ els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.14 });
    els.forEach(e => io.observe(e));
  }

  function initBackTop(){
    document.getElementById('backTop')?.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
  }

  function initCartUI(){
    document.getElementById('cartToggle')?.addEventListener('click', openCart);
    document.getElementById('cartClose')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
      if(cartCount() === 0){ toast('Your basket is empty'); return; }
      toast('Order request sent! We will confirm over WhatsApp shortly.');
      saveCart([]);
      renderCartDrawer();
      closeCart();
    });
    renderCartBadge();
  }

  function setActiveNav(){
    const page = document.body.dataset.page;
    document.querySelectorAll('#navLinks a').forEach(a => {
      if(a.dataset.page === page) a.classList.add('active');
    });
  }

  function init(){
    initLoader();
    initNav();
    initReveal();
    initBackTop();
    initCartUI();
    setActiveNav();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { addToCart, removeFromCart, updateQty, getCart, cartTotal, cartCount, toast, openCart, closeCart };
})();
