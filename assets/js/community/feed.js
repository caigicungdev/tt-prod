/* Trang cong-dong.html: bảng tin đầy đủ + "Bài của tôi"
   Đường dẫn:  #cua-toi  → tab Bài của tôi
               #bai-<id> → mở thẳng một bài
               #dang-bai → mở khung đăng bài */
import { getApi } from './api.js';
import { h, mountAuth, postCard, openPost, openComposer, demoNotice, signIn, toast } from './ui.js';

const PAGE = 12;
const grid = document.querySelector('[data-grid]');
const moreBtn = document.querySelector('[data-more]');
const tabs = document.querySelectorAll('[data-tab]');
const intro = document.querySelector('[data-tab-intro]');

let api;
let tab = 'all';          // 'all' | 'mine'
let lastCursor = null;
let loading = false;

function setTab(next, { push = true } = {}) {
  tab = next;
  tabs.forEach((t) => {
    const on = t.dataset.tab === tab;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  if (intro) {
    intro.textContent = tab === 'mine'
      ? 'Tất cả bài bạn đã gửi, kể cả bài đang chờ duyệt hoặc bị từ chối.'
      : 'Ảnh, kỷ niệm và cảm nhận do người hâm mộ chia sẻ — đã được admin duyệt.';
  }
  if (push) history.replaceState(null, '', tab === 'mine' ? '#cua-toi' : location.pathname);
  reload();
}

function card(post) {
  return postCard(post, {
    api,
    showStatus: tab === 'mine',
    onOpen: (p) => openPostWithHash(p)
  });
}

async function openPostWithHash(postOrId) {
  const id = typeof postOrId === 'string' ? postOrId : postOrId.id;
  // khi đóng bài, trả lại địa chỉ của tab đang xem
  const restore = () => history.replaceState(null, '', tab === 'mine' ? '#cua-toi' : location.pathname);
  history.replaceState(null, '', `#bai-${id}`);
  const modal = await openPost(api, postOrId, {
    onChange: (p, opts) => { if (opts && opts.deleted) reload(); else refreshCard(p); },
    onClose: restore
  });
  if (!modal) restore();
}

function refreshCard(post) {
  const old = grid.querySelector(`[data-id="${CSS.escape(post.id)}"]`);
  if (old) { const fresh = card(post); fresh.dataset.id = post.id; old.replaceWith(fresh); }
}

async function loadPage(reset) {
  if (loading) return;
  loading = true;
  moreBtn.disabled = true;
  if (reset) {
    lastCursor = null;
    grid.replaceChildren(...Array.from({ length: 6 }, () => h('div', { class: 'pcard pcard--skeleton', 'aria-hidden': 'true' })));
  }
  try {
    const user = api.getUser();
    if (tab === 'mine' && !user) {
      grid.replaceChildren(h('div', { class: 'feed__empty' },
        h('p', {}, 'Đăng nhập để xem các bài bạn đã gửi.'),
        h('button', { type: 'button', class: 'btn btn--accent', onclick: () => signIn(api) }, 'Đăng nhập bằng Google')));
      moreBtn.hidden = true;
      return;
    }
    const posts = await api.listPosts(tab === 'mine'
      ? { status: 'all', authorId: user.id, limit: PAGE, before: lastCursor }
      : { status: 'approved', limit: PAGE, before: lastCursor });
    if (reset) grid.replaceChildren();
    posts.forEach((p) => { const c = card(p); c.dataset.id = p.id; grid.append(c); });
    if (reset && !posts.length) {
      grid.append(h('div', { class: 'feed__empty' },
        h('p', {}, tab === 'mine' ? 'Bạn chưa gửi bài nào.' : 'Chưa có bài viết nào được duyệt.'),
        h('button', { type: 'button', class: 'btn btn--accent', onclick: () => openComposer(api, { onPosted: afterPost }) }, 'Đăng bài ngay')));
    }
    if (posts.length) lastCursor = posts[posts.length - 1].createdAt;
    moreBtn.hidden = posts.length < PAGE;
  } catch (err) {
    if (reset) grid.replaceChildren(h('p', { class: 'feed__empty' }, 'Không tải được bài viết. ' + err.message));
    else toast(err.message, 'error');
  } finally {
    loading = false;
    moreBtn.disabled = false;
  }
}
const reload = () => loadPage(true);
const afterPost = () => setTab('mine');

function handleHash() {
  const hash = location.hash;
  if (hash.startsWith('#bai-')) openPostWithHash(decodeURIComponent(hash.slice(5)));
  else if (hash === '#dang-bai') { history.replaceState(null, '', location.pathname); openComposer(api, { onPosted: afterPost }); }
}

async function init() {
  try { api = await getApi(); }
  catch (err) {
    grid.replaceChildren(h('p', { class: 'feed__empty' }, 'Không kết nối được máy chủ. Vui lòng thử lại sau.'));
    return;
  }
  mountAuth(document.querySelector('[data-auth]'), api);
  const note = demoNotice(api);
  if (note) document.querySelector('[data-note]')?.replaceWith(note);

  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
  moreBtn.addEventListener('click', () => loadPage(false));
  document.querySelectorAll('[data-compose]').forEach((b) =>
    b.addEventListener('click', (e) => { e.preventDefault(); openComposer(api, { onPosted: afterPost }); }));
  api.onAuthChange(reload);
  window.addEventListener('hashchange', () => {
    if (location.hash === '#cua-toi') setTab('mine', { push: false });
    else handleHash();
  });

  setTab(location.hash === '#cua-toi' ? 'mine' : 'all', { push: false });
  handleHash();
}

init();
