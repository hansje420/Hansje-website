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
let _authPromptOpen = false;
let _saving = false;

const COLLAGE_LAYOUTS = [
  { id: 'single', count: 1, label: 'Single photo' },
  { id: 'two-columns', count: 2, label: 'Side by side' },
  { id: 'two-rows', count: 2, label: 'Stacked' },
  { id: 'three-columns', count: 3, label: 'Three side by side' },
  { id: 'three-rows', count: 3, label: 'Three stacked' },
  { id: 'feature-left', count: 3, label: 'Large left' },
  { id: 'feature-right', count: 3, label: 'Large right' },
  { id: 'four-columns', count: 4, label: 'Four side by side' },
  { id: 'four-rows', count: 4, label: 'Four stacked' },
  { id: 'four-grid', count: 4, label: 'Two by two' },
  { id: 'feature-top', count: 4, label: 'Large on top' }
];

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
  initContactBlocksEditor();
}

// ── CONTACT BLOCKS EDITOR ─────────────────────────────────────────────────────
function initContactBlocksEditor() {
  const container = document.querySelector('[data-contact-blocks]');
  if (!container) return;

  container.querySelectorAll('.contact-block').forEach(block => addContactBlockControls(block));

  const addBtn = document.createElement('button');
  addBtn.className = 'editor-add-entry-btn editor-add-contact-block-btn';
  addBtn.setAttribute('data-editor-ui', 'true');
  addBtn.textContent = '+ Add block';
  addBtn.addEventListener('click', () => addContactBlock(container));
  container.after(addBtn);
}

function addContactBlockControls(block) {
  block.querySelectorAll('.contact-block__email').forEach(link => {
    link.classList.add('editor-email-editable');
    link.addEventListener('click', onContactEmailClick);
  });

  if (block.querySelector('.editor-remove-contact-block')) return;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'editor-remove-contact-block';
  removeBtn.setAttribute('data-editor-ui', 'true');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove block';
  removeBtn.addEventListener('click', () => block.remove());
  block.appendChild(removeBtn);
}

function addContactBlock(container) {
  const block = document.createElement('div');
  block.className = 'contact-block';

  const label = document.createElement('p');
  label.className = 'contact-block__label';
  label.dataset.editable = '';
  label.spellcheck = true;
  label.textContent = 'New Block';

  const name = document.createElement('p');
  name.className = 'contact-block__primary';
  name.dataset.editable = '';
  name.spellcheck = true;
  name.textContent = 'Name';

  const email = document.createElement('a');
  email.className = 'contact-block__email';
  email.href = 'mailto:email@example.com';
  email.textContent = 'email@example.com';

  block.append(label, name, email);
  container.appendChild(block);

  [label, name].forEach(el => {
    el.contentEditable = 'true';
    el.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  });

  addContactBlockControls(block);
}

function onContactEmailClick(e) {
  if (!_editing) return;
  e.preventDefault();

  const link = e.currentTarget;
  const current = link.textContent.trim();

  const next = window.prompt('Edit email address:', current);
  if (next === null) return;

  const trimmed = next.trim();
  if (!trimmed) {
    showToast('Email cannot be empty.', 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  link.textContent = trimmed;
  link.setAttribute('href', `mailto:${trimmed}`);
}

// ── DEACTIVATE ─────────────────────────────────────────────────────────────────
function deactivateEditMode() {
  _editing = false;
  document.body.classList.remove('edit-mode');

  document.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());
  document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  document.querySelectorAll('.photo-item[draggable]').forEach(el => el.removeAttribute('draggable'));
  document.querySelectorAll('[data-training-list] li[draggable]').forEach(el => el.removeAttribute('draggable'));
  document.querySelectorAll('.contact-block__email.editor-email-editable').forEach(el => {
    el.classList.remove('editor-email-editable');
    el.removeEventListener('click', onContactEmailClick);
  });
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
  document.querySelectorAll('[data-editable]:not(.tab-btn)').forEach(el => {
    sanitizeEditableContent(el);
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.spellcheck = true;
    el.addEventListener('paste', pasteAsPlainText);

    // Prevent Enter creating block wrappers in single-line elements
    if (!el.classList.contains('about-bio') && !el.classList.contains('contact-subtext')) {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.preventDefault();
      });
    }
  });
}

