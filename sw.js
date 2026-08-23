/* 서비스워커 — 알림 표시용 (파일 캐시는 하지 않음: 항상 최신 버전 유지) */
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    if (cs[0]) return cs[0].focus();
    return clients.openWindow("./");
  }));
});
