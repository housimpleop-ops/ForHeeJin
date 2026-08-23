# -*- coding: utf-8 -*-
"""러닝 스팟(js/data-run.js)에 parkSpot(추천 주차 위치)을 채워 넣는다.

사용법:  python tools/merge-parkspot.py <park-run.json>
  park-run.json 은 {"스팟이름": "추천 주차 설명", ...} 형태.
이미 parkSpot 이 있는 항목은 건드리지 않는다(덮어쓰지 않음).
"""
import json, re, sys, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = os.path.join(ROOT, "js", "data-run.js")

def main(patch_path):
    patch = json.load(io.open(patch_path, encoding="utf-8"))
    src = io.open(RUN, encoding="utf-8").read()

    hit, already, miss = [], [], []
    def add_park(m):
        """{"n":"이름", ... } 객체 하나를 받아 parkSpot 을 pkTxt 뒤에 끼워 넣는다."""
        obj = m.group(0)
        nm = re.search(r'"n"\s*:\s*"([^"]+)"', obj)
        if not nm: return obj
        name = nm.group(1)
        if name not in patch: return obj
        if '"parkSpot"' in obj:
            already.append(name); return obj
        val = json.dumps(patch[name], ensure_ascii=False)
        # pkTxt 바로 뒤에 넣는다(없으면 pk 뒤)
        anchor = re.search(r'("pkTxt"\s*:\s*(?:"(?:[^"\\]|\\.)*"|null)\s*,?)', obj) \
              or re.search(r'("pk"\s*:\s*(?:"[^"]*"|null)\s*,?)', obj)
        if not anchor: return obj
        a = anchor.group(1)
        ins = a + (' "parkSpot": ' + val + ',' if a.rstrip().endswith(',') else ', "parkSpot": ' + val)
        hit.append(name)
        return obj.replace(a, ins, 1)

    out = re.sub(r'\{[^{}]*"n"\s*:\s*"[^"]+"[^{}]*\}', add_park, src)
    io.open(RUN, "w", encoding="utf-8").write(out)

    for k in patch:
        if k not in hit and k not in already: miss.append(k)
    print("채움 :", len(hit))
    print("기존 :", len(already))
    print("이름 못 찾음 :", len(miss))
    for m in miss: print("   -", m)
    total = len(re.findall(r'"parkSpot"', out))
    print("data-run.js parkSpot 총 개수 :", total)

if __name__ == "__main__":
    main(sys.argv[1])
