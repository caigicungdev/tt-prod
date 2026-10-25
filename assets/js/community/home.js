/* Trang chủ: khối "Góc người hâm mộ" — 6 bài mới nhất + nút đăng bài */
import { getApi } from './api.js';
import { h, mountAuth, postCard, openPost, openComposer, demoNotice } from './ui.js';

const section = document.querySelector('[data-community-home]');
const grid = section && section.querySelector('[data-grid]');

async function init() {
  let api;
  try { api = await getApi(); }
  catch (err) {
    if (grid) grid.replaceChildren(h('p', { class: 'feed__empty' }, 'Không kết nối được máy chủ. Vui lòng thử lại sau.'));
    return;
  }

  mountAuth(document.querySelector('[data-auth]'), api);
  if (!section) return;

  const note = demoNotice(api);
  if (note) section.querySelector('[data-note]')?.replaceWith(note);

  async function load() {
    try {
      const posts = await api.listPosts({ limit: 6 });
      if (!posts.length) {
        grid.replaceChildren(h('div', { class: 'feed__empty' },
          h('p', {}, 'Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!'),
          h('button', { type: 'button', class: 'btn btn--accent', onclick: () => openComposer(api, { onPosted: load }) }, 'Đăng bài đầu tiên')));
        return;
      }
      grid.replaceChildren(...posts.map((p) => postCard(p, {
        api,
        onOpen: (post) => openPost(api, post, { onChange: load })
      })));
    } catch (err) {
      grid.replaceChildren(h('p', { class: 'feed__empty' }, 'Không tải được bài viết. ' + err.message));
    }
  }

  document.querySelectorAll('[data-compose]').forEach((btn) =>
    btn.addEventListener('click', (e) => { e.preventDefault(); openComposer(api, { onPosted: load }); }));

  api.onAuthChange(load);
  load();
}

init();
