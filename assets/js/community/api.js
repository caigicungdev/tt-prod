/* =====================================================================
   Lớp dữ liệu cho "Góc người hâm mộ"
   Hai bản cài đặt cùng một giao diện:
     • SupabaseApi — dữ liệu thật (khi đã điền config.js)
     • DemoApi     — dữ liệu mẫu lưu trong trình duyệt (khi config.js để trống)

   Dạng một bài viết trả về (Post):
   { id, authorId, authorName, authorAvatar, title, body, source,
     status: 'pending'|'approved'|'rejected', rejectReason, createdAt,
     likeCount, commentCount, likedByMe, images: [{ url, width, height }] }
   ===================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const BUCKET = 'post-images';
export const MAX_IMAGES = 6;
export const MAX_BODY = 3000;
export const MAX_TITLE = 120;
export const MAX_SOURCE = 300;
export const MAX_COMMENT = 1000;

let apiPromise = null;

/** Trả về (và nhớ) đối tượng api dùng chung cho cả trang */
export function getApi() {
  if (!apiPromise) {
    apiPromise = (SUPABASE_URL && SUPABASE_ANON_KEY)
      ? createSupabaseApi().catch((err) => {
          console.error('[Góc người hâm mộ] Không kết nối được Supabase:', err);
          throw err;
        })
      : Promise.resolve(createDemoApi());
  }
  return apiPromise;
}

/* ---------------------------------------------------------------------
   Supabase
   --------------------------------------------------------------------- */
