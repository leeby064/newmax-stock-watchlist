#!/bin/sh
# 宿主把 entry 作为第一个参数传入。解释器必须是应用外的系统 Python，脚本本身留在应用目录。
set -eu
entry="${1:-}"
if [ -z "$entry" ]; then
  dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
  entry="$dir/quote_server.py"
fi
py=""
for candidate in /usr/local/bin/python3 /opt/homebrew/bin/python3 /usr/bin/python3; do
  if [ -x "$candidate" ]; then
    py=$candidate
    break
  fi
done
if [ -z "$py" ]; then
  echo "quote service: python3 not found" >&2
  exit 1
fi
exec "$py" -I "$entry"
