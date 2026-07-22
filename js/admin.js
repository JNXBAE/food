/* ===========================================================
   JUNGLE FOODS — Admin Dashboard
   All data is stored in localStorage so this works with zero
   backend. Swap the storage calls for real API calls later —
   every read/write goes through the DB.* functions below.
   =========================================================== */

// ---- Auth guard ----
if(sessionStorage.getItem('jf_admin_auth') !== '1'){
  window.location.href = 'admin-login.html';
}

const LS_KEYS = {
  menu: 'jf_admin_menu_v1',
  gallery: 'jf_admin_gallery_v1',
  reviews: 'jf_admin_reviews_v1',
  settings: 'jf_admin_settings_v1',
};

const DB = {
  read(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  },
  write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
};

const Admin = (() => {
  let menuData = null;      // { restaurant, categories }
  let galleryData = null;
  let reviewsData = null;
  let settingsData = null;

  let menuPage = 1;
  const PAGE_SIZE = 8;
  let menuSearch = '';
  let menuCatFilter = 'all';

  function flattenItems(){
    const rows = [];
    menuData.categories.forEach(cat => {
      cat.items.forEach(item => rows.push({ ...item, catId: cat.id, catName: cat.name, group: cat.group }));
    });
    return rows;
  }

  function priceOf(item){
    if(item.priceType === 'single') return item.price === 'TBD' ? 'TBD' : `₹${item.price}`;
    const nums = item.portions.map(p => parseInt(p.price)).filter(n=>!isNaN(n));
    return nums.length ? `From ₹${Math.min(...nums)}` : 'TBD';
  }

  function refreshStats(){
    const items = flattenItems();
    document.getElementById('statItems').textContent = items.length;
    document.getElementById('statCats').textContent = menuData.categories.length;
    document.getElementById('statReviews').textContent = reviewsData.length;
    const avg = reviewsData.length ? (reviewsData.reduce((s,r)=>s+r.stars,0)/reviewsData.length).toFixed(1) : '0.0';
    document.getElementById('statAvgRating').textContent = avg;
  }

  function populateCategoryFilter(){
    const sel = document.getElementById('menuAdminFilter');
    const itemSel = document.getElementById('itemCategory');
    const opts = menuData.categories.map(c => `<option value="${c.id}">${c.group} — ${c.name}</option>`).join('');
    sel.innerHTML = `<option value="all">All Categories</option>${opts}`;
    itemSel.innerHTML = opts;
  }

  function renderMenuTable(){
    let rows = flattenItems();
    if(menuCatFilter !== 'all') rows = rows.filter(r => r.catId === menuCatFilter);
    if(menuSearch) rows = rows.filter(r => r.name.toLowerCase().includes(menuSearch));

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if(menuPage > totalPages) menuPage = totalPages;
    const pageRows = rows.slice((menuPage-1)*PAGE_SIZE, menuPage*PAGE_SIZE);

    const tbody = document.getElementById('menuTableBody');
    if(pageRows.length === 0){
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--mist);padding:30px;">No dishes found.</td></tr>`;
    } else {
      tbody.innerHTML = pageRows.map(item => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.catName}</td>
          <td>${item.priceType === 'portion' ? 'Portioned' : 'Single'}</td>
          <td>${priceOf(item)}</td>
          <td><span class="badge ${item.veg ? 'veg':'nonveg'}">${item.veg ? 'Veg':'Non-Veg'}</span></td>
          <td>★ ${item.rating || '—'}</td>
          <td class="row-actions">
            <button class="icon-btn" title="Edit" onclick="Admin.editItem('${item.catId}','${item.id}')">✏️</button>
            <button class="icon-btn" title="Delete" onclick="Admin.confirmDeleteItem('${item.catId}','${item.id}')">🗑️</button>
          </td>
        </tr>`).join('');
    }

    const pag = document.getElementById('menuPagination');
    pag.innerHTML = Array.from({length: totalPages}, (_,i) => i+1)
      .map(p => `<button class="${p===menuPage?'active':''}" onclick="Admin.gotoPage(${p})">${p}</button>`).join('');

    refreshStats();
  }

  function renderCategoryTable(){
    const tbody = document.getElementById('catTableBody');
    tbody.innerHTML = menuData.categories.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.group}</td>
        <td>${c.items.length}</td>
        <td class="row-actions">
          <button class="icon-btn" title="Delete" onclick="Admin.confirmDeleteCategory('${c.id}')">🗑️</button>
        </td>
      </tr>`).join('');
  }

  function renderGalleryTable(){
    const tbody = document.getElementById('galleryTableBody');
    if(galleryData.length === 0){
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--mist);padding:30px;">No images yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = galleryData.map((g,i) => `
      <tr>
        <td><img src="assets/icons/${g.icon}.svg" style="width:40px;height:40px;"></td>
        <td>${g.title}</td>
        <td>${g.cat}</td>
        <td class="row-actions"><button class="icon-btn" title="Delete" onclick="Admin.confirmDeleteGallery(${i})">🗑️</button></td>
      </tr>`).join('');
  }

  function renderReviewTable(){
    const tbody = document.getElementById('reviewTableBody');
    if(reviewsData.length === 0){
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--mist);padding:30px;">No reviews yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = reviewsData.map((r,i) => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>★ ${r.stars}</td>
        <td style="max-width:340px;">${r.text}</td>
        <td class="row-actions"><button class="icon-btn" title="Delete" onclick="Admin.confirmDeleteReview(${i})">🗑️</button></td>
      </tr>`).join('');
  }

  function renderPhotoSettings(){
    const s = StockPhotos.getSettings();
    document.getElementById('photoProvider').value = s.provider || 'unsplash';
    document.getElementById('photoApiKey').value = s.apiKey || '';
    document.getElementById('photoSuffix').value = s.query_suffix || 'food dish';
    refreshPhotoProgress();
  }

  function refreshPhotoProgress(){
    const items = flattenItems();
    const cache = StockPhotos.getCache();
    const cachedCount = items.filter(i => cache[i.id]).length;
    document.getElementById('cachedCount').textContent = cachedCount;
    document.getElementById('totalCount').textContent = items.length;
    const pct = items.length ? Math.round((cachedCount/items.length)*100) : 0;
    document.getElementById('fetchProgressBar').style.width = pct + '%';
  }

  function renderSettings(){
    document.getElementById('setName').value = settingsData.name || '';
    document.getElementById('setDesc').value = settingsData.description || '';
    document.getElementById('setPhone').value = settingsData.phone || '';
    document.getElementById('setWhatsapp').value = settingsData.whatsapp || '';
    document.getElementById('setInstagram').value = settingsData.instagram || '';
    document.getElementById('setAddress').value = settingsData.address || '';
    document.getElementById('setHours').value = settingsData.hours || '';
  }

  // ---- Views ----
  function switchView(view){
    document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${view}`).style.display = 'block';
    document.querySelectorAll('#adminNav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    document.getElementById('viewTitle').textContent = document.querySelector(`#adminNav a[data-view="${view}"]`).textContent.replace(/^\S+\s/, '');
    if(view === 'menu') renderMenuTable();
    if(view === 'categories') renderCategoryTable();
    if(view === 'gallery') renderGalleryTable();
    if(view === 'reviews') renderReviewTable();
    if(view === 'photos') renderPhotoSettings();
    if(view === 'settings') renderSettings();
    if(view === 'overview') refreshStats();
  }

  // ---- Item CRUD ----
  function openItemModal(catId, itemId){
    document.getElementById('itemForm').reset();
    document.getElementById('itemEditKey').value = '';
    document.getElementById('itemModalTitle').textContent = 'Add Menu Item';
    if(catId && itemId){
      const cat = menuData.categories.find(c => c.id === catId);
      const item = cat.items.find(i => i.id === itemId);
      document.getElementById('itemModalTitle').textContent = 'Edit Menu Item';
      document.getElementById('itemEditKey').value = `${catId}::${itemId}`;
      document.getElementById('itemName').value = item.name;
      document.getElementById('itemCategory').value = catId;
      document.getElementById('itemVeg').value = String(item.veg);
      document.getElementById('itemPrice').value = item.priceType === 'single' ? item.price : (item.portions?.[0]?.price || '');
      document.getElementById('itemRating').value = item.rating || 4.5;
      document.getElementById('itemDesc').value = item.description || '';
    }
    document.getElementById('itemModalOverlay').classList.add('open');
  }
  function closeItemModal(){ document.getElementById('itemModalOverlay').classList.remove('open'); }

  function saveItem(e){
    e.preventDefault();
    const editKey = document.getElementById('itemEditKey').value;
    const name = document.getElementById('itemName').value.trim();
    const catId = document.getElementById('itemCategory').value;
    const veg = document.getElementById('itemVeg').value === 'true';
    const price = document.getElementById('itemPrice').value;
    const rating = parseFloat(document.getElementById('itemRating').value) || 4.5;
    const description = document.getElementById('itemDesc').value.trim();
    const cat = menuData.categories.find(c => c.id === catId);

    if(editKey){
      const [oldCatId, itemId] = editKey.split('::');
      const oldCat = menuData.categories.find(c => c.id === oldCatId);
      const idx = oldCat.items.findIndex(i => i.id === itemId);
      const item = oldCat.items[idx];
      item.name = name; item.veg = veg; item.rating = rating; item.description = description;
      item.priceType = 'single'; item.price = price; delete item.portions;
      if(oldCatId !== catId){
        oldCat.items.splice(idx,1);
        item.icon = cat.icon;
        cat.items.push(item);
      } else {
        item.icon = cat.icon;
      }
      JF.toast('Menu item updated');
    } else {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Date.now().toString(36).slice(-4);
      cat.items.push({ id, name, veg, rating, icon: cat.icon, priceType:'single', price, description });
      JF.toast('Menu item added');
    }
    persistMenu();
    closeItemModal();
    renderMenuTable();
    populateCategoryFilter();
  }

  function editItem(catId, itemId){ openItemModal(catId, itemId); }

  let pendingDelete = null;
  function confirmDeleteItem(catId, itemId){
    pendingDelete = { type:'item', catId, itemId };
    document.getElementById('confirmMsg').textContent = 'Delete this menu item?';
    document.getElementById('confirmModalOverlay').classList.add('open');
  }
  function confirmDeleteCategory(catId){
    pendingDelete = { type:'category', catId };
    document.getElementById('confirmMsg').textContent = 'Delete this category and all its items?';
    document.getElementById('confirmModalOverlay').classList.add('open');
  }
  function confirmDeleteGallery(idx){
    pendingDelete = { type:'gallery', idx };
    document.getElementById('confirmMsg').textContent = 'Delete this gallery image?';
    document.getElementById('confirmModalOverlay').classList.add('open');
  }
  function confirmDeleteReview(idx){
    pendingDelete = { type:'review', idx };
    document.getElementById('confirmMsg').textContent = 'Delete this review?';
    document.getElementById('confirmModalOverlay').classList.add('open');
  }

  function executeDelete(){
    if(!pendingDelete) return;
    if(pendingDelete.type === 'item'){
      const cat = menuData.categories.find(c => c.id === pendingDelete.catId);
      cat.items = cat.items.filter(i => i.id !== pendingDelete.itemId);
      persistMenu(); renderMenuTable(); populateCategoryFilter();
      JF.toast('Menu item deleted');
    }
    if(pendingDelete.type === 'category'){
      menuData.categories = menuData.categories.filter(c => c.id !== pendingDelete.catId);
      persistMenu(); renderCategoryTable(); populateCategoryFilter();
      JF.toast('Category deleted');
    }
    if(pendingDelete.type === 'gallery'){
      galleryData.splice(pendingDelete.idx, 1);
      persistGallery(); renderGalleryTable();
      JF.toast('Image deleted');
    }
    if(pendingDelete.type === 'review'){
      reviewsData.splice(pendingDelete.idx, 1);
      persistReviews(); renderReviewTable();
      JF.toast('Review deleted');
    }
    pendingDelete = null;
    document.getElementById('confirmModalOverlay').classList.remove('open');
  }

  // ---- Category CRUD ----
  function openCategoryModal(){ document.getElementById('catForm').reset(); document.getElementById('catModalOverlay').classList.add('open'); }
  function closeCategoryModal(){ document.getElementById('catModalOverlay').classList.remove('open'); }
  function saveCategory(e){
    e.preventDefault();
    const name = document.getElementById('catName').value.trim();
    const group = document.getElementById('catGroup').value.trim();
    const id = (group+'-'+name).toLowerCase().replace(/[^a-z0-9]+/g,'-');
    menuData.categories.push({ id, name, group, icon:'sandwich', items: [] });
    persistMenu();
    closeCategoryModal();
    renderCategoryTable();
    populateCategoryFilter();
    JF.toast('Category added');
  }

  // ---- Gallery CRUD ----
  function openGalleryModal(){ document.getElementById('galForm').reset(); document.getElementById('galModalOverlay').classList.add('open'); }
  function closeGalleryModal(){ document.getElementById('galModalOverlay').classList.remove('open'); }
  function saveGallery(e){
    e.preventDefault();
    const title = document.getElementById('galTitle').value.trim();
    const cat = document.getElementById('galCat').value.trim();
    galleryData.push({ title, cat, icon:'mandi' });
    persistGallery();
    closeGalleryModal();
    renderGalleryTable();
    JF.toast('Image added');
  }

  // ---- Persistence ----
  function persistMenu(){ DB.write(LS_KEYS.menu, menuData); }
  function persistGallery(){ DB.write(LS_KEYS.gallery, galleryData); }
  function persistReviews(){ DB.write(LS_KEYS.reviews, reviewsData); }
  function persistSettings(){ DB.write(LS_KEYS.settings, settingsData); }

  function saveSettings(e){
    e.preventDefault();
    settingsData = {
      name: document.getElementById('setName').value,
      description: document.getElementById('setDesc').value,
      phone: document.getElementById('setPhone').value,
      whatsapp: document.getElementById('setWhatsapp').value,
      instagram: document.getElementById('setInstagram').value,
      address: document.getElementById('setAddress').value,
      hours: document.getElementById('setHours').value,
    };
    persistSettings();
    JF.toast('Restaurant info saved');
  }

  function gotoPage(p){ menuPage = p; renderMenuTable(); }

  function wire(){
    document.querySelectorAll('#adminNav a').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault(); switchView(a.dataset.view);
    }));
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('jf_admin_auth');
      window.location.href = 'admin-login.html';
    });
    document.getElementById('itemForm').addEventListener('submit', saveItem);
    document.getElementById('catForm').addEventListener('submit', saveCategory);
    document.getElementById('galForm').addEventListener('submit', saveGallery);
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    document.getElementById('photoSettingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      StockPhotos.saveSettings({
        provider: document.getElementById('photoProvider').value,
        apiKey: document.getElementById('photoApiKey').value.trim(),
        query_suffix: document.getElementById('photoSuffix').value.trim() || 'food dish',
      });
      JF.toast('API settings saved');
    });
    document.getElementById('startFetchBtn').addEventListener('click', () => {
      const settings = StockPhotos.getSettings();
      if(!settings.apiKey){ JF.toast('Add an API key first'); return; }
      const items = flattenItems().map(i => ({ id: i.id, name: i.name }));
      const statusEl = document.getElementById('fetchStatus');
      statusEl.textContent = 'Fetching…';
      StockPhotos.batchFetchAll(items, 900,
        (done, total, name) => {
          statusEl.textContent = `Fetching ${done}/${total} — "${name}"`;
          refreshPhotoProgress();
        },
        (reason) => {
          refreshPhotoProgress();
          if(reason === 'complete'){ statusEl.textContent = 'All done! Refresh the Menu page to see the photos.'; JF.toast('Photo fetch complete'); }
          if(reason === 'stopped'){ statusEl.textContent = 'Stopped — click Start / Resume to continue.'; }
          if(reason === 'no-key'){ statusEl.textContent = 'No API key set.'; }
        }
      );
    });
    document.getElementById('stopFetchBtn').addEventListener('click', () => {
      StockPhotos.stopBatch();
      JF.toast('Fetch stopped');
    });
    document.getElementById('clearPhotosBtn').addEventListener('click', () => {
      StockPhotos.clearCache();
      refreshPhotoProgress();
      JF.toast('Cached photos cleared');
    });
    document.getElementById('menuAdminSearch').addEventListener('input', (e) => { menuSearch = e.target.value.toLowerCase(); menuPage=1; renderMenuTable(); });
    document.getElementById('menuAdminFilter').addEventListener('change', (e) => { menuCatFilter = e.target.value; menuPage=1; renderMenuTable(); });
    document.getElementById('confirmCancel').addEventListener('click', () => { pendingDelete=null; document.getElementById('confirmModalOverlay').classList.remove('open'); });
    document.getElementById('confirmOk').addEventListener('click', executeDelete);
  }

  async function init(){
    menuData = DB.read(LS_KEYS.menu, null);
    if(!menuData){
      const res = await fetch('data/menu.json');
      menuData = await res.json();
      persistMenu();
    }
    galleryData = DB.read(LS_KEYS.gallery, [
      {title:'Al Faham Chicken Mandi', cat:'Mandi', icon:'mandi'},
      {title:'Bucket Biriyani', cat:'Biriyani', icon:'biriyani'},
      {title:'Blueberry Mojito', cat:'Beverages', icon:'mojito'},
    ]);
    reviewsData = DB.read(LS_KEYS.reviews, [
      {name:'Arun K.', stars:5, text:'The Al Faham Mandi tastes just like Kuwait!'},
      {name:'Divya R.', stars:5, text:'Best mocktails on the highway.'},
    ]);
    settingsData = DB.read(LS_KEYS.settings, {
      name:'Jungle Foods',
      description:'A multi-cuisine restaurant serving Mandi, Biriyani, Chinese Foods, Indian Breads, Shawarma, Beverages, Desserts, Snacks, and more.',
      phone:'+91 9600420706', whatsapp:'+91 9600420706',
      instagram:'https://www.instagram.com/jungle_foods_',
      address:'Jungle Foods, FPM7+5RJ, Cuddalore–Chidambaram Highway, Manjakuzhi, Tamil Nadu – 608501',
      hours:'10:00 AM – 10:00 PM',
    });

    populateCategoryFilter();
    wire();
    refreshStats();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchView, openItemModal, closeItemModal, editItem, confirmDeleteItem,
    openCategoryModal, closeCategoryModal, confirmDeleteCategory,
    openGalleryModal, closeGalleryModal, confirmDeleteGallery,
    confirmDeleteReview, gotoPage,
  };
})();
