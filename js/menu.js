/* ===========================================================
   Renders the entire menu dynamically from data/menu.json
   =========================================================== */
(function(){
  let DATA = null;
  let filterVeg = 'all';   // all | veg | nonveg
  let query = '';

  const grid = document.getElementById('menuContent');
  const navList = document.getElementById('menuNavList');

  function priceLabel(item){
    if(item.priceType === 'single'){
      return item.price === 'TBD' ? 'Call for price' : `₹${item.price}`;
    }
    // portion type -> show lowest price as "from"
    const nums = item.portions.map(p => parseInt(p.price)).filter(n => !isNaN(n));
    if(nums.length === 0) return 'Call for price';
    return `From ₹${Math.min(...nums)}`;
  }

  function matches(item){
    if(filterVeg === 'veg' && !item.veg) return false;
    if(filterVeg === 'nonveg' && item.veg) return false;
    if(query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  }

  function mediaHtml(item){
    const cached = (typeof StockPhotos !== 'undefined') ? StockPhotos.getCached(item.id) : null;
    if(cached){
      return `<img src="${cached.url}" alt="${item.name}" loading="lazy">
        <a class="photo-credit" href="${cached.creditUrl}" target="_blank" rel="noopener">📷 ${cached.credit}</a>`;
    }
    return `<img src="assets/icons/${item.icon}.svg" alt="${item.name}" loading="lazy">`;
  }

  function dishCard(item, cat){
    const vegClass = item.veg ? 'veg' : 'nonveg';
    let footer;
    const cardKeyBase = `${cat.id}__${item.id}`;
    const hasPhoto = (typeof StockPhotos !== 'undefined') && !!StockPhotos.getCached(item.id);

    if(item.priceType === 'single'){
      const disabled = item.price === 'TBD';
      footer = `
        <div class="dish-footer">
          <span class="dish-price">${priceLabel(item)}</span>
          <button class="add-btn" ${disabled ? 'disabled' : ''} title="Add to cart"
            onclick='JF.addToCart(${JSON.stringify({key:cardKeyBase,name:item.name,price:item.price,icon:item.icon}).replace(/'/g,"&#39;")})'>+</button>
        </div>`;
    } else {
      const options = item.portions.map((p,i) => `<option value="${i}">${p.label}${p.serves ? ' · '+p.serves : ''} — ₹${p.price}</option>`).join('');
      footer = `
        <div style="display:flex;flex-direction:column;gap:8px;">
          <select class="portion-select" id="sel-${cardKeyBase}">${options}</select>
          <div class="dish-footer">
            <span class="dish-price" id="price-${cardKeyBase}">₹${item.portions[0].price}</span>
            <button class="add-btn" title="Add to cart" onclick="addPortionItem('${cardKeyBase}', ${JSON.stringify(item).replace(/"/g,'&quot;')})">+</button>
          </div>
        </div>`;
    }

    return `
      <article class="dish-card">
        <div class="dish-media ${hasPhoto ? 'has-photo' : ''}">
          <span class="veg-dot ${vegClass}"></span>
          <span class="dish-rating">★ ${item.rating}</span>
          ${mediaHtml(item)}
        </div>
        <div class="dish-body">
          <h4>${item.name}</h4>
          <p class="dish-desc">${item.description || 'A Jungle Foods favourite, made fresh to order.'}</p>
          ${footer}
        </div>
      </article>`;
  }

  window.addPortionItem = function(cardKeyBase, item){
    const sel = document.getElementById(`sel-${cardKeyBase}`);
    const idx = parseInt(sel.value);
    const portion = item.portions[idx];
    JF.addToCart({
      key: `${cardKeyBase}__${portion.label}`,
      name: item.name,
      variant: portion.label,
      price: portion.price,
      icon: item.icon
    });
  };

  window.onPortionChange = function(cardKeyBase, item){
    const sel = document.getElementById(`sel-${cardKeyBase}`);
    const priceEl = document.getElementById(`price-${cardKeyBase}`);
    if(sel && priceEl){
      const idx = parseInt(sel.value);
      priceEl.textContent = `₹${item.portions[idx].price}`;
    }
  };

  function groupByGroup(categories){
    const groups = {};
    categories.forEach(c => {
      if(!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }

  function render(){
    const groups = groupByGroup(DATA.categories);
    let navHtml = '';
    let bodyHtml = '';

    Object.entries(groups).forEach(([groupName, cats]) => {
      const groupId = 'g-' + groupName.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      // does this group have any visible items after filtering?
      const visibleCats = cats.map(c => ({ ...c, items: c.items.filter(matches) })).filter(c => c.items.length);
      if(visibleCats.length === 0) return;

      navHtml += `<a href="#${groupId}">${groupName}</a>`;

      bodyHtml += `<div id="${groupId}">
        <div class="menu-group-title reveal">
          <h2>${groupName}</h2><div class="rule"></div>
        </div>`;

      visibleCats.forEach(cat => {
        const showSubTitle = cat.name && cat.name !== groupName;
        bodyHtml += showSubTitle ? `<h3 class="menu-sub-title reveal">${cat.name}</h3>` : '';
        bodyHtml += `<div class="menu-grid">`;
        bodyHtml += cat.items.map(it => dishCard(it, cat)).join('');
        bodyHtml += `</div>`;
        if(cat.extras){
          bodyHtml += `<p style="font-size:.82rem;color:var(--mist);margin-top:10px;">Extras: ${cat.extras.map(e=>`${e.name} — ₹${e.price}`).join(' · ')}</p>`;
        }
      });
      bodyHtml += `</div>`;
    });

    if(!bodyHtml){
      bodyHtml = `<div class="no-results">🌿 No dishes match your search. Try another keyword.</div>`;
    }

    navList.innerHTML = navHtml;
    grid.innerHTML = bodyHtml;

    // rewire the portion onchange (inline handlers reference addPortionItem/onPortionChange already via onclick,
    // but the select needs a change binding too)
    document.querySelectorAll('.portion-select').forEach(sel => {
      const key = sel.id.replace('sel-','');
    });

    JF_initSpy();
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  function JF_initSpy(){
    const links = navList.querySelectorAll('a');
    const targets = [...links].map(l => document.querySelector(l.getAttribute('href')));
    window.addEventListener('scroll', () => {
      let current = targets[0];
      targets.forEach(t => { if(t && window.scrollY + 200 >= t.offsetTop) current = t; });
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current?.id));
    }, { passive:true });
  }

  // fix select change price update (delegate)
  document.addEventListener('change', (e) => {
    if(e.target.classList.contains('portion-select')){
      const base = e.target.id.replace('sel-','');
      const priceEl = document.getElementById(`price-${base}`);
      // find item data again from DATA by ids embedded in base "catId__itemId"
      const [catId, itemId] = base.split('__');
      const cat = DATA.categories.find(c => c.id === catId);
      const item = cat?.items.find(i => i.id === itemId);
      if(item && priceEl){
        priceEl.textContent = `₹${item.portions[parseInt(e.target.value)].price}`;
      }
    }
  });

  function wireControls(){
    const search = document.getElementById('menuSearch');
    search?.addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

    document.querySelectorAll('.chip[data-veg]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-veg]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filterVeg = chip.dataset.veg;
        render();
      });
    });
  }

  fetch('data/menu.json')
    .then(r => r.json())
    .then(data => {
      DATA = data;
      wireControls();
      render();
    })
    .catch(() => {
      grid.innerHTML = `<div class="no-results">Menu is being freshened up — please check back shortly.</div>`;
    });
})();
