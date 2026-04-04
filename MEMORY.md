# Memory

## 常用技能缓存

### 天气查询 (weather)
- 工具：curl + wttr.in（无需API密钥）
- 命令格式：`curl -s "wttr.in/城市名?T" | head -30`
- 城市名需要URL编码：空格 → + (如：New+York)
- 快捷格式：`curl -s "wttr.in/城市名?format=3"` （一行摘要）
- 常用城市：
  - 北京: wttr.in/Beijing
  - 上海: wttr.in/Shanghai
  - 纽约: wttr.in/New+York
  - 伦敦: wttr.in/London
  - 东京: wttr.in/Tokyo

查询耗时预估：10-15秒（主要耗时在：网络请求5秒 + 信息整理5秒）