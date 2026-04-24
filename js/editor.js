/**
 * editor.js — Hansje Görtz website inline editor
 *
 * Access:  visit hansjegortz.com/#edit to reveal the edit button
 * Auth:    GitHub Personal Access Token (stored in sessionStorage only)
 * Save:    commits index.html directly to GitHub → Netlify auto-redeploys (~30s)
 */

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const GITHUB_OWNER  = 'Carlos-Montenegro';
const GITHUB_REPO   = 'Hansje-website';
const GITHUB_BRANCH = 'main';
const GITHUB_FILE   = 'index.html';

// ── STATE ──────────────────────────────────────────────────────────────────────
let _token   = null;
let _editing = false;
let _dragSrc = null;
let _fileInput = null;

// ── BOOT ───────────────────────────────────────────────────────────────────────
checkHash();
window.addEventListener('hashchange', checkHash);

function checkHash() {
  if (window.location.hash !== '#edit') return;
  const btn = document.getElementById('editor-toggle');
  if (!btn) return;
  btn.hidden = false;
  _token = sessionStorage.getItem('editor_token') || null;
  btn.onclick = onEditButtonClick;
}

// ── AUTH + TOGGLE ──────────────────────────────────────────────────────────────
async function onEditButtonClick() {
  if (_editing) {
    deactivateEditMode();
    return;
  }

  if (!_token) {
    const raw = window.prompt(
      'Enter your GitHub Personal Access Token to enable editing:\n' +
      '(Requires Contents: write permission on the Hansje-website repo)'
    );
    if (!raw || !raw.trim()) return;
    const t = raw.trim();

    setStatus('Verifying token…');
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) {
        window.alert('Invalid token — please check and try again.');
        setStatus('');
        return;
      }
      _token = t;
      sessionStorage.setItem('editor_token', _token);
      setStatus('');
    } catch {
      window.alert('Could not connect to GitHub. Check your internet connection.');
      setStatus('');
      return;
    }
  }

  activateEditMode();
}

// ── ACTIVATE ───────────────────────────────────────────────────────────────────
function activateEditMode() {
  _editing = true;
  document.body.classList.add('edit-mode');

  const btn = document.getElementById('editor-toggle');
  if (btn) { btn.textContent = '✕'; btn.title = 'Exit edit mode'; }

  createToolbar();
  enableTextEditing();
  initTagEditor();
  initCreditsEditor();
  initTrainingEditor();
  initPhotoEditor();
}

// ── DEACTIVATE ─────────────────────────────────────────────────────────────────
function deactivateEditMode() {
  _editing = false;
  document.body.classList.remove('edit-mode');

  const btn = document.getElementById('editor-toggle');
  if (btn) { btn.textContent = '✏'; btn.title = 'Edit page'; }

  document.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());
  document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  document.querySelectorAll('.photo-item[draggable]').forEach(el => el.removeAttribute('draggable'));
  document.querySelectorAll('[data-training-list] li[draggable]').forEach(el => el.removeAttribute('draggable'));
}

// ── TOOLBAR ────────────────────────────────────────────────────────────────────
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'editor-toolbar';
  toolbar.setAttribute('data-editor-ui', 'true');
  toolbar.innerHTML = `
    <span class="editor-toolbar-label">Edit Mode</span>
    <span id="editor-status"></span>
    <button id="editor-save-btn" class="editor-toolbar-btn editor-toolbar-btn--primary">Save &amp; Deploy</button>
    <button id="editor-exit-btn" class="editor-toolbar-btn">Exit</button>
  `;
  document.body.appendChild(toolbar);
  document.getElementById('editor-save-btn').addEventListener('click', saveAndDeploy);
  document.getElementById('editor-exit-btn').addEventListener('click', deactivateEditMode);
}

// ── TEXT EDITING ───────────────────────────────────────────────────────────────
function enableTextEditing() {
  document.querySelectorAll('[data-editable]').forEach(el => {
    el.contentEditable = 'true';
    el.spellcheck = true;
    // Prevent Enter creating block wrappers in single-line elements
    if (!el.classList.contains('about-bio') && !el.classList.contains('contact-subtext')) {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.preventDefault();
      });
    }
  });
}