async function createSupabaseApi() {
  const { createClient } = await import(SUPABASE_CDN);
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
  });

  let user = null;            // { id, name, avatar, isAdmin }
  const listeners = new Set();

  async function loadUser(session) {
    if (!session) { user = null; return; }
    const { data } = await sb.from('profiles')
      .select('id, display_name, avatar_url, is_admin')
      .eq('id', session.user.id)
      .maybeSingle();
    const meta = session.user.user_metadata || {};
    user = {
      id: session.user.id,
      name: data?.display_name || meta.full_name || meta.name || 'Người hâm mộ',
      avatar: data?.avatar_url || meta.avatar_url || null,
      isAdmin: !!data?.is_admin
    };
  }

  const { data: { session } } = await sb.auth.getSession();
  await loadUser(session);

  // khôi phục phần "#..." (VD #cua-toi, #dang-bai) đã nhớ trước khi chuyển sang Google
  try {
    const back = sessionStorage.getItem('tt-return-hash');
    if (back) {
      sessionStorage.removeItem('tt-return-hash');
      if (session && !location.hash) history.replaceState(null, '', location.pathname + back);
    }
  } catch (e) { /* bỏ qua */ }

  sb.auth.onAuthStateChange((event, s) => {
    if (event === 'INITIAL_SESSION') return;
    // chạy ngoài callback để tránh khoá phiên của supabase-js
    setTimeout(async () => {
      await loadUser(s);
      listeners.forEach((fn) => fn(user));
    }, 0);
  });

  const imageUrl = (path) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const toPost = (r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatar: r.author_avatar,
    title: r.title || '',
    body: r.body || '',
    source: r.source || '',
    status: r.status,
    rejectReason: r.reject_reason || '',
    createdAt: r.created_at,
    likeCount: r.like_count || 0,
    commentCount: r.comment_count || 0,
    likedByMe: !!r.liked_by_me,
    images: (r.images || []).map((i) => ({ url: imageUrl(i.path), path: i.path, width: i.width, height: i.height }))
  });

  const must = ({ data, error }) => { if (error) throw friendlyError(error); return data; };

  return {
    mode: 'supabase',
    getUser: () => user,
    onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    async signIn() {
      // Quay về đúng trang đang xem. Không gửi kèm phần "#..." vì Supabase so khớp
      // đường dẫn với danh sách Redirect URLs; phần # được nhớ tạm rồi khôi phục sau khi đăng nhập.
      try { if (location.hash) sessionStorage.setItem('tt-return-hash', location.hash); } catch (e) {}
      const redirectTo = location.origin + location.pathname;
      must(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
    },
    async signOut() { await sb.auth.signOut(); },

    async listPosts({ status = 'approved', authorId = null, limit = 12, before = null } = {}) {
      let q = sb.from('post_feed').select('*').order('created_at', { ascending: false }).limit(limit);
      if (status !== 'all') q = q.eq('status', status);
      if (authorId) q = q.eq('author_id', authorId);
      if (before) q = q.lt('created_at', before);
      return must(await q).map(toPost);
    },

    async getPost(id) {
      const row = must(await sb.from('post_feed').select('*').eq('id', id).maybeSingle());
      return row ? toPost(row) : null;
    },

    async countPending() {
      const { count, error } = await sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if (error) throw friendlyError(error);
      return count || 0;
    },

    /** images: [{ blob, width, height, ext }] — đã được nén sẵn ở trình duyệt */
    async createPost({ title, body, source, images = [] }, onProgress = () => {}) {
      if (!user) throw new Error('Bạn cần đăng nhập để đăng bài.');
      const post = must(await sb.from('posts')
        .insert({ author_id: user.id, title: title || null, body, source: source || null })
        .select('id').single());
      const uploaded = [];
      try {
        for (let i = 0; i < images.length; i++) {
          onProgress(i + 1, images.length);
          const img = images[i];
          const path = `${user.id}/${post.id}/${i + 1}-${Date.now().toString(36)}.${img.ext}`;
          must(await sb.storage.from(BUCKET).upload(path, img.blob, { contentType: img.blob.type, upsert: false }));
          uploaded.push(path);
          must(await sb.from('post_images').insert({ post_id: post.id, path, width: img.width, height: img.height, position: i }));
        }
      } catch (err) {
        // dọn dẹp nếu tải ảnh lỗi giữa chừng
        if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded);
        await sb.from('posts').delete().eq('id', post.id);
        throw err;
      }
      return post.id;
    },

    async deletePost(post) {
      const paths = (post.images || []).map((i) => i.path).filter(Boolean);
      must(await sb.from('posts').delete().eq('id', post.id));
      if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    },

    async setLike(postId, like) {
      if (!user) throw new Error('Bạn cần đăng nhập để thả tim.');
      if (like) {
        const { error } = await sb.from('likes').insert({ post_id: postId, user_id: user.id });
        if (error && error.code !== '23505') throw friendlyError(error);   // 23505 = đã thả tim rồi
      } else {
        must(await sb.from('likes').delete().eq('post_id', postId).eq('user_id', user.id));
      }
    },

    async listComments(postId) {
      const rows = must(await sb.from('comment_feed').select('*').eq('post_id', postId).order('created_at', { ascending: true }));
      return rows.map((c) => ({
        id: c.id, postId: c.post_id, authorId: c.author_id, authorName: c.author_name,
        authorAvatar: c.author_avatar, body: c.body, createdAt: c.created_at
      }));
    },

    async addComment(postId, body) {
      if (!user) throw new Error('Bạn cần đăng nhập để bình luận.');
      must(await sb.from('comments').insert({ post_id: postId, author_id: user.id, body }));
    },

    async deleteComment(id) { must(await sb.from('comments').delete().eq('id', id)); },

    async review(postId, status, reason = '') {
      must(await sb.from('posts')
        .update({ status, reject_reason: status === 'rejected' ? (reason || null) : null })
        .eq('id', postId));
    }
  };
}

function friendlyError(error) {
  const msg = error?.message || String(error);
  if (/row-level security/i.test(msg)) {
    return new Error('Bạn không có quyền thực hiện thao tác này (hoặc đã có quá 5 bài đang chờ duyệt).');
  }
  if (/Payload too large|exceeded the maximum/i.test(msg)) return new Error('Ảnh quá lớn (tối đa 5 MB mỗi ảnh).');
  if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('Mất kết nối mạng. Vui lòng thử lại.');
  return new Error(msg);
}

