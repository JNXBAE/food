/* ===========================================================
   JUNGLE FOODS — Stock Photo Integration (Unsplash / Pexels)
   Runs entirely in the browser using YOUR OWN API key.
   Images are cached in localStorage so each dish is only
   fetched once. Falls back to the illustrated icon whenever
   no cached photo exists or a fetch fails.
   =========================================================== */

const StockPhotos = (() => {
  const SETTINGS_KEY = 'jf_stock_settings_v1';
  const CACHE_KEY = 'jf_stock_photos_v1';
  const PROGRESS_KEY = 'jf_stock_progress_v1';

  function getSettings(){
    try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { provider:'unsplash', apiKey:'', query_suffix:'food dish' }; }
    catch(e){ return { provider:'unsplash', apiKey:'', query_suffix:'food dish' }; }
  }
  function saveSettings(s){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  function getCache(){
    try{ return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch(e){ return {}; }
  }
  function saveCache(cache){ localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }

  function getCached(itemId){ return getCache()[itemId] || null; }

  function cacheImage(itemId, data){
    const cache = getCache();
    cache[itemId] = data;
    saveCache(cache);
  }

  function clearCache(){
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  }

  function getProgress(){ return parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10); }
  function setProgress(n){ localStorage.setItem(PROGRESS_KEY, String(n)); }

  // ---- Provider calls ----
  async function fetchUnsplash(query, apiKey){
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${apiKey}` } });
    if(!res.ok) throw new Error(`Unsplash ${res.status}`);
    const json = await res.json();
    const photo = json.results?.[0];
    if(!photo) return null;
    return {
      url: photo.urls.small,
      credit: photo.user?.name || 'Unsplash',
      creditUrl: photo.user?.links?.html || 'https://unsplash.com',
      provider: 'Unsplash',
    };
  }

  async function fetchPexels(query, apiKey){
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if(!res.ok) throw new Error(`Pexels ${res.status}`);
    const json = await res.json();
    const photo = json.photos?.[0];
    if(!photo) return null;
    return {
      url: photo.src.medium,
      credit: photo.photographer || 'Pexels',
      creditUrl: photo.photographer_url || 'https://pexels.com',
      provider: 'Pexels',
    };
  }

  async function fetchImageFor(item){
    const settings = getSettings();
    if(!settings.apiKey) return null;
    const cached = getCached(item.id || item.uid);
    if(cached) return cached;

    const query = `${item.name} ${settings.query_suffix || 'food dish'}`.trim();
    try{
      const result = settings.provider === 'pexels'
        ? await fetchPexels(query, settings.apiKey)
        : await fetchUnsplash(query, settings.apiKey);
      if(result){
        cacheImage(item.id || item.uid, result);
        return result;
      }
      return null;
    } catch(err){
      console.warn('Stock photo fetch failed for', item.name, err);
      return null;
    }
  }

  // ---- Batch processor (throttled, resumable) ----
  // items: [{id, name}], onProgress(done,total,lastItemName), onDone()
  let batchRunning = false;
  function stopBatch(){ batchRunning = false; }

  async function batchFetchAll(items, delayMs, onProgress, onDone){
    const settings = getSettings();
    if(!settings.apiKey){ onDone && onDone('no-key'); return; }
    batchRunning = true;
    let done = 0;
    const total = items.length;
    for(const item of items){
      if(!batchRunning){ onDone && onDone('stopped'); return; }
      const already = getCached(item.id);
      if(!already){
        await fetchImageFor(item);
        await new Promise(r => setTimeout(r, delayMs));
      }
      done++;
      onProgress && onProgress(done, total, item.name);
    }
    batchRunning = false;
    onDone && onDone('complete');
  }

  return {
    getSettings, saveSettings, getCache, getCached, cacheImage, clearCache,
    fetchImageFor, batchFetchAll, stopBatch,
  };
})();
