#!/bin/sh
# Tạo assets/js/config.js từ biến môi trường (dùng khi build trên Netlify).
# Không có biến → giữ chế độ xem thử.
set -e
cat > assets/js/config.js <<CFG
export const SUPABASE_URL = '${SUPABASE_URL:-}';
export const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY:-}';
CFG
echo "config.js generated (url set: $([ -n "$SUPABASE_URL" ] && echo yes || echo no))"