// ── TAG EDITOR ─────────────────────────────────────────────────────────────────
function initTagEditor() {
  const container = document.querySelector('[data-tag-container]');
  if (!container) return;

  container.querySelectorAll('.tag').forEach(tag => addTagRemoveButton(tag));

  const addWrap = document.createElement('span');
  addWrap.className = 'editor-add-tag-wrap';
  addWrap.setAttribute('data-editor-ui', 'true');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'editor-add-tag-input';
  input.placeholder = 'New tag…';
  input.maxLength = 32;

  const addBtn = document.createElement('button');
  addBtn.className = 'editor-add-tag-btn';
  addBtn.textContent = '+';
  addBtn.title = 'Add tag';

  const doAdd = () => {
    const val = input.value.trim();
    if (!val) return;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = val;
    addTagRemoveButton(tag);
    container.insertBefore(tag, addWrap);
    input.value = '';
    input.focus();
  };

  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });

  addWrap.appendChild(input);
  addWrap.appendChild(addBtn);
  container.appendChild(addWrap);
}

function addTagRemoveButton(tag) {
  const btn = document.createElement('button');
  btn.className = 'editor-remove-tag';
  btn.setAttribute('data-editor-ui', 'true');
  btn.textContent = '×';
  btn.title = 'Remove tag';
  btn.addEventListener('click', e => { e.stopPropagation(); tag.remove(); });
  tag.appendChild(btn);
}

// ── CREDITS EDITOR ─────────────────────────────────────────────────────────────
function initCreditsEditor() {
  document.querySelectorAll('.credits-list').forEach(panel => {
    // Remove button on each existing credit item
    panel.querySelectorAll('.credit-item').forEach(item => addCreditItemControls(item));

    // "+ Add credit" button at the bottom of each panel
    const addBtn = document.createElement('button');
    addBtn.className = 'editor-add-entry-btn';
    addBtn.setAttribute('data-editor-ui', 'true');
    addBtn.textContent = '+ Add credit';
    addBtn.addEventListener('click', () => toggleAddCreditForm(panel, addBtn));
    panel.appendChild(addBtn);
  });
}

function addCreditItemControls(item) {
  const removeBtn = document.createElement('button');
  removeBtn.className = 'editor-remove-entry';
  removeBtn.setAttribute('data-editor-ui', 'true');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove credit';
  removeBtn.style.cssText = 'position:absolute;right:0.25rem;top:50%;transform:translateY(-50%);';
  removeBtn.addEventListener('click', () => item.remove());
  item.style.position = 'relative';
  item.appendChild(removeBtn);
}

function toggleAddCreditForm(panel, addBtn) {
  const existing = addBtn.previousElementSibling;
  if (existing && existing.classList.contains('editor-inline-form')) {
    existing.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'editor-inline-form';
  form.setAttribute('data-editor-ui', 'true');
  form.innerHTML = `
    <input type="text" class="editor-form-role" placeholder="Role (e.g. Lead — Anna)" style="flex:1;min-width:140px;" />
    <input type="text" class="editor-form-ctitle" placeholder="Project title" style="flex:1;min-width:120px;" />
    <input type="text" class="editor-form-details" placeholder="Director · Country · Year" style="flex:1;min-width:160px;" />
    <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
    <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
  `;

  form.querySelector('.editor-form-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.editor-form-add-btn').addEventListener('click', () => {
    const role    = form.querySelector('.editor-form-role').value.trim();
    const ctitle  = form.querySelector('.editor-form-ctitle').value.trim();
    const details = form.querySelector('.editor-form-details').value.trim();
    if (!role && !ctitle) { form.querySelector('.editor-form-role').focus(); return; }

    const item = document.createElement('div');
    item.className = 'credit-item';
    item.innerHTML = `
      <span class="credit-role" data-editable>${role}</span>
      <span class="credit-title" data-editable>${ctitle}</span>
      <span class="credit-details" data-editable>${details}</span>
    `;
    panel.insertBefore(item, addBtn);
    addCreditItemControls(item);
    // Make new spans contenteditable
    item.querySelectorAll('[data-editable]').forEach(el => {
      el.contentEditable = 'true';
      el.spellcheck = true;
      el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    });
    form.remove();
  });

  form.querySelector('.editor-form-details').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); form.querySelector('.editor-form-add-btn').click(); }
  });

  addBtn.before(form);
  form.querySelector('.editor-form-role').focus();
}

// ── TRAINING EDITOR ────────────────────────────────────────────────────────────
function initTrainingEditor() {
  document.querySelectorAll('[data-training-list]').forEach(ul => {
    ul.querySelectorAll('li').forEach(li => addTrainingItemControls(li, ul));

    const addBtn = document.createElement('button');
    addBtn.className = 'editor-add-entry-btn';
    addBtn.setAttribute('data-editor-ui', 'true');
    addBtn.textContent = '+ Add entry';
    addBtn.addEventListener('click', () => toggleAddEntryForm(ul, addBtn));
    ul.after(addBtn);
  });
}

