const DB_NAME = 'safeSphereDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sosQueue'))
        db.createObjectStore('sosQueue', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cache'))
        db.createObjectStore('cache', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueSOS(sosData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sosQueue', 'readwrite');
    tx.objectStore('sosQueue').put({ id: Date.now(), ...sosData });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSOSQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sosQueue', 'readonly');
    const req = tx.objectStore('sosQueue').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearSOSQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sosQueue', 'readwrite');
    tx.objectStore('sosQueue').clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ key, value, cachedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly');
    const req = tx.objectStore('cache').get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}
