# Trấn Thành Archive

Trang web của người hâm mộ về Trấn Thành: hero, tiểu sử, phim, điểm tin và **Góc người hâm mộ**
— nơi người hâm mộ đăng nhập Google để đăng bài, ảnh, thả tim và bình luận (bài được admin duyệt trước khi hiện).

HTML + CSS + JavaScript thuần, không cần build. Phần cộng đồng dùng **Supabase** (database + đăng nhập + lưu ảnh).

## Chạy trên máy

```bash
cd ~/Desktop/tran-thanh
python3 -m http.server 8000
```

Mở http://localhost:8000. (Cần chạy qua server như trên — mở thẳng file `index.html` thì phần Góc người hâm mộ không chạy.)

Chưa cài Supabase thì phần cộng đồng chạy ở **chế độ xem thử** (dữ liệu mẫu trong trình duyệt, đăng nhập giả, bạn là admin)
để thử toàn bộ luồng: đăng bài → duyệt → thả tim → bình luận. Muốn xoá dữ liệu thử: mở Console và chạy
`localStorage.removeItem('tt-demo-v1')`.

👉 **Cài đặt thật: xem `SETUP.md`.**

## Cấu trúc

```
index.html                 trang chủ (hero, tiểu sử, phim, điểm tin, 6 bài mới nhất của người hâm mộ)
cong-dong.html             Góc người hâm mộ: bảng tin đầy đủ, "Bài của tôi", đăng bài
admin.html                 trang duyệt bài (chỉ admin)
assets/css/style.css       toàn bộ giao diện
assets/js/main.js          menu, hiệu ứng hero, slideshow, hiệu ứng cuộn
assets/js/config.js        ← điền Supabase URL + anon key vào đây
assets/js/community/
  api.js                   đọc/ghi dữ liệu (Supabase thật hoặc dữ liệu mẫu)
  ui.js                    thẻ bài, xem bài + bình luận, khung đăng bài, nén ảnh, đăng nhập
  home.js | feed.js | admin.js   mã riêng cho từng trang
assets/images/             ảnh chân dung, slideshow, posters/
supabase/schema.sql        tạo bảng + quy tắc bảo mật (chạy 1 lần trong Supabase)
SETUP.md                   hướng dẫn cài Supabase + đăng nhập Google từng bước
```

## Đường dẫn hữu ích

- `cong-dong.html#dang-bai` — mở thẳng khung đăng bài
- `cong-dong.html#cua-toi` — bài của tôi (kể cả đang chờ duyệt / bị từ chối)
- `cong-dong.html#bai-<id>` — link chia sẻ một bài (nút "Chia sẻ" trong bài tự tạo link này)

## Chỉnh sửa thường gặp

**Đổi màu nhấn (vàng đồng):** sửa `--accent` ở đầu `assets/css/style.css`.

**Thêm ảnh vào slideshow ở hero:** trong `index.html`, phần `hero__slideshow`:
1. Chép ảnh vào `assets/images/`.
2. Nhân bản một khối `<div class="slide" data-slide>…</div>`, đổi `src`, `alt` (`object-position` chỉnh khung hình).
3. Thêm một nút `<button class="slideshow__bar" data-slide-to="2" …>` (số tăng dần từ 0).
4. Thêm một khối `<div class="caption" data-caption>…</div>` cho chú thích.

**Poster phim:** nằm trong `assets/images/posters/`. Đổi poster = thay file cùng tên. Ảnh dọc tỉ lệ 2:3 đẹp nhất.

**Thanh doanh thu:** mỗi thanh có `style="--w: 77%"` = doanh thu ÷ 551 (phim cao nhất).

**Giới hạn đăng bài** (6 ảnh/bài, 5 MB/ảnh, 5 bài chờ duyệt/người, độ dài chữ): đổi trong `supabase/schema.sql`
và các hằng số `MAX_…` đầu file `assets/js/community/api.js` cho khớp.

## Đưa lên mạng

Trang tĩnh nên đăng miễn phí được trên Netlify / Vercel / GitHub Pages (VD kéo thả cả thư mục vào app.netlify.com/drop).
Sau đó làm mục 8 trong `SETUP.md` để đăng nhập Google chạy được trên tên miền mới.
