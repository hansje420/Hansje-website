/**
 * editor.js — Hansje Görtz website inline editor
 *
 * Access:  visit hansjegortz.com/#edit to reveal the edit button
 * Auth:    GitHub Personal Access Token (stored in sessionStorage only)
 * Save:    commits index.html directly to GitHub → Netlify auto-redeploys (~30s)
 */

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const GITHUB_OWNER  = 'hansje420';
const GITHUB_REPO   = 'Hansje-website';
const GITHUB_BRANCH = 'main';
const GITHUB_FILE   = 'index.html';

// ── STATE ──────────────────────────────────────────────────────────────────────
let _token   = null;
let _editing = false;
let _dragSrc = null;
let _fileInput = null;
let _authPromptOpen = false;
let _saving = false;

// ── BOOT ───────────────────────────────────────────────────────────────────────
checkHash();
window.addEventListener('hashchange', checkHash);

function checkHash() {
  if (window.location.hash !== '#edit') {
    if (_editing) deactivateEditMode();
    return;
  }

  _token = sessionStorage.getItem('editor_token') || null;
  requestEditAccess();
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function requestEditAccess() {
  if (_editing || _authPromptOpen) return;

  if (!_token) {
    _authPromptOpen = true;
    const raw = await openEditingPasswordDialog();
    _authPromptOpen = false;
    if (!raw || !raw.trim()) return;
    _token = raw.trim();
    sessionStorage.setItem('editor_token', _token);
  }

  activateEditMode();
}

function openEditingPasswordDialog() {
  return new Promise(resolve => {
    const existing = document.getElementById('editor-password-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'editor-password-modal';
    modal.setAttribute('data-editor-ui', 'true');
    modal.innerHTML = `
      <form class="editor-password-card">
        <p class="editor-password-label">Website Editor</p>
        <h2 class="editor-password-title">Enter editing password</h2>
        <p class="editor-password-help">Use the private editing password provided for this website.</p>
        <input class="editor-password-input" type="password" autocomplete="off" spellcheck="false" placeholder="Editing password" />
        <p class="editor-password-status" aria-live="polite"></p>
        <div class="editor-password-actions">
          <button type="button" class="editor-toolbar-btn editor-password-cancel">Cancel</button>
          <button type="submit" class="editor-toolbar-btn editor-toolbar-btn--primary editor-password-submit">Continue</button>
        </div>
      </form>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('form');
    const input = modal.querySelector('.editor-password-input');
    const status = modal.querySelector('.editor-password-status');
    const submitBtn = modal.querySelector('.editor-password-submit');
    const cancelBtn = modal.querySelector('.editor-password-cancel');

    const close = value => {
      modal.remove();
      resolve(value);
    };

    cancelBtn.addEventListener('click', () => close(null));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const candidate = input.value.trim();
      if (!candidate) {
        status.textContent = 'Please enter the editing password.';
        input.focus();
        return;
      }

      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      status.textContent = 'Checking password...';

      try {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${candidate}` }
        });

        if (!res.ok) {
          status.textContent = 'That password did not work. Please check it and try again.';
          submitBtn.disabled = false;
          cancelBtn.disabled = false;
          input.focus();
          input.select();
          return;
        }

        close(candidate);
      } catch {
        status.textContent = 'Could not connect to the editor service. Check the internet connection and try again.';
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    });

    input.focus();
  });
}

// ── ACTIVATE ───────────────────────────────────────────────────────────────────
function activateEditMode() {
  if (_editing) return;
  _editing = true;
  document.body.classList.add('edit-mode');

  createToolbar();
  enableTextEditing();
  initShowreelEditor();
  initTagEditor();
  initCreditsEditor();
  initTrainingEditor();
  initPhotoEditor();
}

// ── DEACTIVATE ─────────────────────────────────────────────────────────────────
function deactivateEditMode() {
  _editing = false;
  document.body.classList.remove('edit-mode');

  document.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());
  document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  document.querySelectorAll('.photo-item[draggable]').forEach(el => el.removeAttribute('draggable'));
  document.querySelectorAll('[data-training-list] li[draggable]').forEach(el => el.removeAttribute('draggable'));
}

