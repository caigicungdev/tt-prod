/* =====================================================================
   Thành phần giao diện dùng chung cho "Góc người hâm mộ"
   (mọi nội dung người dùng được gán bằng textContent — không dùng innerHTML
    với dữ liệu người dùng, để tránh chèn mã độc)
   ===================================================================== */
import { MAX_IMAGES, MAX_BODY, MAX_TITLE, MAX_SOURCE, MAX_COMMENT } from './api.js';

/* ---------- DOM helper ---------- */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;              // chỉ dùng cho icon tĩnh
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* ---------- Icons (SVG tĩnh) ---------- */
const svg = (d, extra = '') =>
  `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const icons = {
  heart: svg('<path d="M12 20.5s-7.5-4.6-9.3-9.1C1.4 8 3.6 4.5 7.1 4.5c2 0 3.5 1.1 4.9 2.9 1.4-1.8 2.9-2.9 4.9-2.9 3.5 0 5.7 3.5 4.4 6.9-1.8 4.5-9.3 9.1-9.3 9.1z"/>'),
  comment: svg('<path d="M20 14.5a2 2 0 0 1-2 2H8l-4 4v-14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  prev: svg('<path d="M15 5l-7 7 7 7"/>'),
  next: svg('<path d="M9 5l7 7-7 7"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  images: svg('<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/>'),
  share: svg('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  google: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'
};
const icon = (name, cls = 'ico') => h('span', { class: cls, html: icons[name] });

/* ---------- Format ---------- */
export function relTime(iso) {
  const t = new Date(iso).getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export const fullTime = (iso) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

export function avatar(name, url, size = 32) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const wrap = h('span', { class: 'avatar', style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px`, 'aria-hidden': 'true' }, initial);
  if (url) {
    const img = h('img', { src: url, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' });
    img.addEventListener('error', () => img.remove());
    wrap.append(img);
  }
  return wrap;
}

/* ---------- Toast ---------- */
let toastWrap;
export function toast(message, type = 'info') {
  if (!toastWrap) {
    toastWrap = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastWrap);
  }
  const t = h('div', { class: `toast toast--${type}` }, message);
  toastWrap.append(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, type === 'error' ? 6000 : 3800);
}

