#!/bin/bash
u="$1"
code=$(curl -sk -o /dev/null -w '%{http_code}' -L --max-time 15 -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' "$u" 2>/dev/null)
[ -z "$code" ] && code=ERR
printf '%s\t%s\n' "$code" "$u"