function exitEditMode() {
  deactivateEditMode();
  if (window.location.hash === '#edit') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
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
  document.getElementById('editor-exit-btn').addEventListener('click', exitEditMode);
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

// ── SHOWREEL EDITOR ───────────────────────────────────────────────────────────
function initShowreelEditor() {
  const list = document.querySelector('[data-showreel-list]');
  if (!list) return;

  list.querySelectorAll('.showreel-item').forEach(item => addShowreelItemControls(item, list));

  const addBtn = document.createElement('button');
  addBtn.className = 'editor-add-entry-btn editor-add-showreel-btn';
  addBtn.setAttribute('data-editor-ui', 'true');
  addBtn.textContent = '+ Add showreel';
  addBtn.addEventListener('click', () => toggleAddShowreelForm(list, addBtn));
  list.after(addBtn);
}

function addShowreelItemControls(item, list) {
  if (item.querySelector('.editor-remove-showreel')) return;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'editor-remove-showreel';
  removeBtn.setAttribute('data-editor-ui', 'true');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove showreel';
  removeBtn.addEventListener('click', () => item.remove());
  item.appendChild(removeBtn);
}

function toggleAddShowreelForm(list, addBtn) {
  const existing = addBtn.nextElementSibling;
  if (existing && existing.classList.contains('editor-inline-form')) {
    existing.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'editor-inline-form editor-showreel-form';
  form.setAttribute('data-editor-ui', 'true');
  form.innerHTML = `
    <input type="text" class="editor-form-reel-title" placeholder="Title (e.g. Commercial Showreel)" />
    <input type="url" class="editor-form-reel-url" placeholder="YouTube URL" />
    <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
    <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
  `;

  form.querySelector('.editor-form-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.editor-form-add-btn').addEventListener('click', () => {
    const title = form.querySelector('.editor-form-reel-title').value.trim() || 'Showreel';
    const url = form.querySelector('.editor-form-reel-url').value.trim();
    const embedUrl = toYouTubeEmbedUrl(url);

    if (!embedUrl) {
      showToast('Please add a valid YouTube URL.', 'error');
      form.querySelector('.editor-form-reel-url').focus();
      return;
    }

    const item = document.createElement('div');
    item.className = 'showreel-item';

    const heading = createEditableSpan('showreel-title', title);
    heading.dataset.editable = '';

    const videoWrap = document.createElement('div');
    videoWrap.className = 'video-wrap';

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.title = `Hansje Görtz — ${title}`;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';

    videoWrap.appendChild(iframe);
    item.append(heading, videoWrap);
    list.appendChild(item);
    addShowreelItemControls(item, list);

    heading.contentEditable = 'true';
    heading.spellcheck = true;
    heading.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    form.remove();
  });

  form.querySelector('.editor-form-reel-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); form.querySelector('.editor-form-add-btn').click(); }
  });

  addBtn.after(form);
  form.querySelector('.editor-form-reel-title').focus();
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
  const panel = item.closest('.credits-list');

  const handle = document.createElement('span');
  handle.className = 'editor-drag-handle-entry';
  handle.setAttribute('data-editor-ui', 'true');
  handle.textContent = '⠿';
  handle.title = 'Drag to reorder';
  item.prepend(handle);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'editor-remove-entry';
  removeBtn.setAttribute('data-editor-ui', 'true');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove credit';
  removeBtn.addEventListener('click', () => item.remove());
  item.appendChild(removeBtn);

  item.draggable = true;
  item.addEventListener('dragstart', e => {
    _dragSrc = item;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => item.classList.add('dragging'), 0);
  });
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    panel.querySelectorAll('.credit-item').forEach(el => el.classList.remove('drag-over'));
    _dragSrc = null;
  });
  item.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
  item.addEventListener('dragenter', () => item.classList.add('drag-over'));
  item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
  item.addEventListener('drop', e => {
    e.stopPropagation();
    if (_dragSrc && _dragSrc !== item) {
      const items = [...panel.querySelectorAll('.credit-item')];
      if (items.indexOf(_dragSrc) < items.indexOf(item)) item.after(_dragSrc);
      else item.before(_dragSrc);
    }
    item.classList.remove('drag-over');
  });
}

