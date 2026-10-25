# Cài đặt "Góc người hâm mộ" (Supabase + đăng nhập Google)

Khi `assets/js/config.js` còn để trống, trang chạy ở **chế độ xem thử** với dữ liệu mẫu trong trình duyệt.
Làm theo các bước dưới (khoảng 20–30 phút) để người hâm mộ đăng bài, ảnh, thả tim và bình luận thật.

> Giao diện Supabase / Google Cloud thỉnh thoảng đổi tên menu. Nếu không thấy đúng tên, tìm mục gần nghĩa nhất.

---

## 1. Tạo project Supabase

1. Vào https://supabase.com → **Start your project** → đăng nhập (có thể dùng GitHub hoặc email).
2. **New project**: đặt tên (VD `tran-thanh-archive`), đặt mật khẩu database (lưu lại), chọn region **Southeast Asia (Singapore)** cho nhanh ở Việt Nam.
3. Đợi 1–2 phút cho project khởi tạo xong.

## 2. Tạo bảng và quyền truy cập

1. Trong project: menu trái **SQL Editor** → **New query**.
2. Mở file `supabase/schema.sql` trong thư mục này, copy **toàn bộ** nội dung, dán vào ô query → **Run**.
3. Thấy dòng "Success. No rows returned" là xong. (Chạy lại lần nữa cũng không sao.)

File này tạo: hồ sơ người dùng, bài viết, ảnh, thả tim, bình luận, kho ảnh `post-images`, và các quy tắc bảo mật:
- Bài mới luôn ở trạng thái **chờ duyệt**, chỉ người đăng và admin thấy.
- Người dùng thường không thể tự duyệt bài hay tự cấp quyền admin.
- Mỗi bài tối đa 6 ảnh, mỗi ảnh tối đa 5 MB, mỗi người tối đa 5 bài chờ duyệt cùng lúc.
- Ảnh chỉ được tải vào thư mục của chính người đăng.

## 3. Điền thông tin kết nối

1. Supabase → **Project Settings** (bánh răng) → **API** (hoặc **Data API** / **API Keys**).
2. Copy **Project URL** và khoá **anon public**.
3. Mở `assets/js/config.js`, điền:

   ```js
   export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```

   ⚠️ Chỉ dùng khoá **anon / public**. Không bao giờ dán khoá **service_role** vào trang web.

## 4. Bật đăng nhập Google

Cần làm ở 2 nơi: **Google Cloud** (tạo "chìa khoá" đăng nhập) và **Supabase** (dán chìa khoá vào).
Mở sẵn 2 tab trình duyệt: https://console.cloud.google.com và Supabase dashboard.

### 4a. Lấy Callback URL từ Supabase (để dùng ở bước 4d)

1. Supabase → chọn project → menu trái **Authentication** → **Sign In / Providers**.
2. Bấm vào dòng **Google** (chưa cần bật).
3. Copy ô **Callback URL (for OAuth)**, dạng: `https://abcdxyz.supabase.co/auth/v1/callback` → dán tạm ra Notes.

### 4b. Tạo project + màn hình đồng ý trên Google Cloud

1. https://console.cloud.google.com → đăng nhập Gmail.
2. Bấm ô chọn project (cạnh logo Google Cloud, góc trái trên) → **New project** → tên `tran-thanh-archive` → **Create**.
   Đợi vài giây → bấm lại ô chọn project → chọn đúng project vừa tạo.
3. Gõ **Google Auth Platform** vào ô tìm kiếm trên cùng (hoặc ☰ → APIs & Services → OAuth consent screen) → **Get started**:
   - **App information**: App name `Trấn Thành Archive`, User support email: chọn email của bạn → Next
   - **Audience**: chọn **External** → Next
   - **Contact information**: nhập email của bạn → Next
   - **Finish**: tick đồng ý → **Continue** → **Create**
4. Menu trái **Data Access** → **Add or remove scopes** → tick 3 dòng:
   `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` → **Update** → **Save** (cuối trang).
5. Menu trái **Audience** → mục *Publishing status* đang là **Testing** → bấm **Publish app** → **Confirm**.
   (Nếu để Testing, chỉ những email bạn thêm vào *Test users* mới đăng nhập được.
    Chỉ dùng 3 quyền cơ bản ở trên nên không cần Google xét duyệt. Tạm thời **đừng tải logo** —
    tải logo sẽ kích hoạt quy trình xác minh thương hiệu mất vài ngày.)