/* ---------- Modal ---------- */
export function openModal({ content, label, className = '', onClose } = {}) {
  const prevFocus = document.activeElement;
  const closeBtn = h('button', { type: 'button', class: 'modal__close', 'aria-label': 'Đóng' }, icon('close'));
  const dialog = h('div', { class: `modal__dialog ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label || '' }, closeBtn, content);
  const overlay = h('div', { class: 'modal' }, dialog);
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.remove();
      if (!document.querySelector('.modal')) document.body.classList.remove('modal-open');
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }, 250);
    onClose && onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') {     // giữ focus trong hộp thoại
      const f = [...dialog.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    (dialog.querySelector('[autofocus]') || closeBtn).focus({ preventScroll: true });
  });
  return { el: dialog, close };
}

/* ---------- Demo banner ---------- */
export function demoNotice(api) {
  if (api.mode !== 'demo') return null;
  return h('p', { class: 'demo-note' },
    h('strong', {}, 'Chế độ xem thử'), ' — dữ liệu mẫu chỉ lưu trong trình duyệt của bạn. ',
    'Điền thông tin Supabase vào ', h('code', {}, 'assets/js/config.js'), ' để chạy thật (xem SETUP.md).');
}

/* ---------- Auth widget (trên thanh menu) ---------- */
export function mountAuth(slot, api) {
  if (!slot) return;
  // đóng menu tài khoản khi bấm ra ngoài (gắn một lần)
  document.addEventListener('click', (e) => {
    if (slot.contains(e.target)) return;
    const m = slot.querySelector('.auth-menu');
    const b = slot.querySelector('.auth-user');
    if (m) m.hidden = true;
    if (b) b.setAttribute('aria-expanded', 'false');
  });
  const render = () => {
    const user = api.getUser();
    slot.textContent = '';
    if (!user) {
      slot.append(h('button', {
        type: 'button', class: 'auth-btn', 'aria-label': 'Đăng nhập bằng Google', onclick: () => signIn(api)
      }, h('span', { class: 'auth-btn__g', html: icons.google }), h('span', { class: 'auth-btn__text' }, 'Đăng nhập')));
      return;
    }
    const menu = h('div', { class: 'auth-menu', hidden: true, role: 'menu' },
      h('div', { class: 'auth-menu__who' }, h('strong', {}, user.name), api.mode === 'demo' ? h('span', {}, 'Tài khoản xem thử') : null),
      h('a', { href: 'cong-dong.html#cua-toi', role: 'menuitem' }, 'Bài của tôi'),
      user.isAdmin ? h('a', { href: 'admin.html', role: 'menuitem' }, 'Duyệt bài (admin)') : null,
      h('button', { type: 'button', role: 'menuitem', onclick: async () => { await api.signOut(); toast('Đã đăng xuất.'); } }, 'Đăng xuất')
    );
    const btn = h('button', {
      type: 'button', class: 'auth-user', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': `Tài khoản: ${user.name}`,
      onclick: (e) => {
        e.stopPropagation();
        const open = menu.hidden;
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      }
    }, avatar(user.name, user.avatar, 36));
    slot.append(btn, menu);
  };
  render();
  api.onAuthChange(render);
}

export async function signIn(api) {
  try {
    await api.signIn();
    if (api.mode === 'demo') toast('Đã đăng nhập bằng tài khoản xem thử.', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

/* ---------- Post card ---------- */
const STATUS_LABEL = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Bị từ chối' };

export function postCard(post, { onOpen, showStatus = false, api } = {}) {
  const cover = post.images[0];
  const media = cover
    ? h('div', { class: 'pcard__media' },
        h('img', { src: cover.url, alt: post.title || 'Ảnh do người hâm mộ đăng', loading: 'lazy' }),
        post.images.length > 1 ? h('span', { class: 'pcard__count' }, icon('images'), String(post.images.length)) : null)
    : h('div', { class: 'pcard__quote' }, h('p', {}, post.body || post.title));

  const likeBtn = h('button', {
    type: 'button', class: `pcard__stat pcard__like${post.likedByMe ? ' is-on' : ''}`,
    'aria-pressed': String(post.likedByMe), 'aria-label': `Thả tim (${post.likeCount})`,
    disabled: post.status !== 'approved' || null
  }, icon('heart'), h('span', {}, String(post.likeCount)));

  if (api && post.status === 'approved') {
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!api.getUser()) { toast('Đăng nhập để thả tim nhé!'); signIn(api); return; }
      const on = !post.likedByMe;
      post.likedByMe = on;
      post.likeCount += on ? 1 : -1;
      likeBtn.classList.toggle('is-on', on);
      likeBtn.setAttribute('aria-pressed', String(on));
      likeBtn.querySelector('span:last-child').textContent = String(post.likeCount);
      likeBtn.classList.add('is-pop');
      setTimeout(() => likeBtn.classList.remove('is-pop'), 400);
      try { await api.setLike(post.id, on); }
      catch (err) {
        post.likedByMe = !on; post.likeCount += on ? -1 : 1;
        likeBtn.classList.toggle('is-on', !on);
        likeBtn.querySelector('span:last-child').textContent = String(post.likeCount);
        toast(err.message, 'error');
      }
    });
  }

  const card = h('article', { class: `pcard${cover ? '' : ' pcard--text'}` },
    h('button', { type: 'button', class: 'pcard__hit', 'aria-label': `Mở bài: ${post.title || (post.body || '').slice(0, 60)}`, onclick: () => onOpen && onOpen(post) }),
    media,
    h('div', { class: 'pcard__body' },
      showStatus ? h('span', { class: `badge badge--${post.status}` }, STATUS_LABEL[post.status]) : null,
      post.title ? h('h3', { class: 'pcard__title' }, post.title) : null,
      cover && post.body ? h('p', { class: 'pcard__excerpt' }, post.body) : null,
      showStatus && post.status === 'rejected' && post.rejectReason ? h('p', { class: 'pcard__reason' }, `Lý do: ${post.rejectReason}`) : null,
      h('div', { class: 'pcard__foot' },
        h('span', { class: 'pcard__author' },
          avatar(post.authorName, post.authorAvatar, 28),
          h('span', { class: 'pcard__who' },
            h('span', { class: 'pcard__name' }, post.authorName),
            h('time', { class: 'pcard__time', datetime: post.createdAt, title: fullTime(post.createdAt) }, relTime(post.createdAt)))
        ),
        h('span', { class: 'pcard__stats' },
          likeBtn,
          h('span', { class: 'pcard__stat', 'aria-label': `${post.commentCount} bình luận` }, icon('comment'), h('span', {}, String(post.commentCount)))
        )
      )
    )
  );
  return card;
}

/* ---------- Post detail (gallery + comments) ---------- */
export async function openPost(api, postOrId, { onChange, onClose } = {}) {
  let post = typeof postOrId === 'string' ? await api.getPost(postOrId) : postOrId;
  if (!post) { toast('Không tìm thấy bài viết (có thể đã bị xoá hoặc chưa được duyệt).', 'error'); return null; }
  const user = api.getUser();
  const isApproved = post.status === 'approved';

  /* gallery */
  let idx = 0;
  let gallery = null;
  if (post.images.length) {
    const mainImg = h('img', { class: 'gallery__img', alt: '' });
    const counter = h('span', { class: 'gallery__counter' });
    const thumbs = h('div', { class: 'gallery__thumbs' });
    const show = (i) => {
      idx = (i + post.images.length) % post.images.length;
      mainImg.src = post.images[idx].url;
      mainImg.alt = `Ảnh ${idx + 1}/${post.images.length}${post.title ? ' — ' + post.title : ''}`;
      counter.textContent = `${idx + 1} / ${post.images.length}`;
      [...thumbs.children].forEach((t, j) => t.classList.toggle('is-active', j === idx));
    };
    post.images.forEach((im, j) => thumbs.append(
      h('button', { type: 'button', class: 'gallery__thumb', 'aria-label': `Xem ảnh ${j + 1}`, onclick: () => show(j) }, h('img', { src: im.url, alt: '', loading: 'lazy' }))
    ));
    const multi = post.images.length > 1;
    gallery = h('div', { class: 'post__gallery gallery' },
      h('div', { class: 'gallery__stage' },
        mainImg,
        multi ? h('button', { type: 'button', class: 'gallery__nav gallery__nav--prev', 'aria-label': 'Ảnh trước', onclick: () => show(idx - 1) }, icon('prev')) : null,
        multi ? h('button', { type: 'button', class: 'gallery__nav gallery__nav--next', 'aria-label': 'Ảnh sau', onclick: () => show(idx + 1) }, icon('next')) : null,
        multi ? counter : null
      ),
      multi ? thumbs : null
    );
    gallery.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    // vuốt trên điện thoại
    let sx = null;
    gallery.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    gallery.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40 && multi) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
    show(0);
  }

  /* like + share */
  const likeCount = h('span', {}, String(post.likeCount));
  const likeBtn = h('button', {
    type: 'button', class: `btn-pill btn-like${post.likedByMe ? ' is-on' : ''}`, 'aria-pressed': String(post.likedByMe),
    onclick: async () => {
      if (!api.getUser()) { toast('Đăng nhập để thả tim nhé!'); signIn(api); return; }
      const on = !post.likedByMe;
      post.likedByMe = on; post.likeCount += on ? 1 : -1;
      likeBtn.classList.toggle('is-on', on); likeBtn.setAttribute('aria-pressed', String(on));
      likeCount.textContent = String(post.likeCount);
      likeBtn.classList.add('is-pop'); setTimeout(() => likeBtn.classList.remove('is-pop'), 400);
      try { await api.setLike(post.id, on); onChange && onChange(post); }
      catch (err) { toast(err.message, 'error'); }
    }
  }, icon('heart'), likeCount, h('span', { class: 'sr-only' }, ' lượt thả tim'));
  const shareBtn = h('button', {
    type: 'button', class: 'btn-pill', onclick: async () => {
      const url = new URL(`cong-dong.html#bai-${post.id}`, location.href).href;
      try { await navigator.clipboard.writeText(url); toast('Đã sao chép link bài viết.', 'success'); }
      catch (e) { prompt('Sao chép link bài viết:', url); }
    }
  }, icon('share'), 'Chia sẻ');

  /* comments */
  const list = h('ol', { class: 'comments__list' });
  const countEl = h('span', {}, String(post.commentCount));
  async function loadComments() {
    list.textContent = '';
    list.append(h('li', { class: 'comments__empty' }, 'Đang tải bình luận…'));
    try {
      const items = await api.listComments(post.id);
      list.textContent = '';
      if (!items.length) list.append(h('li', { class: 'comments__empty' }, 'Chưa có bình luận nào. Hãy là người đầu tiên!'));
      const me = api.getUser();
      items.forEach((c) => {
        const canDelete = me && (me.id === c.authorId || me.isAdmin);
        list.append(h('li', { class: 'comment' },
          avatar(c.authorName, c.authorAvatar, 30),
          h('div', { class: 'comment__main' },
            h('div', { class: 'comment__head' },
              h('strong', {}, c.authorName),
              h('time', { datetime: c.createdAt, title: fullTime(c.createdAt) }, relTime(c.createdAt)),
              canDelete ? h('button', {
                type: 'button', class: 'comment__del', 'aria-label': 'Xoá bình luận',
                onclick: async () => {
                  if (!confirm('Xoá bình luận này?')) return;
                  try { await api.deleteComment(c.id); post.commentCount--; countEl.textContent = String(post.commentCount); onChange && onChange(post); loadComments(); }
                  catch (err) { toast(err.message, 'error'); }
                }
              }, icon('trash')) : null
            ),
            h('p', { class: 'comment__body' }, c.body)
          )
        ));
      });
    } catch (err) {
      list.textContent = '';
      list.append(h('li', { class: 'comments__empty' }, 'Không tải được bình luận.'));
    }
  }

  let form;
  if (user) {
    const ta = h('textarea', { name: 'body', rows: '2', maxlength: String(MAX_COMMENT), placeholder: 'Viết bình luận…', required: true, 'aria-label': 'Bình luận' });
    const send = h('button', { type: 'submit', class: 'btn btn--accent btn--sm' }, 'Gửi');
    form = h('form', {
      class: 'comments__form',
      onsubmit: async (e) => {
        e.preventDefault();
        const body = ta.value.trim();
        if (!body) return;
        send.disabled = true;
        try {
          await api.addComment(post.id, body);
          ta.value = '';
          post.commentCount++; countEl.textContent = String(post.commentCount);
          onChange && onChange(post);
          await loadComments();
          list.lastElementChild && list.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } catch (err) { toast(err.message, 'error'); }
        send.disabled = false;
      }
    }, avatar(user.name, user.avatar, 30), ta, send);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit(); });
  } else {
    form = h('button', { type: 'button', class: 'btn btn--ghost comments__login', onclick: () => signIn(api) },
      h('span', { class: 'auth-btn__g', html: icons.google }), 'Đăng nhập để bình luận');
  }

  const statusNote = !isApproved
    ? h('p', { class: `post__status badge badge--${post.status}` },
        post.status === 'pending' ? 'Bài đang chờ admin duyệt — chỉ bạn và admin nhìn thấy.'
          : `Bài bị từ chối${post.rejectReason ? ': ' + post.rejectReason : '.'}`)
    : null;

  const me = api.getUser();
  const canDeletePost = me && (me.isAdmin || (me.id === post.authorId && post.status !== 'approved'));
  let modal;
  const delBtn = canDeletePost ? h('button', {
    type: 'button', class: 'btn-pill btn-pill--danger', onclick: async () => {
      if (!confirm('Xoá bài viết này? Không thể hoàn tác.')) return;
      try { await api.deletePost(post); toast('Đã xoá bài.', 'success'); onChange && onChange(post, { deleted: true }); modal.close(); }
      catch (err) { toast(err.message, 'error'); }
    }
  }, icon('trash'), 'Xoá') : null;

  const content = h('div', { class: `post${gallery ? '' : ' post--text'}` },
    gallery,
    h('div', { class: 'post__side' },
      h('header', { class: 'post__head' },
        avatar(post.authorName, post.authorAvatar, 40),
        h('div', {},
          h('strong', { class: 'post__author' }, post.authorName),
          h('time', { class: 'post__time', datetime: post.createdAt, title: fullTime(post.createdAt) }, relTime(post.createdAt))
        )
      ),
      statusNote,
      h('div', { class: 'post__content' },
        post.title ? h('h2', { class: 'post__title' }, post.title) : null,
        post.body ? h('p', { class: 'post__body' }, post.body) : null,
        post.source ? h('p', { class: 'post__source' }, h('span', {}, 'Nguồn: '), post.source) : null
      ),
      h('div', { class: 'post__actions' }, isApproved ? likeBtn : null, isApproved ? shareBtn : null, delBtn),
      isApproved ? h('section', { class: 'comments', 'aria-label': 'Bình luận' },
        h('h3', { class: 'comments__title' }, 'Bình luận ', h('span', { class: 'comments__count' }, '(', countEl, ')')),
        list,
        form
      ) : null
    )
  );

  modal = openModal({ content, label: post.title || 'Bài viết', className: 'modal__dialog--post', onClose });
  if (isApproved) loadComments();
  if (gallery) gallery.setAttribute('tabindex', '0');
  return modal;
}

