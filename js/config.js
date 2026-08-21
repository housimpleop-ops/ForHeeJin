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
  SUPABASE_URL: "",      // 예: "https://xxxxxxxx.supabase.co"
  SUPABASE_ANON_KEY: "", // 예: "eyJhbGciOi..."
};
