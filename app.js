const DB_NAME = 'apk-space-library';
const DB_VERSION = 1;
const STORE = 'packages';
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const picker = document.getElementById('filePicker');
const grid = document.getElementById('apps');
const empty = document.getElementById('empty');
const dialog = document.getElementById('detailDialog');
const toast = document.getElementById('toast');
let toastTimer;
let selectedPackage = null;

async function allPackages() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.added - a.added));
    request.onerror = () => reject(request.error);
  });
}
async function savePackage(app) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(app);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Storage limit reached'));
  });
}
async function deletePackage(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function prettySize(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function extensionOf(name) { return name.split('.').pop().toLowerCase(); }
function typeLabel(type) { return ({ apk: 'APK · INSTALLABLE FILE', xapk: 'XAPK · APP BUNDLE', apks: 'APKS · SPLIT BUNDLE', aab: 'AAB · APP BUNDLE' })[type] || type.toUpperCase(); }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3800);
}
async function render() {
  const packages = await allPackages();
  const query = document.getElementById('search').value.trim().toLowerCase();
  const visible = packages.filter(app => app.name.toLowerCase().includes(query) || app.type.includes(query));
  document.getElementById('appCount').textContent = String(packages.length);
  grid.classList.toggle('hidden', visible.length === 0);
  empty.classList.toggle('hidden', visible.length > 0);
  grid.innerHTML = visible.map((app, index) => `
    <article class="card">
      <button class="card-open" data-open="${escapeHTML(app.id)}" aria-label="View ${escapeHTML(app.name)} details">
        <div class="cover cover-color-${index % 4}"><span class="cover-tag">${escapeHTML(app.type.toUpperCase())}</span></div>
        <div class="card-bottom"><strong class="app-title" title="${escapeHTML(app.name)}">${escapeHTML(app.name)}</strong><span class="card-meta"><span>${escapeHTML(prettySize(app.size))}</span><span class="file-type">${escapeHTML(app.type.toUpperCase())}</span></span></div>
      </button>
      <button class="delete" data-delete="${escapeHTML(app.id)}" aria-label="Remove ${escapeHTML(app.name)}">×</button>
    </article>`).join('');
  grid.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    const app = visible.find(item => item.id === button.dataset.open);
    if (app) showDetails(app);
  }));
  grid.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    const app = packages.find(item => item.id === button.dataset.delete);
    if (!app || !confirm(`Remove “${app.name}” from this browser? This deletes its saved copy.`)) return;
    await deletePackage(app.id);
    await render();
    showToast('File removed from this browser.');
  }));
}
function chooseFiles() { picker.click(); }
document.getElementById('addTop').addEventListener('click', chooseFiles);
document.getElementById('addHero').addEventListener('click', chooseFiles);
document.getElementById('addEmpty').addEventListener('click', chooseFiles);
document.getElementById('search').addEventListener('input', () => render().catch(() => showToast('Could not read the app library.')));
picker.addEventListener('change', async () => {
  const files = Array.from(picker.files || []);
  picker.value = '';
  if (!files.length) return;
  let added = 0;
  for (const file of files) {
    const type = extensionOf(file.name);
    if (!['apk', 'xapk', 'apks', 'aab'].includes(type)) {
      showToast(`${file.name}: choose an APK, XAPK, APKS, or AAB file.`);
      continue;
    }
    try {
      await savePackage({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        name: file.name.replace(/\.(apk|xapk|apks|aab)$/i, '') || 'Android app',
        filename: file.name,
        type,
        size: file.size,
        blob: file,
        added: Date.now()
      });
      added++;
    } catch (error) {
      console.error(error);
      showToast('Could not save this file. Your browser may have run out of storage space.');
    }
  }
  await render();
  if (added) showToast(`${added} file${added === 1 ? '' : 's'} saved in this browser on this device.`);
});
function showDetails(app) {
  selectedPackage = app;
  document.getElementById('detailTitle').textContent = app.name;
  document.getElementById('detailMessage').textContent = `${app.filename} · ${prettySize(app.size)}. This saved copy is available only in this browser on this device.`;
  const warning = app.type === 'apk'
    ? 'Android may offer to install this APK after download. You may need to allow installs from this browser. The app can still be incompatible with your Android version, CPU, device features, or required services.'
    : app.type === 'aab'
      ? 'AAB is a publishing bundle, not a directly installable APK. Downloading it does not install the app; it must first be converted or delivered by a compatible app-distribution tool.'
      : 'This is a split-app bundle. Android may not install it by tapping the file; a trusted installer that supports this bundle format may be required. Compatibility is not guaranteed.';
  document.getElementById('detailWarning').textContent = warning;
  const installButton = document.getElementById('downloadInstall');
  installButton.textContent = app.type === 'apk' ? 'Download to install' : 'Download file';
  dialog.showModal();
}
document.getElementById('downloadInstall').addEventListener('click', () => {
  if (!selectedPackage) return;
  const url = URL.createObjectURL(selectedPackage.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = selectedPackage.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  dialog.close();
  showToast(selectedPackage.type === 'apk' ? 'Downloaded. Open the APK from Downloads and follow Android’s installer prompts.' : 'Downloaded. This bundle format may need a compatible installer.');
});
function closeDetails() { dialog.close(); selectedPackage = null; }
document.getElementById('closeDetail').addEventListener('click', closeDetails);
document.getElementById('closeDetailSecondary').addEventListener('click', closeDetails);
dialog.addEventListener('click', event => { if (event.target === dialog) closeDetails(); });
document.getElementById('aboutLink').addEventListener('click', event => {
  event.preventDefault(); document.getElementById('about').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
const banner = document.querySelector('.welcome');
banner.addEventListener('dragover', event => { event.preventDefault(); banner.classList.add('dragging'); });
banner.addEventListener('dragleave', () => banner.classList.remove('dragging'));
banner.addEventListener('drop', event => {
  event.preventDefault(); banner.classList.remove('dragging');
  const files = Array.from(event.dataTransfer.files || []);
  if (!files.length) return;
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  picker.files = transfer.files;
  picker.dispatchEvent(new Event('change'));
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
render().catch(error => { console.error(error); showToast('Could not open the app library in this browser.'); });