/* ---------- Nén ảnh trong trình duyệt (xoá luôn thông tin GPS/EXIF) ---------- */
const MAX_SIDE = 2000;
const supportsWebp = (() => {
  try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; }
})();

async function decode(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* thử cách khác */ }
  }
  return await new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

function draw(src, maxSide) {
  const w0 = src.width, h0 = src.height;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.round(w0 * scale), hgt = Math.round(h0 * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = hgt;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, hgt);          // nền cho ảnh PNG trong suốt khi xuất JPEG
  ctx.drawImage(src, 0, 0, w, hgt);
  return c;
}
const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

export async function processImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" không phải là ảnh.`);
  if (file.size > 25 * 1024 * 1024) throw new Error(`"${file.name}" quá lớn (tối đa 25 MB).`);
  let src;
  try { src = await decode(file); }
  catch (e) { throw new Error(`Không đọc được "${file.name}". Hãy thử ảnh JPG hoặc PNG.`); }
  const type = supportsWebp ? 'image/webp' : 'image/jpeg';
  const ext = supportsWebp ? 'webp' : 'jpg';
  const canvas = draw(src, MAX_SIDE);
  const blob = await toBlob(canvas, type, 0.85);
  const previewBlob = await toBlob(draw(src, 900), 'image/jpeg', 0.75);
  if (src.close) src.close();
  if (!blob) throw new Error(`Không xử lý được "${file.name}".`);
  return { blob, previewBlob, width: canvas.width, height: canvas.height, ext, previewUrl: URL.createObjectURL(previewBlob) };
}