function pasteAsPlainText(e) {
  e.preventDefault();
  const preserveBreaks = shouldPreserveEditableBreaks(e.currentTarget);
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, cleanEditableText(text, preserveBreaks));
}

function sanitizeEditableContent(root) {
  const fields = root.matches && root.matches('[data-editable]')
    ? [root]
    : Array.from(root.querySelectorAll('[data-editable]'));

  fields.forEach(el => {
    const preserveBreaks = shouldPreserveEditableBreaks(el);
    const text = cleanEditableText(readEditableText(el, preserveBreaks), preserveBreaks);

    el.removeAttribute('style');
    el.removeAttribute('lang');

    if (!preserveBreaks) {
      el.textContent = text;
      return;
    }

    el.replaceChildren();
    text.split('\n').forEach((line, index) => {
      if (index) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  });
}

function shouldPreserveEditableBreaks(el) {
  return el.classList.contains('about-heading') || el.hasAttribute('data-multiline');
}

function readEditableText(el, preserveBreaks = false) {
  if (!preserveBreaks) return el.textContent || '';

  let text = '';
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.nodeValue;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.tagName === 'BR') {
      text += '\n';
      return;
    }

    if (isEditableBlockBreak(node)) {
      if (text && !text.endsWith('\n')) text += '\n';
      text += readEditableText(node, true);
      if (!text.endsWith('\n')) text += '\n';
      return;
    }

    text += readEditableText(node, true);
  });

  return text;
}

function isEditableBlockBreak(node) {
  return ['DIV', 'P'].includes(node.tagName);
}

function cleanEditableText(text, preserveBreaks = false) {
  const cleaned = (text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!preserveBreaks) return cleaned.replace(/\s*\n\s*/g, ' ');

  return cleaned
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
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
  const tabs = document.querySelector('.credits-tabs');
  if (!tabs) return;

  tabs.querySelectorAll('.tab-btn').forEach(btn => makeCreditTabEditable(btn));

  document.querySelectorAll('.credits-list').forEach(panel => {
    // Match the editor's reading and keyboard order to the public layout.
    panel.querySelectorAll('.credit-item').forEach(item => normalizeCreditFieldOrder(item));
    panel.querySelectorAll('.credit-item').forEach(item => addCreditItemControls(item));
    addCreditButton(panel);
  });

  const tabTools = document.createElement('div');
  tabTools.className = 'editor-credit-tab-tools';
  tabTools.setAttribute('data-editor-ui', 'true');
  tabTools.innerHTML = `
    <span class="editor-credit-tabs-help">Click a tab name to rename it.</span>
    <button class="editor-add-credit-tab-btn">+ Add tab</button>
  `;
  tabs.after(tabTools);

  tabTools.querySelector('.editor-add-credit-tab-btn').addEventListener('click', () => {
    toggleAddCreditTabForm(tabs, tabTools);
  });
}

function makeCreditTabEditable(btn) {
  btn.dataset.editable = '';
  btn.contentEditable = 'plaintext-only';
  if (btn.contentEditable !== 'plaintext-only') btn.contentEditable = 'true';
  btn.spellcheck = true;
  btn.title = 'Click the tab, then type to rename it';
  if (btn.dataset.creditTabEditorReady === 'true') return;
  btn.dataset.creditTabEditorReady = 'true';
  btn.addEventListener('paste', pasteAsPlainText);
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btn.blur();
    }
  });
  btn.addEventListener('blur', () => {
    btn.textContent = cleanEditableText(btn.textContent) || 'Untitled';
  });
}

function addCreditButton(panel) {
  const addBtn = document.createElement('button');
  addBtn.className = 'editor-add-entry-btn';
  addBtn.setAttribute('data-editor-ui', 'true');
  addBtn.textContent = '+ Add credit';
  addBtn.addEventListener('click', () => toggleAddCreditForm(panel, addBtn));
  panel.appendChild(addBtn);
}

