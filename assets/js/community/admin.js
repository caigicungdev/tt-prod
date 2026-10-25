/* Trang admin.html: duyệt bài của người hâm mộ */
import { getApi } from './api.js';
import { h, icons, mountAuth, openPost, avatar, relTime, fullTime, toast, signIn, demoNotice } from './ui.js';

const root = document.querySelector('[data-admin]');
const PAGE = 30;
let api;
let tab = 'pending';

const TABS = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Đã từ chối' }
];

function gate() {
  const user = api.getUser();
  if (!user) {
    root.replaceChildren(h('div', { class: 'admin__gate' },
      h('p', {}, 'Đăng nhập bằng tài khoản admin để duyệt bài.'),
      h('button', { type: 'button', class: 'btn btn--accent', onclick: () => signIn(api) }, 'Đăng nhập bằng Google')));
    return false;
  }
  if (!user.isAdmin) {
    root.replaceChildren(h('div', { class: 'admin__gate' },
      h('p', {}, 'Tài khoản ', h('strong', {}, user.name), ' chưa có quyền admin.'),
      h('p', { class: 'admin__hint' }, 'Xem mục "Cấp quyền admin" trong SETUP.md để tự cấp quyền cho tài khoản của bạn.')));
    return false;
  }
  return true;
}

async function render() {
  if (!gate()) return;
  const tabBar = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Trạng thái bài' },
    ...TABS.map((t) => h('button', {
      type: 'button', role: 'tab', class: `tab${t.id === tab ? ' is-active' : ''}`, 'aria-selected': String(t.id === tab),
      onclick: () => { tab = t.id; render(); }
    }, t.label, t.id === 'pending' ? h('span', { class: 'tab__count', 'data-pending': '' }) : null))
  );
  const list = h('div', { class: 'admin__list' }, h('p', { class: 'feed__empty' }, 'Đang tải…'));
  root.replaceChildren(tabBar, list);

  try {
    const [posts, pending] = await Promise.all([api.listPosts({ status: tab, limit: PAGE }), api.countPending()]);
    const badge = root.querySelector('[data-pending]');
    if (badge) badge.textContent = pending ? String(pending) : '';
    list.replaceChildren();
    if (!posts.length) {
      list.append(h('p', { class: 'feed__empty' }, tab === 'pending' ? 'Không có bài nào đang chờ duyệt.' : 'Chưa có bài nào.'));
      return;
    }
    posts.forEach((p) => list.append(row(p)));
  } catch (err) {
    list.replaceChildren(h('p', { class: 'feed__empty' }, 'Không tải được danh sách. ' + err.message));
  }
}

function row(post) {
  const el = h('article', { class: 'arow' });
  const done = (msg) => {
    toast(msg, 'success');
    el.classList.add('is-gone');
    setTimeout(() => { el.remove(); refreshCount(); if (!root.querySelector('.arow')) render(); }, 300);
  };
  const act = async (fn, msg) => {
    el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try { await fn(); done(msg); }
    catch (err) { toast(err.message, 'error'); el.querySelectorAll('button').forEach((b) => { b.disabled = false; }); }
  };

  const reasonBox = h('div', { class: 'arow__reason', hidden: true },
    h('label', { for: `rs-${post.id}` }, 'Lý do từ chối (người đăng sẽ thấy)'),
    h('input', { type: 'text', id: `rs-${post.id}`, maxlength: '300', placeholder: 'VD: Ảnh không rõ nguồn / trùng lặp / không liên quan' }),
    h('div', { class: 'arow__reason-actions' },
      h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => { reasonBox.hidden = true; } }, 'Huỷ'),
      h('button', { type: 'button', class: 'btn btn--danger btn--sm', onclick: () => {
        const reason = reasonBox.querySelector('input').value.trim();
        act(() => api.review(post.id, 'rejected', reason), 'Đã từ chối bài.');
      } }, 'Xác nhận từ chối')
    )
  );

  const actions = h('div', { class: 'arow__actions' },
    post.status !== 'approved' ? h('button', { type: 'button', class: 'btn btn--accent btn--sm', onclick: () => act(() => api.review(post.id, 'approved'), 'Đã duyệt — bài đã hiện công khai.') },
      h('span', { class: 'ico', html: icons.check }), 'Duyệt') : null,
    post.status !== 'rejected' ? h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => { reasonBox.hidden = false; reasonBox.querySelector('input').focus(); } },
      post.status === 'approved' ? 'Gỡ xuống' : 'Từ chối') : null,
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => openPost(api, post, { onChange: (p, o) => { if (o && o.deleted) done('Đã xoá bài.'); } }) }, 'Xem chi tiết'),
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm btn--icon-danger', 'aria-label': 'Xoá vĩnh viễn', onclick: () => {
      if (!confirm('Xoá vĩnh viễn bài này và ảnh của nó?')) return;
      act(() => api.deletePost(post), 'Đã xoá bài.');
    } }, h('span', { class: 'ico', html: icons.trash }))
  );

  el.append(
    post.images.length
      ? h('div', { class: 'arow__thumbs' }, ...post.images.map((im, i) => h('button', {
          type: 'button', class: 'arow__thumb', 'aria-label': `Xem ảnh ${i + 1}`, onclick: () => openPost(api, post)
        }, h('img', { src: im.url, alt: '', loading: 'lazy' }))))
      : null,
    h('div', { class: 'arow__main' },
      h('div', { class: 'arow__meta' },
        avatar(post.authorName, post.authorAvatar, 28),
        h('strong', {}, post.authorName),
        h('time', { datetime: post.createdAt, title: fullTime(post.createdAt) }, relTime(post.createdAt))
      ),
      post.title ? h('h3', { class: 'arow__title' }, post.title) : null,
      post.body ? h('p', { class: 'arow__body' }, post.body) : null,
      h('p', { class: 'arow__source' }, h('span', {}, 'Nguồn: '), post.source || '(không ghi)'),
      post.status === 'rejected' && post.rejectReason ? h('p', { class: 'arow__rejected' }, 'Lý do từ chối: ' + post.rejectReason) : null,
      post.status === 'approved' ? h('p', { class: 'arow__stats' }, `${post.likeCount} tim · ${post.commentCount} bình luận`) : null,
      actions,
      reasonBox
    )
  );
  return el;
}

async function refreshCount() {
  try {
    const n = await api.countPending();
    const badge = root.querySelector('[data-pending]');
    if (badge) badge.textContent = n ? String(n) : '';
  } catch (e) { /* bỏ qua */ }
}

async function init() {
  try { api = await getApi(); }
  catch (err) { root.replaceChildren(h('p', { class: 'feed__empty' }, 'Không kết nối được máy chủ.')); return; }
  mountAuth(document.querySelector('[data-auth]'), api);
  const note = demoNotice(api);
  if (note) document.querySelector('[data-note]')?.replaceWith(note);
  api.onAuthChange(render);
  render();
}

init();
