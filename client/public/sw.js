const CACHE_NAME = 'railaware-static-v2';
const DB_NAME = 'RailAwareDB';
const STORE_NAME = 'awarenessCache';

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'gridKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(lat, lng, data) {
  try {
    const db = await initDB();
    const gridKey = getGridKey(lat, lng);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      gridKey,
      lat,
      lng,
      timestamp: Date.now(),
      data
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[SW] Failed to save to IndexedDB', err);
  }
}

async function getFromIndexedDB(lat, lng) {
  try {
    const db = await initDB();
    const gridKey = getGridKey(lat, lng);
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(gridKey);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[SW] Failed to read from IndexedDB', err);
    return null;
  }
}

// 0.005 degree grid matching the backend
function getGridKey(lat, lng) {
  const gridSize = 0.005;
  const latGrid = Math.floor(lat / gridSize) * gridSize;
  const lngGrid = Math.floor(lng / gridSize) * gridSize;
  return `${latGrid.toFixed(4)},${lngGrid.toFixed(4)}`;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('railaware-static-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/v1/awareness' && event.request.method === 'POST') {
    event.respondWith(handleAwarenessPost(event.request));
  } else if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Only cache valid HTTP responses
            if (event.request.url.startsWith('http') && fetchRes.status === 200) {
              cache.put(event.request, fetchRes.clone());
            }
            return fetchRes;
          });
        });
      })
    );
  }
});

async function handleAwarenessPost(request) {
  // We must clone the request to read the body, as it can only be read once
  const reqClone = request.clone();
  let body;
  try {
    body = await reqClone.json();
  } catch (e) {
    // If we can't parse the body, just let the network handle it normally
    return fetch(request);
  }

  const { lat, lng } = body;

  try {
    // 1. Attempt the network fetch
    const networkResponse = await fetch(request);
    
    // 2. If it succeeds (2xx), save to cache
    if (networkResponse.ok) {
      const resClone = networkResponse.clone();
      try {
        const data = await resClone.json();
        await saveToIndexedDB(lat, lng, data);
      } catch (err) {
        console.error('[SW] Error parsing or saving network response', err);
      }
    }
    
    // 3. CRITICAL: Whether it's 200, 429, or 500, we pass the real response through.
    // We only fallback to cache if fetch() throws an error (e.g. true offline).
    return networkResponse;

  } catch (err) {
    // 4. True network failure (fetch threw an error). Fallback to cache.
    console.warn('[SW] Network failure, falling back to IndexedDB for /api/v1/awareness', err);
    if (lat != null && lng != null) {
      const cached = await getFromIndexedDB(lat, lng);
      if (cached && cached.data) {
        // Add a flag to indicate it's cached data and when it was fetched
        const payload = {
          ...cached.data,
          _isCached: true,
          _cachedAt: cached.timestamp
        };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // If no cache exists, we throw or return a synthesized 503 so the app knows we're offline and have no data
    return new Response(JSON.stringify({ error: 'Network offline and no cached data available.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