function toggleAddCreditTabForm(tabs, tabTools) {
  const existing = tabTools.nextElementSibling;
  if (existing && existing.classList.contains('editor-credit-tab-form')) {
    existing.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'editor-inline-form editor-inline-form--light editor-credit-tab-form';
  form.setAttribute('data-editor-ui', 'true');
  form.innerHTML = `
    <input type="text" class="editor-form-tab-name" placeholder="Tab name (e.g. Voice-over)" maxlength="40" />
    <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
    <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
  `;

  const addTab = () => {
    const input = form.querySelector('.editor-form-tab-name');
    const name = input.value.trim();
    if (!name) { input.focus(); return; }

    const key = uniqueCreditTabKey(name);
    const tabId = `credit-tab-${key}`;
    const panelId = `tab-${key}`;

    const btn = document.createElement('button');
    btn.id = tabId;
    btn.className = 'tab-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', panelId);
    btn.dataset.tab = key;
    btn.textContent = name;
    makeCreditTabEditable(btn);
    tabs.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'credits-list';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.hidden = true;

    const footer = document.querySelector('.credits-footer');
    footer.before(panel);
    addCreditButton(panel);

    form.remove();
    btn.click();
    btn.focus();
  };

  form.querySelector('.editor-form-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.editor-form-add-btn').addEventListener('click', addTab);
  form.querySelector('.editor-form-tab-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTab(); }
  });

  tabTools.after(form);
  form.querySelector('.editor-form-tab-name').focus();
}

function uniqueCreditTabKey(name) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'category';

  let key = base;
  let suffix = 2;
  while (document.getElementById(`tab-${key}`)) key = `${base}-${suffix++}`;
  return key;
}

