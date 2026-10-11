# OWTO

Chinagoods 义乌小商品城 AI 实战赛 · 参赛队伍 OWTO（ID 6488）

儿童遥控变形消防车 —— AI 营销物料作战矩阵网页（六大物料板块 · 29 轮迭代 · 92 张 AI 素材 + 4 支成片）。

## 预览

本地启动：

```
python -m http.server 8765 --directory web
```

打开 http://localhost:8765/ ，也可直接双击 `web/index.html`。

## 结构

- `web/` — 网站源文件（门户 `index.html` + 6 个物料分页 + 样式/脚本/数据/素材）
- `web/assets/` — AI 生成的图片素材与短视频成片
- `web/content.json` — 从参赛 docx 提取的原始内容（`extract_docx.py` 生成）
- `build_site.py` — 将 content.json 编译为 `web/data.js`（含短视频成片替换逻辑）
- `extract_docx.py` — 从 6 个参赛 docx 中提取文字与图片

## 工具链

世界义乌AI · 元宝 · DeepSeek · 豆包 · 即梦AI