### 4c. Tạo OAuth Client

1. Menu trái **Clients** → **+ Create client**.
2. **Application type**: `Web application`. **Name**: `Tran Thanh Archive Web`.
3. **Authorized JavaScript origins** → **+ Add URI** → `http://localhost:8000`
4. **Authorized redirect URIs** → **+ Add URI** → dán Callback URL lấy ở bước 4a.
5. **Create** → hộp thoại hiện **Client ID** và **Client secret**.
   ⚠️ Bấm **Download JSON** hoặc copy ngay cả hai — Google chỉ hiện Client secret **một lần** lúc tạo.

### 4d. Dán vào Supabase

1. Quay lại Supabase → **Authentication → Sign In / Providers → Google**.
2. Bật **Enable Sign in with Google**.
3. **Client IDs**: dán Client ID (dạng `1234-abc.apps.googleusercontent.com`).
   **Client Secret (for OAuth)**: dán Client secret (dạng `GOCSPX-...`).
   Các tuỳ chọn khác để mặc định → **Save**.
4. Menu **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:8000` → **Save**
   - **Redirect URLs** → **Add URL** → `http://localhost:8000/**` → **Save URLs**

### 4e. Kiểm tra

1. Đảm bảo đã điền `assets/js/config.js` (bước 3), mở http://localhost:8000 → `⌘⇧R` (tải lại cứng).
   Dòng "Chế độ xem thử" phải biến mất.
2. Bấm **Đăng nhập** → chọn tài khoản Google → màn hình Google ghi "tiếp tục đến abcdxyz.supabase.co" (bình thường)
   → quay về trang, góc phải hiện ảnh đại diện của bạn.
3. Supabase → **Authentication → Users** thấy email của bạn; **Table Editor → profiles** có 1 dòng tên bạn.

### Lỗi thường gặp

| Thông báo | Cách sửa |
|---|---|
| `Error 400: redirect_uri_mismatch` | Redirect URI ở bước 4c phải giống **y hệt** Callback URL của Supabase (https, đúng mã project, không thừa dấu `/` cuối). |
| "Access blocked" / "chỉ người dùng thử nghiệm" | App còn ở chế độ Testing → làm lại bước 4b.5 (Publish app) hoặc thêm email vào *Audience → Test users*. |
| `Unsupported provider: provider is not enabled` | Chưa bật hoặc chưa bấm Save Google ở bước 4d. |
| Đăng nhập xong bị đưa về `localhost:3000` | Chưa sửa Site URL / Redirect URLs ở bước 4d.4. |
| Trang vẫn hiện "Chế độ xem thử" | `config.js` còn trống hoặc trình duyệt dùng bản cũ → `⌘⇧R`. |
| Vừa sửa trên Google mà chưa có tác dụng | Thay đổi của Google có thể mất 5 phút tới vài giờ mới áp dụng. |

## 5. Chạy thử

```bash
cd ~/Desktop/tran-thanh
python3 -m http.server 8000
```

Mở http://localhost:8000 → bấm **Đăng nhập** (góc phải trên) → chọn tài khoản Google.
Dòng "Chế độ xem thử" sẽ biến mất — nghĩa là đã chạy bằng dữ liệu thật.

> Phải mở qua `http://localhost:8000`, không mở bằng cách bấm đúp file `index.html`
> (trình duyệt chặn phần JavaScript dạng module khi mở trực tiếp từ ổ đĩa).

## 6. Cấp quyền admin cho chính bạn

