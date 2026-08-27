# -*- coding: utf-8 -*-
"""세션 기록(jsonl)에서 '보강 조사' 결과(cat+n+채운 항목)를 긁어 patch 파일로 만든다.

사용법:  python tools/pull-patch.py <세션.jsonl> <patch.json>
  좌표(lat)가 없고 cat·n 만 있는 조각을 보강 데이터로 본다.
  현재 SPOTS 에 같은 cat+n 이 없으면 이름이 틀린 것이므로 버리고 따로 알려준다.
"""
import html, io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "js", "data-spots.js")
FENCE = re.compile(r"```json\s*(\[.*?\])\s*```", re.S)
SKIP = {"cat", "n", "lat", "lng", "r", "a"}


def strings(d):
    if isinstance(d, dict):
        for v in d.values(): yield from strings(v)
    elif isinstance(d, list):
        for v in d: yield from strings(v)
    elif isinstance(d, str):
        yield d


def current():
    dump = os.path.join(ROOT, "tools", "_cur.json")
    subprocess.run(["node", "-e",
        "const vm=require('vm'),fs=require('fs');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(%r,'utf8')+';globalThis.__S=SPOTS;',c);"
        "fs.writeFileSync(%r, JSON.stringify(c.__S),'utf8');"
        % (JS.replace("\\", "/"), dump.replace("\\", "/"))], check=True)
    rows = json.load(io.open(dump, encoding="utf-8"))
    os.remove(dump)
    return rows


def main(jl, out_path):
    have = {(s["cat"], s["n"]) for s in current()}
    found, unknown = {}, []
    for line in io.open(jl, encoding="utf-8"):
        if "```json" not in line: continue
        try: o = json.loads(line)
        except Exception: continue
        for txt in strings(o):
            for m in FENCE.findall(txt):
                try: arr = json.loads(m)
                except Exception: continue
                if not isinstance(arr, list): continue
                for s in arr:
                    if not isinstance(s, dict): continue
                    if "cat" not in s or "n" not in s: continue
                    if s.get("lat"): continue          # 새 스팟 결과는 여기서 다루지 않는다
                    # 새 스팟 조사 결과에는 conf 가 늘 붙는다 — 그건 보강 데이터가 아니다
                    if "conf" in s: continue
                    # 예전 '폐업 확인' 차수 결과(status 필드)는 tip 을 덮어써서 오히려 깎인다
                    if "status" in s: continue
                    # 지시문에 넣은 예시("...")가 그대로 잡히는 것을 막는다
                    if any(isinstance(v, str) and v.strip(". ") == "" for v in s.values()): continue
                    # acts4 는 "아무것도 못 한다"는 뜻의 빈 배열도 의미가 있어 살린다
                    fields = {k: v for k, v in s.items()
                              if k not in SKIP and (v not in (None, "", []) or k == "acts4")}
                    if not fields: continue
                    key = (s["cat"], html.unescape(s["n"]).strip())
                    if key not in have:
                        unknown.append("%s | %s" % key); continue
                    row = found.setdefault(key, {"cat": key[0], "n": key[1]})
                    row.update(fields)                  # 나중 것이 이긴다
    rows = list(found.values())
    io.open(out_path, "w", encoding="utf-8").write(
        json.dumps(rows, ensure_ascii=False, indent=1))

    rep = ["보강 %d곳" % len(rows)]
    per = {}
    for r in rows:
        per[r["cat"]] = per.get(r["cat"], 0) + 1
    for k in sorted(per): rep.append("  %-8s %3d" % (k, per[k]))
    if unknown:
        rep.append("")
        rep.append("!! 이름이 안 맞아 버린 것 %d개" % len(unknown))
        rep += ["  " + u for u in sorted(set(unknown))]
    io.open(os.path.join(ROOT, "tools", "patch-pull-report.txt"), "w",
            encoding="utf-8").write("\n".join(rep))
    print("OK")


main(sys.argv[1], sys.argv[2])