function normalizeCreditFieldOrder(item) {
  const title = item.querySelector('.credit-title');
  const role = item.querySelector('.credit-role');
  const details = item.querySelector('.credit-details');
  if (title) item.appendChild(title);
  if (role) item.appendChild(role);
  if (details) item.appendChild(details);
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
    <input type="text" class="editor-form-ctitle" placeholder="Play / project title" />
    <input type="text" class="editor-form-role" placeholder="Role (e.g. Lead — Anna)" />
    <input type="text" class="editor-form-details" placeholder="Director · Country · Year" />
    <button class="editor-toolbar-btn editor-toolbar-btn--primary editor-form-add-btn">Add</button>
    <button class="editor-toolbar-btn editor-form-cancel-btn">Cancel</button>
  `;

  form.querySelector('.editor-form-cancel-btn').addEventListener('click', () => form.remove());
  form.querySelector('.editor-form-add-btn').addEventListener('click', () => {
    const role    = form.querySelector('.editor-form-role').value.trim();
    const ctitle  = form.querySelector('.editor-form-ctitle').value.trim();
    const details = form.querySelector('.editor-form-details').value.trim();
    if (!role && !ctitle) { form.querySelector('.editor-form-ctitle').focus(); return; }

    const item = document.createElement('div');
    item.className = 'credit-item';
    item.append(
      createEditableSpan('credit-title', ctitle),
      createEditableSpan('credit-role', role),
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
  form.querySelector('.editor-form-ctitle').focus();
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

  const addBtn = document.createElement('div');
  addBtn.className = 'editor-add-photo-btn';
  addBtn.setAttribute('data-editor-ui', 'true');
  addBtn.setAttribute('role', 'button');
  addBtn.tabIndex = 0;
  addBtn.innerHTML = '<span>+ Add gallery item</span>';
  addBtn.addEventListener('click', () => openCollageBuilder());
  addBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCollageBuilder();
    }
  });
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

  const editBtn = document.createElement('button');
  editBtn.className = 'editor-edit-collage';
  editBtn.setAttribute('data-editor-ui', 'true');
  editBtn.textContent = 'Edit item';
  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    openCollageBuilder(item);
  });
  item.appendChild(editBtn);

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

function createCollageSlot(img = null, photoTitle = '') {
  const slot = document.createElement('div');
  slot.className = 'collage-slot';

  if (img) {
    slot.appendChild(img);
  } else {
    slot.classList.add('collage-slot--empty');
  }

  const title = document.createElement('p');
  title.className = 'collage-photo-title';
  title.textContent = photoTitle;
  slot.appendChild(title);

  return slot;
}

function ensurePhotoTitle(slot) {
  let title = slot.querySelector('.collage-photo-title');
  if (!title) {
    title = document.createElement('p');
    title.className = 'collage-photo-title';
    slot.appendChild(title);
  }
  return title;
}

function cloneCollageForEditing(item) {
  if (!item.querySelector('.collage-frame')) {
    const converted = createCollageItem('single');
    converted.dataset.index = item.dataset.index || '';
    const sourceImg = item.querySelector('img');
    const img = sourceImg ? sourceImg.cloneNode(true) : null;
    if (img) {
      img.style.setProperty('--collage-zoom', '1');
      img.style.setProperty('--collage-x', '50%');
      img.style.setProperty('--collage-y', '0%');
    }
    const oldTitle = item.querySelector('.collage-photo-title');
    const slot = createCollageSlot(img, oldTitle ? oldTitle.textContent.trim() : '');
    converted.querySelector('.collage-frame').appendChild(slot);
    return converted;
  }

  const clone = item.cloneNode(true);
  clone.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());
  clone.removeAttribute('draggable');
  clone.classList.remove('dragging', 'drag-over');
  return clone;
}

function createCollageItem(layoutId = 'single') {
  const item = document.createElement('div');
  item.className = layoutId === 'single'
    ? 'photo-item photo-item--framed-single'
    : 'photo-item photo-item--collage';
  item.dataset.collageLayout = layoutId;
  item.setAttribute('role', 'button');
  item.tabIndex = 0;

  const frame = document.createElement('div');
  frame.className = `collage-frame collage-layout--${layoutId}`;
  item.appendChild(frame);

  return item;
}

function openCollageBuilder(existingItem = null) {
  if (document.getElementById('collage-builder-modal')) return;

  const item = existingItem ? cloneCollageForEditing(existingItem) : createCollageItem();
  const frame = item.querySelector('.collage-frame');
  frame.querySelectorAll('.collage-title').forEach(title => title.remove());

  const currentLayout = COLLAGE_LAYOUTS.find(layout =>
    layout.id === item.dataset.collageLayout || frame.classList.contains(`collage-layout--${layout.id}`)
  ) || COLLAGE_LAYOUTS[0];

  const state = {
    item,
    frame,
    layout: currentLayout,
    slots: [...frame.querySelectorAll('.collage-slot')]
  };

  while (state.slots.length < currentLayout.count) state.slots.push(createCollageSlot());

  const modal = document.createElement('div');
  modal.id = 'collage-builder-modal';
  modal.className = 'editor-modal editor-collage-modal';
  modal.setAttribute('data-editor-ui', 'true');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'collage-builder-title');
  modal.innerHTML = `
    <div class="editor-modal-card collage-builder-card">
      <div class="collage-builder-header">
        <div>
          <p class="editor-password-label">${existingItem ? 'Edit gallery item' : 'New gallery item'}</p>
          <h2 id="collage-builder-title" class="editor-password-title">Build the full tile</h2>
          <p class="editor-password-help">Choose a single-photo or collage layout, then frame and optionally caption every photo. Collage photos touch with no gaps or borders.</p>
        </div>
        <button type="button" class="collage-builder-close" aria-label="Close collage builder">×</button>
      </div>
      <div class="collage-builder-layouts" role="group" aria-label="Collage arrangements"></div>
      <div class="collage-builder-workspace">
        <div class="collage-builder-preview-wrap">
          <p class="collage-builder-section-label">Full tile preview</p>
          <div class="collage-builder-preview"></div>
        </div>
        <div class="collage-photo-controls-wrap">
          <div class="collage-photo-controls-heading">
            <p class="collage-builder-section-label">Photos &amp; framing</p>
            <small>Drag only the dotted handle to reorder photos.</small>
          </div>
          <div class="collage-photo-controls"></div>
        </div>
      </div>
      <p class="collage-builder-status" aria-live="polite"></p>
      <div class="collage-builder-actions">
        <button type="button" class="editor-toolbar-btn collage-builder-cancel">Cancel</button>
        <button type="button" class="editor-toolbar-btn editor-toolbar-btn--primary collage-builder-apply">${existingItem ? 'Save gallery item' : 'Add gallery item'}</button>
      </div>
    </div>
  `;

  const layoutWrap = modal.querySelector('.collage-builder-layouts');
  const preview = modal.querySelector('.collage-builder-preview');
  const controls = modal.querySelector('.collage-photo-controls');
  const status = modal.querySelector('.collage-builder-status');
  const applyBtn = modal.querySelector('.collage-builder-apply');
  let draggedSlot = null;

  preview.appendChild(item);

  COLLAGE_LAYOUTS.forEach(layout => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'collage-layout-option';
    btn.dataset.layout = layout.id;
    btn.setAttribute('aria-pressed', layout.id === currentLayout.id ? 'true' : 'false');
    btn.innerHTML = `
      <span class="collage-layout-mini collage-layout--${layout.id}" aria-hidden="true">
        ${Array.from({ length: layout.count }, () => '<i></i>').join('')}
      </span>
      <span>${layout.label}</span>
      <small>${layout.count} ${layout.count === 1 ? 'photo' : 'photos'}</small>
    `;
    btn.addEventListener('click', () => setBuilderLayout(layout));
    layoutWrap.appendChild(btn);
  });

  function renderFrame() {
    state.frame.className = `collage-frame collage-layout--${state.layout.id}`;
    state.item.dataset.collageLayout = state.layout.id;
    state.item.classList.toggle('photo-item--framed-single', state.layout.count === 1);
    state.item.classList.toggle('photo-item--collage', state.layout.count > 1);
    state.frame.replaceChildren(...state.slots.slice(0, state.layout.count));
  }

  function setBuilderLayout(layout) {
    state.layout = layout;
    while (state.slots.length < layout.count) state.slots.push(createCollageSlot());
    renderFrame();
    layoutWrap.querySelectorAll('.collage-layout-option').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.layout === layout.id ? 'true' : 'false');
    });
    renderControls();
  }

  function moveSlot(from, to) {
    if (to < 0 || to >= state.layout.count || from === to) return;
    const [slot] = state.slots.splice(from, 1);
    state.slots.splice(to, 0, slot);
    renderFrame();
    renderControls();
  }

  function getImageSetting(img, name, fallback) {
    const value = img.style.getPropertyValue(name).trim();
    return value ? parseFloat(value) : fallback;
  }

  function setImageSetting(img, name, value, suffix = '') {
    img.style.setProperty(name, `${value}${suffix}`);
  }

  async function choosePhoto(slot, button) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.hidden = true;
    modal.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files[0];
      input.remove();
      if (!file) return;

      const previousChildren = [...slot.childNodes];
      button.disabled = true;
      status.textContent = `Uploading ${file.name}…`;
      try {
        const previewSrc = await fileToDataUrl(file);
        const img = document.createElement('img');
        img.src = previewSrc;
        img.alt = 'Hansje Görtz';
        img.loading = 'lazy';
        setImageSetting(img, '--collage-zoom', 1);
        setImageSetting(img, '--collage-x', 50, '%');
        setImageSetting(img, '--collage-y', 50, '%');
        const photoTitle = ensurePhotoTitle(slot);
        slot.replaceChildren(img, photoTitle);
        slot.classList.remove('collage-slot--empty');
        slot.dataset.uploadPending = 'true';
        applyBtn.disabled = true;
        renderControls();

        const path = await uploadPhotoFile(file, previewSrc);
        img.dataset.uploadSrc = path;
        delete slot.dataset.uploadPending;
        applyBtn.disabled = state.slots.some(candidate => candidate.dataset.uploadPending === 'true');
        status.textContent = 'Photo uploaded. Adjust its framing below.';
        renderControls();
      } catch (err) {
        slot.replaceChildren(...previousChildren);
        slot.classList.toggle('collage-slot--empty', !slot.querySelector('img'));
        delete slot.dataset.uploadPending;
        applyBtn.disabled = state.slots.some(candidate => candidate.dataset.uploadPending === 'true');
        renderControls();
        status.textContent = '';
        showToast('Upload failed: ' + err.message, 'error');
      }
    }, { once: true });

    input.click();
  }

  function renderControls() {
    controls.replaceChildren();

    state.slots.slice(0, state.layout.count).forEach((slot, index) => {
      const img = slot.querySelector('img');
      const card = document.createElement('div');
      card.className = 'collage-photo-card';
      card.dataset.slotIndex = index;
      card.innerHTML = `
        <div class="collage-photo-card-header">
          <span class="collage-photo-drag" title="Drag to reorder" role="button" aria-label="Drag photo ${index + 1} to reorder" tabindex="0">⠿</span>
          <strong>Photo ${index + 1}</strong>
          <div class="collage-photo-move-actions">
            <button type="button" data-move="previous" aria-label="Move photo ${index + 1} earlier">←</button>
            <button type="button" data-move="next" aria-label="Move photo ${index + 1} later">→</button>
          </div>
        </div>
        <button type="button" class="collage-photo-upload">${img ? 'Replace photo' : '+ Upload photo'}</button>
      `;

      card.querySelector('[data-move="previous"]').disabled = index === 0;
      card.querySelector('[data-move="next"]').disabled = index === state.layout.count - 1;
      card.querySelector('[data-move="previous"]').addEventListener('click', () => moveSlot(index, index - 1));
      card.querySelector('[data-move="next"]').addEventListener('click', () => moveSlot(index, index + 1));

      const uploadBtn = card.querySelector('.collage-photo-upload');
      uploadBtn.addEventListener('click', () => choosePhoto(slot, uploadBtn));

      const photoTitle = ensurePhotoTitle(slot);
      const photoTitleField = document.createElement('label');
      photoTitleField.className = 'collage-photo-title-field';
      photoTitleField.innerHTML = '<span>Photo caption</span><input type="text" maxlength="80" placeholder="Optional caption" />';
      const photoTitleInput = photoTitleField.querySelector('input');
      photoTitleInput.value = photoTitle.textContent.trim();
      photoTitleInput.addEventListener('input', () => {
        photoTitle.textContent = photoTitleInput.value;
      });
      card.appendChild(photoTitleField);

      if (img) {
        const zoom = getImageSetting(img, '--collage-zoom', 1);
        const x = getImageSetting(img, '--collage-x', 50);
        const y = getImageSetting(img, '--collage-y', 50);
        const framing = document.createElement('div');
        framing.className = 'collage-framing-controls';
        framing.innerHTML = `
          <label><span>Zoom <output>${Math.round(zoom * 100)}%</output></span><input type="range" min="1" max="3" step="0.05" value="${zoom}" data-setting="--collage-zoom"></label>
          <label><span>Left / right <output>${Math.round(x)}%</output></span><input type="range" min="0" max="100" step="1" value="${x}" data-setting="--collage-x"></label>
          <label><span>Up / down <output>${Math.round(y)}%</output></span><input type="range" min="0" max="100" step="1" value="${y}" data-setting="--collage-y"></label>
        `;

        framing.querySelectorAll('input').forEach(input => {
          input.addEventListener('input', () => {
            const suffix = input.dataset.setting === '--collage-zoom' ? '' : '%';
            setImageSetting(img, input.dataset.setting, input.value, suffix);
            input.closest('label').querySelector('output').textContent = input.dataset.setting === '--collage-zoom'
              ? `${Math.round(parseFloat(input.value) * 100)}%`
              : `${input.value}%`;
          });
        });
        card.appendChild(framing);
      }

      const dragHandle = card.querySelector('.collage-photo-drag');
      dragHandle.draggable = true;
      dragHandle.addEventListener('dragstart', e => {
        draggedSlot = slot;
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      dragHandle.addEventListener('dragend', () => {
        draggedSlot = null;
        controls.querySelectorAll('.collage-photo-card').forEach(el => el.classList.remove('dragging', 'drag-over'));
      });
      card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', e => {
        e.preventDefault();
        const from = state.slots.indexOf(draggedSlot);
        if (from !== -1) moveSlot(from, index);
      });

      controls.appendChild(card);
    });
  }

  const close = () => modal.remove();
  modal.querySelector('.collage-builder-close').addEventListener('click', close);
  modal.querySelector('.collage-builder-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  applyBtn.addEventListener('click', () => {
    const activeSlots = state.slots.slice(0, state.layout.count);
    if (activeSlots.some(slot => !slot.querySelector('img'))) {
      status.textContent = `Please upload all ${state.layout.count} photos before adding the collage.`;
      return;
    }

    renderFrame();
    const firstPhotoTitle = ensurePhotoTitle(activeSlots[0]).textContent.trim();
    if (state.layout.count === 1) {
      const img = activeSlots[0].querySelector('img');
      img.alt = firstPhotoTitle || 'Hansje Görtz';
      state.item.setAttribute('aria-label', firstPhotoTitle ? `Open photo: ${firstPhotoTitle}` : 'Open Hansje Görtz photo');
    } else {
      state.item.setAttribute('aria-label', 'Open Hansje Görtz photo collage');
    }

    const grid = document.querySelector('.photos-grid');
    const addBtn = grid.querySelector('.editor-add-photo-btn');
    if (existingItem) existingItem.replaceWith(state.item);
    else grid.insertBefore(state.item, addBtn);

    grid.querySelectorAll('.photo-item').forEach((photo, index) => { photo.dataset.index = index; });
    addPhotoItemControls(state.item, grid);
    close();
    showToast(existingItem ? 'Gallery item updated — click Save & Deploy to publish' : 'Gallery item added — click Save & Deploy to publish');
  });

  renderFrame();
  renderControls();
  document.body.appendChild(modal);
  modal.querySelector('.collage-layout-option[aria-pressed="true"]').focus();
}

// ── PHOTO UPLOAD ───────────────────────────────────────────────────────────────
async function uploadPhotoFile(file, previewSrc = '') {
  const dataUrl = previewSrc || await fileToDataUrl(file);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${Date.now()}_${safeName}`;

  const res = await fetchWithTimeout(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/images/${filename}`,
    {
      method: 'PUT',
      cache: 'no-store',
      headers: githubHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: `Add photo: ${filename}`,
        content: base64,
        branch: GITHUB_BRANCH
      })
    }
  );

  if (!res.ok) throw new Error(await readGitHubError(res));
  return `images/${filename}`;
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
    clone.querySelectorAll('.editor-email-editable').forEach(el => el.classList.remove('editor-email-editable'));
    sanitizeEditableContent(clone);

    // 4. Replace local upload previews with their permanent image paths
    clone.querySelectorAll('img[data-upload-src]').forEach(img => {
      const uploadedSrc = img.dataset.uploadSrc;
      if (uploadedSrc) img.setAttribute('src', uploadedSrc);
      img.removeAttribute('data-upload-src');
    });

    // 5. Update photo data-index values
    clone.querySelectorAll('.photo-item').forEach((p, i) => { p.dataset.index = i; });

    // 6. Bump cache-busting version on local assets
    bumpAssetVersions(clone);

    // 7. Serialise to clean HTML string
    const html = '<!DOCTYPE html>\n' + clone.outerHTML;

    // 8. Fetch current file SHA from GitHub
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

    // 9. Commit updated file
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
  clone.querySelectorAll('img[src^="images/"], img[src^="https://hansjegortz.com/images/"]').forEach(el => {
    el.setAttribute('src', el.getAttribute('src').split('?')[0] + `?v=${ts}`);
  });
  clone.querySelectorAll('meta[content^="images/"], meta[content^="https://hansjegortz.com/images/"]').forEach(el => {
    el.setAttribute('content', el.getAttribute('content').split('?')[0] + `?v=${ts}`);
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

  const firstCreditTab = clone.querySelector('.tab-btn');
  clone.querySelectorAll('.tab-btn').forEach(btn => {
    const isFirst = btn === firstCreditTab;
    btn.classList.toggle('tab-btn--active', isFirst);
    btn.setAttribute('aria-selected', isFirst ? 'true' : 'false');
    btn.tabIndex = isFirst ? 0 : -1;
    btn.removeAttribute('title');
    btn.removeAttribute('data-credit-tab-editor-ready');
  });

  const firstPanelId = firstCreditTab && firstCreditTab.getAttribute('aria-controls');
  clone.querySelectorAll('.credits-list').forEach(panel => {
    const isFirst = panel.id === firstPanelId;
    panel.classList.toggle('credits-list--active', isFirst);
    panel.hidden = !isFirst;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
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
