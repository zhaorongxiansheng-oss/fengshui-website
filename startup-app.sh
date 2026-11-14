#!/bin/bash
# Uppcoder 自定义启动脚本：存在此文件时，平台会优先执行它。
set -e

cd /home/uppcoder/app
export PORT="${APP_PORT:-8000}"

node server.js
