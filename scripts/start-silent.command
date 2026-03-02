#!/bin/bash
cd "$(dirname "$0")/.."
if [ ! -d "node_modules" ]; then
    npm install >/dev/null 2>&1
fi
nohup npm start >/dev/null 2>&1 &
exit 0