/* ---------------------------------------------------------------------
   Demo — dữ liệu mẫu trong localStorage (chỉ để xem thử giao diện)
   --------------------------------------------------------------------- */
const DEMO_KEY = 'tt-demo-v1';
const DEMO_ME = { id: 'demo-me', name: 'Bạn (demo)', avatar: null, isAdmin: true };

function demoSeed() {
  const now = Date.now();
  const h = 3600e3;
  const people = {
    'demo-1': { name: 'Người hâm mộ A (mẫu)', avatar: null },
    'demo-2': { name: 'Người hâm mộ B (mẫu)', avatar: null },
    'demo-3': { name: 'Người hâm mộ C (mẫu)', avatar: null }
  };
  return {
    people,
    session: null,
    posts: [
      {
        id: 'p1', authorId: 'demo-1', title: '[Bài mẫu] Khoảnh khắc nhận giải tại DANAFF',
        body: 'Đây là bài viết mẫu để xem thử giao diện. Khi kết nối Supabase, bài thật của người hâm mộ sẽ hiện ở đây.',
        source: 'Ảnh minh hoạ có sẵn trên trang', status: 'approved', rejectReason: '',
        createdAt: new Date(now - 2 * h).toISOString(),
        images: [{ url: 'assets/images/slide-danaff.webp', width: 958, height: 576 }, { url: 'assets/images/slide-award.jpg', width: 900, height: 599 }]
      },
      {
        id: 'p2', authorId: 'demo-2', title: '[Bài mẫu] Bộ sưu tập poster phim Tết',
        body: 'Bài mẫu có nhiều ảnh — bấm vào để xem dạng thư viện, thả tim và bình luận.',
        source: 'Poster chính thức của nhà sản xuất', status: 'approved', rejectReason: '',
        createdAt: new Date(now - 26 * h).toISOString(),
        images: ['bo-gia', 'nha-ba-nu', 'mai', 'bo-tu-bao-thu', 'tho-oi'].map((n) => ({ url: `assets/images/posters/${n}.jpg`, width: 640, height: 960 }))
      },
      {
        id: 'p3', authorId: 'demo-3', title: '',
        body: '[Bài mẫu] Bài viết chỉ có chữ cũng hiển thị đẹp — dùng cho cảm nhận, kỷ niệm khi gặp anh ở sự kiện, hay review phim.',
        source: '', status: 'approved', rejectReason: '',
        createdAt: new Date(now - 72 * h).toISOString(), images: []
      },
      {
        id: 'p4', authorId: 'demo-1', title: '[Bài mẫu] Bài đang chờ duyệt',
        body: 'Bài này chưa hiện công khai. Vào trang Duyệt bài (admin) để duyệt hoặc từ chối.',
        source: '', status: 'pending', rejectReason: '',
        createdAt: new Date(now - 0.5 * h).toISOString(),
        images: [{ url: 'assets/images/portrait.png', width: 476, height: 644 }]
      }
    ],
    likes: [{ postId: 'p1', userId: 'demo-2' }, { postId: 'p1', userId: 'demo-3' }, { postId: 'p2', userId: 'demo-1' }],
    comments: [
      { id: 'c1', postId: 'p1', authorId: 'demo-2', body: 'Bình luận mẫu — đẹp quá!', createdAt: new Date(now - 1.5 * h).toISOString() }
    ]
  };
}

