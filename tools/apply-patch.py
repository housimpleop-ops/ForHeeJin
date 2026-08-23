# -*- coding: utf-8 -*-
"""부분 보강 데이터를 js/data-spots.js 의 SPOTS 항목에 덮어쓴다.

사용법:  python tools/apply-patch.py <patch.json>
  patch.json 은 [{"cat":..., "n":..., 채울 항목들...}, ...]
cat+n 으로 찾아 해당 항목만 갱신하고, 나머지 필드는 그대로 둔다.
"""
import io, json, os, re, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "js", "data-spots.js")
HERE = os.path.dirname(os.path.abspath(__file__))


def main(patch_path):
    patch = json.load(io.open(patch_path, encoding="utf-8"))

    # 현재 SPOTS 를 node 로 읽어온다 (JS 파일이라 파이썬으로 바로 못 읽음)
    dump = os.path.join(HERE, "_spots-dump.json")
    subprocess.run(["node", "-e",
        "const vm=require('vm'),fs=require('fs');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(%r,'utf8')+';globalThis.__S=SPOTS;',c);"
        "fs.writeFileSync(%r, JSON.stringify(c.__S),'utf8');" % (JS.replace("\\", "/"), dump.replace("\\", "/"))],
        check=True)
    spots = json.load(io.open(dump, encoding="utf-8"))
    os.remove(dump)

    idx = {(s["cat"], s["n"]): s for s in spots}
    hit, miss, changed = 0, [], 0
    for p in patch:
        key = (p["cat"], p["n"])
        s = idx.get(key)
        if not s:
            miss.append(p["n"]); continue
        hit += 1
        for k, v in p.items():
            if k in ("cat", "n"):
                continue
            if s.get(k) != v:
                s[k] = v; changed += 1
        # 정보를 보강했으니 신뢰도를 올린다
        if s.get("conf") == "low":
            s["conf"] = "mid"

    body = ",\n".join(json.dumps(s, ensure_ascii=False, separators=(",", ":")) for s in spots)
    src = io.open(JS, encoding="utf-8").read()
    new, n = re.subn(r"const SPOTS = \[.*?\n\];", "const SPOTS = [\n" + body + "\n];", src, count=1, flags=re.S)
    if n != 1:
        print("!! SPOTS 배열을 찾지 못했습니다"); sys.exit(1)
    io.open(JS, "w", encoding="utf-8").write(new)

    rep = io.open(os.path.join(HERE, "patch-report.txt"), "w", encoding="utf-8")
    rep.write("패치 %d건 중 %d건 적용, 항목 %d개 갱신\n" % (len(patch), hit, changed))
    if miss:
        rep.write("\n이름을 못 찾은 것:\n")
        for m in miss: rep.write("  - %s\n" % m)
    rep.close()
    print("OK")


main(sys.argv[1])