function addTrainingItemControls(li, ul) {
  const handle = document.createElement('span');
  handle.className = 'editor-drag-handle-entry';
  handle.setAttribute('data-editor-ui', 'true');
  handle.textContent = '⠿';
  handle.title = 'Drag to reorder';
  li.prepend(handle);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'editor-remove-entry';
  removeBtn.setAttribute('data-editor-ui', 'true');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove entry';
  removeBtn.addEventListener('click', () => li.remove());
  li.appendChild(removeBtn);

  li.draggable = true;
  li.addEventListener('dragstart', e => {
    _dragSrc = li;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => li.classList.add('dragging'), 0);
  });
  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    ul.querySelectorAll('li').forEach(l => l.classList.remove('drag-over'));
    _dragSrc = null;
  });
  li.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
  li.addEventListener('dragenter', () => li.classList.add('drag-over'));
  li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
  li.addEventListener('drop', e => {
    e.stopPropagation();
    if (_dragSrc && _dragSrc !== li) {
      const items = [...ul.querySelectorAll('li')];
      if (items.indexOf(_dragSrc) < items.indexOf(li)) li.after(_dragSrc);
      else li.before(_dragSrc);
    }
    li.classList.remove('drag-over');
  });
}

function toggleAddEntryForm(ul, addBtn) {
  const existing = addBtn.nextElementSibling;
  if (existing && existing.classList.contains('editor-inline-form')) {
    existing.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'editor-inline-form';
  form.setAttribute('data-editor-ui', 'true');
  form.innerHTML = `
    <input type="text" class="editor-form-year" placeholder="Year (e.g. 2026)" maxlength="12" />
    <input type="text" class="editor-form-desc" placeholder="Description" />
    <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
    <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
  `;

  form.querySelector('.editor-form-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.editor-form-add-btn').addEventListener('click', () => {
    const year = form.querySelector('.editor-form-year').value.trim();
    const desc = form.querySelector('.editor-form-desc').value.trim();
    if (!desc) { form.querySelector('.editor-form-desc').focus(); return; }

    const li = document.createElement('li');
    if (year) {
      li.innerHTML = `<span class="training-year" data-editable>${year}</span><span class="training-desc" data-editable>${desc}</span>`;
    } else {
      li.innerHTML = `<span class="training-desc" data-editable>${desc}</span>`;
    }
    ul.appendChild(li);
    addTrainingItemControls(li, ul);
    enableTextEditing();
    form.remove();
  });

  form.querySelector('.editor-form-desc').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); form.querySelector('.editor-form-add-btn').click(); }
  });

  addBtn.after(form);
  form.querySelector('.editor-form-year').focus();
}

// ── PHOTO EDITOR ───────────────────────────────────────────────────────────────
function initPhotoEditor() {
  const grid = document.querySelector('.photos-grid');
  if (!grid) return;

  grid.querySelectorAll('.photo-item').forEach(item => addPhotoItemControls(item, grid));

  _fileInput = document.createElement('input');
  _fileInput.type = 'file';
  _fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';
  _fileInput.style.display = 'none';
  _fileInput.setAttribute('data-editor-ui', 'true');
  _fileInput.addEventListener('change', onFileSelected);
  document.body.appendChild(_fileInput);

  const addBtn = document.createElement('div');
  addBtn.className = 'editor-add-photo-btn';
  addBtn.setAttribute('data-editor-ui', 'true');
  addBtn.innerHTML = '<span>+ Add photo</span>';
  addBtn.addEventListener('click', () => _fileInput.click());
  grid.appendChild(addBtn);
}

function addPhotoItemControls(item, grid) {
  item.draggable = true;

  const handle = document.createElement('div');
  handle.className = 'editor-drag-handle';
  handle.setAttribute('data-editor-ui', 'true');
  handle.textContent = '⠿';
  handle.title = 'Drag to reorder';
  item.appendChild(handle);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'editor-remove-photo';
  removeBtn.setAttribute('data-editor-ui', 'true');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove photo';
  removeBtn.addEventListener('click', e => { e.stopPropagation(); item.remove(); });
  item.appendChild(removeBtn);

  item.addEventListener('dragstart', e => {
    _dragSrc = item;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => item.classList.add('dragging'), 0);
  });
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    grid.querySelectorAll('.photo-item').forEach(p => p.classList.remove('drag-over'));
    _dragSrc = null;
  });
  item.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
  item.addEventListener('dragenter', e => { e.preventDefault(); item.classList.add('drag-over'); });
  item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
  item.addEventListener('drop', e => {
    e.stopPropagation();
    if (_dragSrc && _dragSrc !== item) {
      const items = [...grid.querySelectorAll('.photo-item')];
      if (items.indexOf(_dragSrc) < items.indexOf(item)) item.after(_dragSrc);
      else item.before(_dragSrc);
      grid.querySelectorAll('.photo-item').forEach((p, i) => { p.dataset.index = i; });
    }
    item.classList.remove('drag-over');
  });
}