function createDemoApi() {
  let db;
  try { db = JSON.parse(localStorage.getItem(DEMO_KEY)) || demoSeed(); } catch (e) { db = demoSeed(); }
  const save = () => {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); }
    catch (e) { console.warn('[demo] Bộ nhớ trình duyệt đầy, dữ liệu mẫu sẽ không được lưu.'); }
  };
  const listeners = new Set();
  const me = () => (db.session ? DEMO_ME : null);
  const person = (id) => (id === DEMO_ME.id ? DEMO_ME : db.people[id] || { name: 'Người hâm mộ', avatar: null });
  const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const canSee = (p) => p.status === 'approved' || (me() && (p.authorId === me().id || me().isAdmin));

  const toPost = (p) => ({
    ...p,
    authorName: person(p.authorId).name,
    authorAvatar: person(p.authorId).avatar,
    likeCount: db.likes.filter((l) => l.postId === p.id).length,
    commentCount: db.comments.filter((c) => c.postId === p.id).length,
    likedByMe: !!me() && db.likes.some((l) => l.postId === p.id && l.userId === me().id)
  });

  const blobToDataUrl = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });

  return {
    mode: 'demo',
    getUser: me,
    onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async signIn() { await wait(); db.session = true; save(); listeners.forEach((fn) => fn(me())); },
    async signOut() { await wait(); db.session = null; save(); listeners.forEach((fn) => fn(null)); },

    async listPosts({ status = 'approved', authorId = null, limit = 12, before = null } = {}) {
      await wait();
      return db.posts
        .filter(canSee)
        .filter((p) => status === 'all' || p.status === status)
        .filter((p) => !authorId || p.authorId === authorId)
        .filter((p) => !before || p.createdAt < before)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit)
        .map(toPost);
    },
    async getPost(id) { await wait(); const p = db.posts.find((x) => x.id === id); return p && canSee(p) ? toPost(p) : null; },
    async countPending() { return db.posts.filter((p) => p.status === 'pending').length; },

    async createPost({ title, body, source, images = [] }, onProgress = () => {}) {
      if (!me()) throw new Error('Bạn cần đăng nhập để đăng bài.');
      if (db.posts.filter((p) => p.authorId === me().id && p.status === 'pending').length >= 5) {
        throw new Error('Bạn đang có 5 bài chờ duyệt. Vui lòng đợi admin duyệt bớt.');
      }
      const stored = [];
      for (let i = 0; i < images.length; i++) {
        onProgress(i + 1, images.length);
        await wait(250);
        stored.push({ url: await blobToDataUrl(images[i].previewBlob || images[i].blob), width: images[i].width, height: images[i].height });
      }
      const post = {
        id: 'u' + uid(), authorId: me().id, title: title || '', body, source: source || '',
        status: 'pending', rejectReason: '', createdAt: new Date().toISOString(), images: stored
      };
      db.posts.push(post);
      save();
      return post.id;
    },
    async deletePost(post) { await wait(); db.posts = db.posts.filter((p) => p.id !== post.id); save(); },

    async setLike(postId, like) {
      if (!me()) throw new Error('Bạn cần đăng nhập để thả tim.');
      db.likes = db.likes.filter((l) => !(l.postId === postId && l.userId === me().id));
      if (like) db.likes.push({ postId, userId: me().id });
      save();
    },
    async listComments(postId) {
      await wait();
      return db.comments.filter((c) => c.postId === postId)
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
        .map((c) => ({ ...c, authorName: person(c.authorId).name, authorAvatar: person(c.authorId).avatar }));
    },
    async addComment(postId, body) {
      if (!me()) throw new Error('Bạn cần đăng nhập để bình luận.');
      db.comments.push({ id: 'c' + uid(), postId, authorId: me().id, body, createdAt: new Date().toISOString() });
      save();
    },
    async deleteComment(id) { db.comments = db.comments.filter((c) => c.id !== id); save(); },
    async review(postId, status, reason = '') {
      await wait();
      const p = db.posts.find((x) => x.id === postId);
      if (p) { p.status = status; p.rejectReason = status === 'rejected' ? reason : ''; save(); }
    },
    resetDemo() { db = demoSeed(); save(); }
  };
}
