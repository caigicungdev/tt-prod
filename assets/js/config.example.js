/* =====================================================================
   MẪU cấu hình Supabase — copy file này thành assets/js/config.js rồi điền.
   File config.js thật đã nằm trong .gitignore, không bao giờ được commit.

   Lấy 2 giá trị trong Supabase: Project Settings → API
     • Project URL           → SUPABASE_URL
     • anon / public key     → SUPABASE_ANON_KEY
   (TUYỆT ĐỐI KHÔNG dùng "service_role" key.)

   Để trống cả hai = chế độ xem thử với dữ liệu mẫu.
   Khi deploy trên Netlify: đặt biến môi trường SUPABASE_URL và SUPABASE_ANON_KEY,
   file config.js sẽ được tạo tự động lúc build (xem netlify.toml).
   ===================================================================== */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
