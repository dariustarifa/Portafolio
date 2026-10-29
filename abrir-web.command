#!/bin/bash
# Abre el portafolio con un servidor local (así los vídeos de YouTube se reproducen dentro de la web).
cd "$(dirname "$0")"
PORT=8123
URL="http://localhost:$PORT/"
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  python3 -m http.server $PORT
elif command -v ruby >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  ruby -run -e httpd . -p $PORT
else
  open index.html
fi
