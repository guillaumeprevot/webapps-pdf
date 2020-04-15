/**
 * The service worker will cache resources to allow offline usage :
 * - GOOGLE : https://developers.google.com/web/fundamentals/primers/service-workers/#update-a-service-worker
 * - MOZILLA : https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
 */
var cacheName = 'v4';
var baseCacheContent = [
	'./libs/bootstrap/css/bootstrap.min.css',
	'./libs/bootstrap/js/bootstrap.min.js',
	'./libs/fontawesome/css/fontawesome.min.css',
	'./libs/fontawesome/css/solid.min.css',
	'./libs/fontawesome/webfonts/fa-solid-900.woff2', // les autres dans "fetch"
	'./libs/jquery/jquery.min.js',
	'./libs/pdfjs/pdf.min.js',
	'./libs/pdfjs/pdf.worker.min.js',
	'./libs/popper/popper.min.js',
	'jquery-pdf.css',
	'jquery-pdf.js',
	'webapps-pdf.html',
	'webapps-pdf.ico',
	'webapps-pdf.png'
];

function info(text) {
	console.log('PDF Service Worker : ' + text);
}

function trace(text) {
	// console.log('PDF Service Worker : ' + text);
}

self.addEventListener('install', function(event) {
	info('installed');
	event.waitUntil(caches.open(cacheName).then(function(cache) {
		info('caching data');
		return cache.addAll(baseCacheContent).then(function() {
			info('data cached');
		});
	}))
});

self.addEventListener('activate', function(event) {
	info('activated');
	event.waitUntil(caches.keys().then(function(keys) {
		var cacheWhitelist = [cacheName];
		return Promise.all(keys.map(function(key) {
			if (cacheWhitelist.indexOf(key) === -1) {
				info('cleaning old cache ' + key);
				return caches.delete(key);
			}
		}));
	}));
});

self.addEventListener('fetch', function(event) {
	event.respondWith(caches.match(event.request).then(function(response) {
		if (response) {// Found in cache
			trace('using cache for ' + event.request.url);
			return response;
		}
		trace('fetching data for ' + event.request.url);
		return fetch(event.request).then(function(response) {
			// Check if we received a valid response
			if (!response || response.status !== 200 || response.type !== 'basic')
				return response;

			// IMPORTANT: Clone the response. A response is a stream
			// and because we want the browser to consume the response
			// as well as the cache consuming the response, we need
			// to clone it so we have two streams.
			var responseToCache = response.clone();

			caches.open(cacheName).then(function(cache) {
				trace('caching response for ' + event.request.url);
				cache.put(event.request, responseToCache);
			});

			return response;
		});
	}));
});