Sau khi đã đăng nhập trang web bằng Google **ít nhất một lần**, vào Supabase → **SQL Editor** → chạy (thay email):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'email-cua-ban@gmail.com');
```

Tải lại trang → bấm vào ảnh đại diện → **Duyệt bài (admin)**, hoặc vào thẳng http://localhost:8000/admin.html.

Muốn thêm người cùng duyệt bài: chạy lại câu lệnh trên với email của họ (họ cũng phải đăng nhập trang một lần trước).

## 7. Quy trình hằng ngày

1. Người hâm mộ bấm **Đăng bài** → viết nội dung, chọn tối đa 6 ảnh, ghi nguồn, tick đồng ý quy định → gửi.
   Ảnh được nén ngay trong trình duyệt (tối đa 2000px) và **xoá thông tin GPS/EXIF** trước khi tải lên.
2. Bài vào mục **Chờ duyệt** ở trang admin. Bạn chọn:
   - **Duyệt** → hiện công khai ngay trên trang chủ và trang Góc người hâm mộ.
   - **Từ chối** + lý do → chỉ người đăng thấy lý do trong mục "Bài của tôi".
   - **Gỡ xuống** (với bài đã duyệt) hoặc **Xoá vĩnh viễn**.
3. Bình luận hiện ngay trên bài đã duyệt; admin xoá được mọi bình luận, người viết xoá được bình luận của mình.

## 8. Đưa lên mạng: Netlify + tên miền fctranthanh.com (mua ở Spaceship)

### 8a. Đăng trang lên Netlify
1. https://app.netlify.com → **Sign up** (dùng Google/GitHub/email).
2. **Add new project → Deploy manually** → kéo cả thư mục `tran-thanh` trên Desktop thả vào ô upload.
3. Vài giây sau có link dạng `https://ten-ngau-nhien.netlify.app` → mở thử.
4. **Project configuration → Change project name** → đặt `fctranthanh` (link thành `fctranthanh.netlify.app`).
5. Lần sau sửa trang: **Deploys** → kéo thả lại cả thư mục.

### 8b. Gắn tên miền trên Netlify
1. Netlify → **Domain management → Add a domain** → nhập `fctranthanh.com` → **Verify** → **Add domain**
   (Netlify báo tên miền đã đăng ký ở nơi khác — đúng, bấm tiếp).
2. Netlify sẽ tự thêm cả `www.fctranthanh.com`. Để `fctranthanh.com` làm **Primary domain**.

### 8c. Trỏ DNS ở Spaceship
1. https://www.spaceship.com → **Launchpad → Domain Manager** → bấm `fctranthanh.com` → **Advanced DNS** (DNS records).
2. **Xoá** các bản ghi mặc định đang trỏ `@` và `www` sang trang đỗ (parking) của Spaceship (nếu có).
3. **Add record**:

   | Type  | Host | Value                      | TTL  |
   |-------|------|----------------------------|------|
   | A     | `@`  | `75.2.60.5`                | Auto |
   | CNAME | `www`| `fctranthanh.netlify.app`  | Auto |

   (Nếu project Netlify không đổi tên, dùng đúng tên `xxx.netlify.app` của bạn.)
4. Đợi từ vài phút tới vài giờ. Netlify → **Domain management** → thấy dấu tích xanh ở tên miền →
   mục **HTTPS** → **Verify DNS configuration** → Netlify tự cấp chứng chỉ SSL (thường < 1 giờ).

### 8d. Cập nhật Supabase và Google cho tên miền mới
1. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://fctranthanh.com`
   - **Redirect URLs**: thêm `https://fctranthanh.com/**` và `https://www.fctranthanh.com/**`
     (giữ `http://localhost:8000/**` để vẫn thử trên máy được).
2. Google Cloud → **Google Auth Platform → Clients** → bấm client đã tạo →
   **Authorized JavaScript origins** → thêm `https://fctranthanh.com` và `https://www.fctranthanh.com` → **Save**.
   (Authorized redirect URIs giữ nguyên Callback URL của Supabase.)
3. **Branding → Authorized domains**: kiểm tra có `fctranthanh.com` (thường Google tự thêm ở bước trên).
4. Mở https://fctranthanh.com → Đăng nhập Google → đăng thử một bài.

## Lưu ý

- **Gói miễn phí của Supabase** (theo thông tin đến giữa 2026, có thể thay đổi): khoảng 500 MB database, 1 GB lưu ảnh;
  project có thể bị **tạm dừng nếu không có hoạt động khoảng 1 tuần** — vào dashboard bấm Restore là chạy lại.
  Kiểm tra mức giới hạn hiện tại tại https://supabase.com/pricing.
- **Bản quyền và đời tư**: quy định đăng bài đã yêu cầu ghi nguồn và cấm thông tin đời tư. Khi có người yêu cầu gỡ ảnh
  (chủ ảnh, nhiếp ảnh gia, người trong ảnh), hãy gỡ bằng nút Xoá ở trang admin.
- **Sao lưu**: Supabase → Database → Backups (gói trả phí có sao lưu tự động); gói miễn phí nên định kỳ export dữ liệu.
