#!/bin/bash
# 天气查询快捷脚本

city=$(echo "$1" | sed 's/ /+/g')
curl -s "wttr.in/${city}?T" | head -30