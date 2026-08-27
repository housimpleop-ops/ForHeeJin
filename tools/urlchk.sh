#!/bin/bash
: > tools/_urlchk.txt
cat tools/_urls.txt | while IFS=$'\t' read -r u n; do
  ( code=$(curl -sk -o /dev/null -w '%{http_code}' -L --max-time 15 -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' "$u" 2>/dev/null || echo ERR)
    printf '%s\t%s\t%s\n' "$code" "$u" "$n" >> tools/_urlchk.txt ) &
  while [ "$(jobs -rp | wc -l)" -ge 12 ]; do wait -n; done
done
wait
echo DONE >> tools/_urlchk.txt
