/* ============================================================
   map.js — 대한민국 SVG 지도 + 핀
   좌표계: viewBox 0 0 300 420. 일정의 x,y는 이 좌표로 저장됨.
   ============================================================ */

function mapSVG(id){
  return `<svg class="kmap" id="${id}" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="대한민국 지도">
  <path class="land" d="M60,78 L86,70 L112,62 L150,52 L200,38
    L208,50 L216,62 L230,80 L238,106 L248,140 L256,176 L266,200 L262,226 L256,240 L242,262
    L232,272 L224,279 L206,283 L188,287 L174,291 L158,288 L145,296 L131,286 L119,299 L101,291 L86,303 L71,297 L60,301 L48,287
    L53,271 L58,251 L61,231 L62,218 L57,205 L55,190 L47,172 L52,160 L66,150 L71,136 L61,126 L69,106 L59,91 Z"/>
  <ellipse class="land" cx="62" cy="380" rx="25" ry="10.5" transform="rotate(-8 62 380)"/>
  <g>
    <rect class="inset-b" x="238" y="12" width="54" height="32" rx="6"/>
    <circle class="city" cx="252" cy="24" r="3"/><circle class="city" cx="276" cy="21" r="1.5"/>
    <text x="265" y="38" text-anchor="middle" font-size="7">울릉도·독도</text>
  </g>
  <g>
    <circle class="city" cx="93" cy="95" r="1.8"/><text x="98" y="98">서울</text>
    <circle class="city" cx="222" cy="88" r="1.8"/><text x="203" y="91">강릉</text>
    <circle class="city" cx="121" cy="179" r="1.8"/><text x="126" y="182">대전</text>
    <circle class="city" cx="104" cy="216" r="1.8"/><text x="85" y="219">전주</text>
    <circle class="city" cx="206" cy="212" r="1.8"/><text x="211" y="215">대구</text>
    <circle class="city" cx="83" cy="261" r="1.8"/><text x="64" y="264">광주</text>
    <circle class="city" cx="232" cy="252" r="1.8"/><text x="237" y="255">부산</text>
    <circle class="city" cx="138" cy="282" r="1.8"/><text x="143" y="285">여수</text>
    <text x="62" y="403" text-anchor="middle">제주</text>
    <text x="82" y="88" font-size="9" text-anchor="middle">🏠</text>
  </g>
  <g>
    <rect class="inset-b" x="216" y="368" width="76" height="44" rx="8"/>
    <text x="254" y="388" text-anchor="middle" font-size="9">🌏 해외</text>
    <text x="254" y="401" text-anchor="middle" font-size="6.5">해외 일정은 여기에 콕!</text>
  </g>
  <g class="pins"></g>
</svg>`;
}

/* 화면 클릭 위치 → 지도 좌표 */
function svgPoint(svg, ev){
  const r = svg.getBoundingClientRect();
  const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
  const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
  return { x: Math.round((cx-r.left)/r.width*300*10)/10, y: Math.round((cy-r.top)/r.height*420*10)/10 };
}

function pinHTML(ev, hot){
  return `<g class="pin ${ev.type} ${ev.done?"done":""} ${hot?"hot":""}" data-id="${ev.id}" transform="translate(${ev.x},${ev.y})" style="cursor:pointer">
    <circle class="halo" r="6" fill="none" stroke="var(--${ev.type==="wed"?"fest":ev.type})" stroke-width="1.5" opacity="0"/>
    <circle class="c" r="5.2"/></g>`;
}