function toggleAddCreditForm(panel, addBtn) {
  const existing = addBtn.previousElementSibling;
  if (existing && existing.classList.contains('editor-inline-form')) {
    existing.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'editor-inline-form editor-inline-form--light';
  form.setAttribute('data-editor-ui', 'true');
  form.innerHTML = `
    <input type="text" class="editor-form-role" placeholder="Role (e.g. Lead — Anna)" />
    <input type="text" class="editor-form-ctitle" placeholder="Project title" />
    <input type="text" class="editor-form-details" placeholder="Director · Country · Year" />
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
    item.append(
      createEditableSpan('credit-role', role),
      createEditableSpan('credit-title', ctitle),
      createEditableSpan('credit-details', details)
    );
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
  // Mark items with no year so CSS can span the desc full-width
  // (can't use :only-child — editor siblings break it even when position:absolute)
  if (!li.querySelector('.training-year')) {
    li.dataset.noYear = 'true';
  }

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

  // Education/Courses use year + description; Languages/Physical Skills use one field.
  const listUsesYears = ul.dataset.trainingEntryType
    ? ul.dataset.trainingEntryType === 'dated'
    : !!ul.querySelector('.training-year');

  const form = document.createElement('div');
  form.className = 'editor-inline-form';
  form.setAttribute('data-editor-ui', 'true');

  if (listUsesYears) {
    form.innerHTML = `
      <input type="text" class="editor-form-year" placeholder="Year (e.g. 2026)" maxlength="12" />
      <input type="text" class="editor-form-desc" placeholder="Description" />
      <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
      <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
    `;
  } else {
    form.innerHTML = `
      <input type="text" class="editor-form-desc" placeholder="e.g. Spanish — B2 level" />
      <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
      <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
    `;
  }

  form.querySelector('.editor-form-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.editor-form-add-btn').addEventListener('click', () => {
    const yearInput = form.querySelector('.editor-form-year');
    const year = yearInput ? yearInput.value.trim() : '';
    const desc = form.querySelector('.editor-form-desc').value.trim();
    if (!desc) { form.querySelector('.editor-form-desc').focus(); return; }

    const li = document.createElement('li');
    if (year) {
      li.append(
        createEditableSpan('training-year', year),
        createEditableSpan('training-desc', desc)
      );
    } else {
      li.append(createEditableSpan('training-desc', desc));
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
  // Focus the first input in the form
  form.querySelector('input').focus();
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
  if (_saving) return;
  _saving = true;

  const saveBtn = document.getElementById('editor-save-btn');
  if (saveBtn) saveBtn.disabled = true;
  setStatus('Saving…');

  try {
    // 1. Deep clone the full document
    const clone = document.documentElement.cloneNode(true);

    // 2. Remove all editor-injected UI elements
    clone.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());

    // 3. Remove edit-mode state
    resetRuntimeState(clone);
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));

    // 4. Update photo data-index values
    clone.querySelectorAll('.photo-item').forEach((p, i) => { p.dataset.index = i; });

    // 5. Bump cache-busting version on local assets
    bumpAssetVersions(clone);

    // 6. Serialise to clean HTML string
    const html = '<!DOCTYPE html>\n' + clone.outerHTML;

    // 7. Fetch current file SHA from GitHub
    const getRes = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
      {
        cache: 'no-store',
        headers: githubHeaders()
      }
    );
    if (!getRes.ok) {
      const err = await readGitHubError(getRes);
      setStatus('Save failed');
      showToast('Save failed before upload: ' + err, 'error');
      return;
    }
    const { sha } = await getRes.json();

    // 8. Commit updated file
    const putRes = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        method: 'PUT',
        cache: 'no-store',
        headers: githubHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: 'Content update via editor',
          content: toBase64(html),
          sha,
          branch: GITHUB_BRANCH
        })
      }
    );

    if (!putRes.ok) {
      const err = putRes.status === 409
        ? 'A previous save may still be processing. Please wait a few seconds, then press Save & Deploy again.'
        : await readGitHubError(putRes);
      setStatus('Save failed');
      showToast(err, 'error');
      return;
    }

    setStatus('Saved ✓');
    showToast('Saved ✓ — Netlify is deploying (~30 seconds)');

  } catch (err) {
    const message = err.name === 'AbortError'
      ? 'Save took too long. Please check the connection and try again.'
      : 'Error: ' + err.message;
    setStatus('Save failed');
    showToast(message, 'error');
  } finally {
    _saving = false;
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

function githubHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${_token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readGitHubError(res) {
  try {
    const err = await res.json();
    return err.message || `GitHub returned status ${res.status}`;
  } catch {
    return `GitHub returned status ${res.status}`;
  }
}

function createEditableSpan(className, text) {
  const span = className === 'showreel-title' ? document.createElement('h3') : document.createElement('span');
  span.className = className;
  span.dataset.editable = '';
  span.textContent = text;
  return span;
}

function toYouTubeEmbedUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') {
      id = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v') || '';
      else if (parsed.pathname.startsWith('/embed/')) id = parsed.pathname.split('/')[2] || '';
      else if (parsed.pathname.startsWith('/shorts/')) id = parsed.pathname.split('/')[2] || '';
    }

    if (!/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

function resetRuntimeState(clone) {
  const body = clone.querySelector('body');
  if (body) {
    body.classList.remove('edit-mode');
    body.style.overflow = '';
  }

  const header = clone.querySelector('#site-header');
  if (header) header.classList.remove('scrolled');

  const hamburger = clone.querySelector('.hamburger');
  if (hamburger) {
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  const mobileNav = clone.querySelector('#mobile-nav');
  if (mobileNav) {
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
  }

  const lightbox = clone.querySelector('#lightbox');
  if (lightbox) {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  clone.querySelectorAll('.fade-target, .is-visible, .dragging, .drag-over').forEach(el => {
    el.classList.remove('fade-target', 'is-visible', 'dragging', 'drag-over');
  });

  clone.querySelectorAll('.credits-list').forEach(panel => {
    const isFilm = panel.id === 'tab-film';
    panel.classList.toggle('credits-list--active', isFilm);
    panel.hidden = !isFilm;
  });

  clone.querySelectorAll('.tab-btn').forEach(btn => {
    const isFilm = btn.dataset.tab === 'film';
    btn.classList.toggle('tab-btn--active', isFilm);
    btn.setAttribute('aria-selected', isFilm ? 'true' : 'false');
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
