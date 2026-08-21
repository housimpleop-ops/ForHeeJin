/**
 * ★ 설정 파일 — Supabase 연결 정보는 여기만 수정하면 됩니다.
 *
 * 값을 채우는 방법: Supabase 대시보드 → Project Settings → API
 *   - Project URL   → SUPABASE_URL
 *   - anon (public) → SUPABASE_ANON_KEY   (공개되어도 안전한 키입니다. RLS가 데이터를 보호)
 *
 * 두 값이 비어 있으면 앱은 "로컬 모드"로 동작합니다(이 기기에만 저장).
 */
window.COUPLE_CONFIG = {
  SUPABASE_URL: "https://zwuuxihdfvjsuxffpsog.supabase.co", // ForHeeJin 프로젝트
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dXV4aWhkZnZqc3V4ZmZwc29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjU5MTksImV4cCI6MjEwMjkwMTkxOX0.cT1zzNLu0pIkNO-tIhn1R0pqZnt8wXusKYGLk5360S4",
  KAKAO_JS_KEY: "f6e8b8000d90d979e68d060dd950df8b", // 카카오맵 JavaScript 키 (도메인 잠금 공개키)
};