/* ---------- Composer (đăng bài) ---------- */
export function openComposer(api, { onPosted } = {}) {
  const user = api.getUser();
  if (!user) {
    const content = h('div', { class: 'composer composer--login' },
      h('span', { class: 'eyebrow' }, 'Góc người hâm mộ'),
      h('h2', { class: 'composer__title' }, 'Đăng nhập để đăng bài'),
      h('p', {}, 'Dùng tài khoản Google để chia sẻ ảnh, kỷ niệm và cảm nhận về Trấn Thành. Bài viết sẽ hiện sau khi admin duyệt.'),
      h('button', { type: 'button', class: 'btn btn--accent btn--lg', autofocus: true, onclick: async () => { modal.close(); await signIn(api); if (api.getUser()) openComposer(api, { onPosted }); } },
        h('span', { class: 'auth-btn__g', html: icons.google }), 'Đăng nhập bằng Google')
    );
    const modal = openModal({ content, label: 'Đăng nhập để đăng bài', className: 'modal__dialog--narrow' });
    return modal;
  }

  const images = [];   // { file, processed?, el }
  const errorBox = h('p', { class: 'composer__error', role: 'alert', hidden: true });
  const showError = (msg) => { errorBox.textContent = msg; errorBox.hidden = !msg; };

  const title = h('input', { type: 'text', id: 'cp-title', maxlength: String(MAX_TITLE), placeholder: 'VD: Gặp anh ở buổi công chiếu “Mai”' });
  const body = h('textarea', { id: 'cp-body', rows: '5', maxlength: String(MAX_BODY), placeholder: 'Kể lại khoảnh khắc, cảm nhận, hoặc mô tả bức ảnh…', required: true, autofocus: true });
  const bodyCount = h('span', { class: 'field__count' }, `0/${MAX_BODY}`);
  body.addEventListener('input', () => { bodyCount.textContent = `${body.value.length}/${MAX_BODY}`; });
  const source = h('input', { type: 'text', id: 'cp-source', maxlength: String(MAX_SOURCE), placeholder: 'Ảnh tự chụp / tên fanpage / link bài báo…' });
  const agree = h('input', { type: 'checkbox', id: 'cp-agree', required: true });

  const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', id: 'cp-files' });
  const previews = h('ul', { class: 'dropzone__previews' });
  const dzHint = h('span', { class: 'dropzone__hint' }, icon('image'), h('span', {}, h('strong', {}, 'Chọn ảnh'), ' hoặc kéo thả vào đây'), h('small', {}, `Tối đa ${MAX_IMAGES} ảnh · JPG, PNG, WEBP`));
  const dropzone = h('label', { class: 'dropzone', for: 'cp-files' }, dzHint);

  function refreshPreviews() {
    previews.textContent = '';
    images.forEach((it, i) => {
      const li = h('li', { class: `dz-item${it.processed ? '' : ' is-loading'}` },
        it.processed ? h('img', { src: it.processed.previewUrl, alt: `Ảnh ${i + 1}` }) : h('span', { class: 'dz-item__spin', 'aria-label': 'Đang xử lý' }),
        h('button', { type: 'button', class: 'dz-item__del', 'aria-label': `Bỏ ảnh ${i + 1}`, onclick: () => {
          if (it.processed) URL.revokeObjectURL(it.processed.previewUrl);
          images.splice(i, 1); refreshPreviews();
        } }, icon('close'))
      );
      previews.append(li);
    });
    dropzone.classList.toggle('has-items', images.length > 0);
    dropzone.classList.toggle('is-full', images.length >= MAX_IMAGES);
  }

  async function addFiles(fileList) {
    showError('');
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    const room = MAX_IMAGES - images.length;
    if (files.length > room) showError(`Chỉ được tối đa ${MAX_IMAGES} ảnh mỗi bài.`);
    for (const file of files.slice(0, Math.max(0, room))) {
      const it = { file, processed: null };
      images.push(it);
      refreshPreviews();
      try { it.processed = await processImage(file); }
      catch (err) { images.splice(images.indexOf(it), 1); showError(err.message); }
      refreshPreviews();
    }
  }
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('is-drag'); }));
  dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

  const submit = h('button', { type: 'submit', class: 'btn btn--accent btn--lg' }, 'Gửi bài để duyệt');

  const form = h('form', {
    class: 'composer', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      showError('');
      if (!body.value.trim()) { showError('Hãy viết vài dòng nội dung hoặc mô tả ảnh.'); body.focus(); return; }
      if (images.some((i) => !i.processed)) { showError('Ảnh đang được xử lý, vui lòng đợi giây lát.'); return; }
      if (images.length && !source.value.trim()) { showError('Vui lòng ghi nguồn ảnh (VD: "Ảnh tự chụp").'); source.focus(); return; }
      if (!agree.checked) { showError('Bạn cần đồng ý với quy định đăng bài.'); agree.focus(); return; }
      submit.disabled = true;
      form.classList.add('is-busy');
      try {
        await api.createPost(
          { title: title.value.trim(), body: body.value.trim(), source: source.value.trim(), images: images.map((i) => i.processed) },
          (n, total) => { submit.textContent = `Đang tải ảnh ${n}/${total}…`; }
        );
        images.forEach((i) => i.processed && URL.revokeObjectURL(i.processed.previewUrl));
        modal.close();
        toast('Đã gửi bài! Bài sẽ hiện công khai sau khi admin duyệt.', 'success');
        onPosted && onPosted();
      } catch (err) {
        showError(err.message);
        submit.disabled = false;
        submit.textContent = 'Gửi bài để duyệt';
        form.classList.remove('is-busy');
      }
    }
  },
    h('div', { class: 'composer__head' },
      h('span', { class: 'eyebrow' }, 'Góc người hâm mộ'),
      h('h2', { class: 'composer__title' }, 'Đăng bài mới'),
      h('p', { class: 'composer__who' }, avatar(user.name, user.avatar, 28), h('span', {}, 'Đăng với tên ', h('strong', {}, user.name)))
    ),
    h('div', { class: 'field' }, h('label', { for: 'cp-title' }, 'Tiêu đề ', h('small', {}, '(không bắt buộc)')), title),
    h('div', { class: 'field' }, h('label', { for: 'cp-body' }, 'Nội dung'), body, bodyCount),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Ảnh'), fileInput, dropzone, previews),
    h('div', { class: 'field' }, h('label', { for: 'cp-source' }, 'Nguồn ảnh / tư liệu'), source),
    h('div', { class: 'composer__rules' },
      agree,
      h('label', { for: 'cp-agree' },
        'Tôi xác nhận ảnh do tôi chụp hoặc được phép chia sẻ, đã ghi nguồn; không đăng thông tin đời tư, nội dung xúc phạm hay sai sự thật. ',
        'Tên và ảnh đại diện Google của tôi sẽ hiển thị cùng bài viết.')
    ),
    errorBox,
    h('div', { class: 'composer__actions' }, h('span', { class: 'composer__note' }, 'Bài sẽ được admin duyệt trước khi hiện công khai.'), submit)
  );

  const modal = openModal({
    content: form, label: 'Đăng bài mới', className: 'modal__dialog--composer',
    onClose: () => images.forEach((i) => i.processed && URL.revokeObjectURL(i.processed.previewUrl))
  });
  return modal;
}
