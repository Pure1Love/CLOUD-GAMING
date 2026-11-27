const DB_NAME = 'gamespace-library';
const DB_VERSION = 1;
const STORE = 'games';
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const picker = document.getElementById('filePicker');
const grid = document.getElementById('games');
const empty = document.getElementById('empty');
const dialog = document.getElementById('playDialog');
const toast = document.getElementById('toast');
let toastTimer;
let activeUrl = null;

async function getGames() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.added - a.added));
    request.onerror = () => reject(request.error);
  });
}
async function saveGame(game) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(game);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}
async function removeGame(id) {
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
function fileSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
async function render() {
  const games = await getGames();
  const query = document.getElementById('search').value.trim().toLowerCase();
  const visible = games.filter(game => game.name.toLowerCase().includes(query));
  document.getElementById('gameCount').textContent = String(games.length);
  grid.classList.toggle('hidden', visible.length === 0);
  empty.classList.toggle('hidden', visible.length > 0);
  grid.innerHTML = visible.map((game, index) => `
    <article class="card">
      <div class="cover ${game.kind === 'html' ? `cover-color-${index % 4}` : 'cover-import'}"><span class="cover-tag">${game.kind === 'html' ? 'BROWSER GAME' : 'GAME ARCHIVE'}</span></div>
      <div class="card-bottom"><div class="card-title"><strong title="${escapeHTML(game.name)}">${escapeHTML(game.name)}</strong><button class="delete" data-delete="${escapeHTML(game.id)}" aria-label="Delete ${escapeHTML(game.name)}">×</button></div>
      <div class="card-meta"><span>${escapeHTML(fileSize(game.size))}</span>${game.kind === 'html' ? '<a href="#play" class="play-link" data-play="' + escapeHTML(game.id) + '">Play →</a>' : '<span>Archive</span>'}</div></div>
    </article>`).join('');
  grid.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    const game = games.find(item => item.id === button.dataset.delete);
    if (!game || !confirm(`Remove “${game.name}” from this browser?`)) return;
    await removeGame(game.id); await render(); showToast('Game removed from this browser.');
  }));
  grid.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', async event => {
    event.preventDefault();
    const game = games.find(item => item.id === button.dataset.play);
    if (game) playGame(game);
  }));
}
function launchPicker() { picker.click(); }
document.getElementById('addTop').addEventListener('click', launchPicker);
document.getElementById('addHero').addEventListener('click', launchPicker);
document.getElementById('addEmpty').addEventListener('click', launchPicker);
document.getElementById('search').addEventListener('input', render);
picker.addEventListener('change', async () => {
  const files = Array.from(picker.files || []);
  picker.value = '';
  if (!files.length) return;
  for (const file of files) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['html', 'htm', 'zip'].includes(extension)) {
      showToast(`${file.name}: add an HTML browser game or ZIP archive.`);
      continue;
    }
    if (extension === 'zip' && typeof JSZip === 'undefined') {
      showToast('ZIP support needs an internet connection to load the archive reader.');
      continue;
    }
    try {
      let content = file;
      let entry = null;
      let kind = extension === 'zip' ? 'zip' : 'html';
      if (extension === 'zip') {
        const zip = await JSZip.loadAsync(file);
        const htmlFiles = Object.values(zip.files).filter(item => !item.dir && /\.html?$/i.test(item.name));
        entry = htmlFiles.find(item => /(^|\/)index\.html?$/i.test(item.name)) || htmlFiles[0];
        if (!entry) { showToast(`${file.name}: no HTML game entry was found in the ZIP.`); continue; }
        content = await entry.async('blob');
        if (entry.name.includes('/')) {
          // Browser archives are imported as a launchable entry file. Games using extra loose assets may need a self-contained HTML build.
          kind = 'html';
        } else kind = 'html';
      }
      const name = extension === 'zip' ? file.name.replace(/\.zip$/i, '') : file.name.replace(/\.html?$/i, '');
      await saveGame({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: name || 'Browser game', kind, size: file.size, content, entry: entry ? entry.name : file.name, added: Date.now() });
    } catch (error) {
      console.error(error);
      showToast(`Could not import ${file.name}. Check that the file is a valid game.`);
    }
  }
  await render();
  showToast('Import complete. Your files are saved in this browser on this device.');
});
async function playGame(game) {
  const source = await game.content.text();
  // Sandbox scripts without same-origin access; imported games cannot access this site's storage or parent page.
  const frame = document.createElement('iframe');
  frame.setAttribute('title', game.name);
  frame.setAttribute('sandbox', 'allow-scripts allow-pointer-lock allow-forms');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.srcdoc = source;
  const playArea = document.getElementById('playArea');
  playArea.replaceChildren(frame);
  document.getElementById('playingTitle').textContent = game.name;
  dialog.showModal();
}
function closeGame() {
  document.getElementById('playArea').replaceChildren();
  if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = null; }
  dialog.close();
}
document.getElementById('closePlay').addEventListener('click', closeGame);
dialog.addEventListener('click', event => { if (event.target === dialog) closeGame(); });
document.getElementById('aboutLink').addEventListener('click', event => {
  event.preventDefault(); document.querySelector('.notice').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
const banner = document.querySelector('.welcome');
banner.addEventListener('dragover', event => { event.preventDefault(); banner.classList.add('dragging'); });
banner.addEventListener('dragleave', () => banner.classList.remove('dragging'));
banner.addEventListener('drop', event => {
  event.preventDefault(); banner.classList.remove('dragging');
  const transfer = new DataTransfer();
  for (const file of event.dataTransfer.files) transfer.items.add(file);
  picker.files = transfer.files;
  picker.dispatchEvent(new Event('change'));
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
render().catch(error => { console.error(error); showToast('Could not open the game library in this browser.'); });