// ── PHOTO UPLOAD ───────────────────────────────────────────────────────────────
async function onFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  _fileInput.value = '';

  setStatus('Uploading photo…');

  try {
    const base64 = await fileToBase64(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/images/${filename}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Add photo: ${filename}`,
          content: base64,
          branch: GITHUB_BRANCH
        })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      showToast('Upload failed: ' + (err.message || 'unknown error'), 'error');
      setStatus('');
      return;
    }

    const grid = document.querySelector('.photos-grid');
    const count = grid.querySelectorAll('.photo-item').length;
    const newItem = document.createElement('div');
    newItem.className = 'photo-item';
    newItem.dataset.index = count;

    const img = document.createElement('img');
    img.src = `images/${filename}`;
    img.alt = 'Hansje Görtz';
    img.loading = 'lazy';
    newItem.appendChild(img);

    const addBtn = grid.querySelector('.editor-add-photo-btn');
    grid.insertBefore(newItem, addBtn);
    addPhotoItemControls(newItem, grid);

    setStatus('');
    showToast('Photo uploaded ✓ — click Save & Deploy to go live');
  } catch (err) {
    showToast('Upload error: ' + err.message, 'error');
    setStatus('');
  }
}

// ── SAVE & DEPLOY ──────────────────────────────────────────────────────────────
async function saveAndDeploy() {
  const saveBtn = document.getElementById('editor-save-btn');
  if (saveBtn) saveBtn.disabled = true;
  setStatus('Saving…');

  try {
    // 1. Deep clone the full document
    const clone = document.documentElement.cloneNode(true);

    // 2. Remove all editor-injected UI elements
    clone.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());

    // 3. Remove edit-mode state
    clone.querySelector('body').classList.remove('edit-mode');
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));

    // 4. Hide the edit toggle button
    const toggleBtn = clone.querySelector('#editor-toggle');
    if (toggleBtn) toggleBtn.hidden = true;

    // 5. Update photo data-index values
    clone.querySelectorAll('.photo-item').forEach((p, i) => { p.dataset.index = i; });

    // 6. Bump cache-busting version on local assets
    bumpAssetVersions(clone);

    // 7. Serialise to clean HTML string
    const html = '<!DOCTYPE html>\n' + clone.outerHTML;

    // 8. Fetch current file SHA from GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `Bearer ${_token}` } }
    );
    if (!getRes.ok) {
      showToast('Could not reach GitHub — check your connection.', 'error');
      return;
    }
    const { sha } = await getRes.json();

    // 9. Commit updated file
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Content update via editor',
          content: toBase64(html),
          sha,
          branch: GITHUB_BRANCH
        })
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      showToast('Save failed: ' + (err.message || 'unknown error'), 'error');
      return;
    }

    setStatus('Saved ✓');
    showToast('Saved ✓ — Netlify is deploying (~30 seconds)');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    setStatus('');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function bumpAssetVersions(clone) {
  const ts = Date.now();
  clone.querySelectorAll('link[href^="css/"]').forEach(el => {
    el.setAttribute('href', el.getAttribute('href').split('?')[0] + `?v=${ts}`);
  });
  clone.querySelectorAll('script[src^="js/"]').forEach(el => {
    el.setAttribute('src', el.getAttribute('src').split('?')[0] + `?v=${ts}`);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toBase64(str) {
  // UTF-8 safe base64 — handles ö, &, and other non-Latin1 characters
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function setStatus(msg) {
  const el = document.getElementById('editor-status');
  if (el) el.textContent = msg;
}

function showToast(msg, type = 'success') {
  const old = document.getElementById('editor-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'editor-toast';
  toast.setAttribute('data-editor-ui', 'true');
  toast.className = type === 'error' ? 'editor-toast editor-toast--error' : 'editor-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('editor-toast--visible')));

  setTimeout(() => {
    toast.classList.remove('editor-toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}
