const CACHE_NAME = 'aws-file-upload-v1';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
];

// Helper function to check if a response has expired
const isResponseExpired = (response) => {
  if (!response) return true;
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const date = new Date(dateHeader).getTime();
  return Date.now() - date > CACHE_EXPIRY;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(async (response) => {
        // For API calls (like file listings), check expiry
        if (event.request.url.includes('/api/') || event.request.url.includes('execute-api')) {
          // If response exists but is expired, fetch new
          if (response && isResponseExpired(response)) {
            try {
              const freshResponse = await fetch(event.request);
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, freshResponse.clone());
              return freshResponse;
            } catch (error) {
              // If fetch fails, return expired response as fallback
              return response;
            }
          }
          // If no cached response, fetch new
          if (!response) {
            const freshResponse = await fetch(event.request);
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, freshResponse.clone());
            return freshResponse;
          }
        }
        
        // For static assets, return cached version or fetch new
        return response || fetch(event.request).then(freshResponse => {
          return caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, freshResponse.clone());
              return freshResponse;
            });
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 