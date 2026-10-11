# -*- coding: utf-8 -*-
"""把 content.json 按人工梳理的分组结构编译为 web/data.js"""
import json, os, re
from PIL import Image

BASE = r"d:\国赛ppt"
WEB = os.path.join(BASE, "web")
data = json.load(open(os.path.join(WEB, "content.json"), encoding="utf-8"))

# 图片尺寸缓存
_dims = {}
def dim(mat, fname):
    key = (mat, fname)
    if key not in _dims:
        with Image.open(os.path.join(WEB, "assets", mat, fname)) as im:
            _dims[key] = [im.width, im.height]
    return _dims[key]

H_RE = re.compile(
    r"(^(第[一二三四五]次迭代|初代.*|初次.*|初版.*|使用AI[:：].*|产品主图[一二三四五].*|"
    r"每屏副图.*|生成结果.*|^产出$|^Prompt$|^海报$|存在问题.*|^[一二三四五]、.*|"
    r"第一次口令.*|迭代口令.*|第二次迭代.*|第三次迭代.*|初代口令.*|每屏.*)$|"
    r"^【?屏\s*\d{1,2}[｜|:：]?)"
)

def role_of(text):
    s = text.strip()
    if len(s) <= 30 and (H_RE.match(s) or re.match(r"^屏\s*\d", s)):
        return "h"
    if len(s) <= 24 and re.match(r"^(【[^】]+】[^，。]*)", s) and len(s) <= 20:
        return "h"
    return "p"

def convert(mat, lo, hi):
    out = []
    for b in data[mat]["blocks"][lo:hi + 1]:
        if b["text"]:
            out.append({"t": "text", "v": b["text"], "r": role_of(b["text"])})
        for im in b["imgs"]:
            w, h = dim(mat, im["img"])
            out.append({"t": "img", "src": "assets/%s/%s" % (mat, im["img"]), "w": w, "h": h})
    return out

GROUPS = {
    "主图": [
        ("方案一 · 2-IN-1 变形概念", "底图生成 + 排版三轮迭代 · 1:1 电商主图", 0, 40),
        ("方案二 · 赛博能量光柱", "材质升级 + 4A 视觉总监排版重构", 41, 75),
        ("方案三 · 炫酷水炮与灯光", "真实喷水卖点 · 局部重绘四轮打磨", 76, 115),
        ("方案四 · B端厂家直供", "仓储实景 · 源头批发信任状", 116, 154),
        ("方案五 · 亲子互动场景", "暖光客厅 · 小红书种草向", 155, 194),
    ],
    "详情页": [
        ("初代文案 · 8 屏", "世界义乌AI 生成 · 含完整对话记录截图", 0, 127),
        ("第一次迭代文案 · 9 屏", "元宝：补入“变形”第一卖点与实物信息", 128, 242),
        ("第二次迭代文案 · 9 屏", "元宝：B/C 客群分层 · 供货条件表格化", 243, 428),
        ("第三次迭代文案 · 9 屏", "DeepSeek：强化营销感染力与说服力", 429, 601),
        ("视觉副图 · 豆包初版", "9 屏底图首次生成", 602, 622),
        ("视觉副图 · 即梦迭代一", "赛博朋克科技风 9 屏底图", 623, 732),
        ("视觉副图 · 即梦迭代二", "实物还原 · 义乌档口实景 9 屏", 733, 850),
        ("图文成品 · 完整详情页", "即梦AI + 元宝合成 · 可直接上架的 9 张长图", 851, 864),
    ],
    "单页": [
        ("初次创作 · 9:16 竖版单页", "完整角色/技能/版式 Prompt", 0, 2),
        ("第一次迭代 · 品牌感升级", "解决页面杂乱、缺少品牌感", 3, 4),
        ("第二次迭代 · 玩法与情绪", "强化消防任务流程与真实玩耍感", 5, 6),
        ("第三次迭代 · 高级感与真实性", "国际儿童玩具品牌宣传册质感", 7, 8),
    ],
    "短视频": [
        ("初版方案", "世界义乌AI · 35 秒四段式商品展示视频", 0, 2),
        ("迭代版方案 1 · 问题诊断", "重新定位：去掉生硬广告词", 3, 7),
        ("迭代版方案 2 · 分镜重构", "30 秒电影级分镜 Prompt 脚本", 8, 17),
        ("迭代版方案 3 · 声音与转场", "环境音 + 科技感配乐 · 平台执行建议", 18, 23),
    ],
    "海报": [
        ("初次产出 · 1:1", "电商主图风格商业海报", 0, 3),
        ("第一次迭代 · 改 9:16", "修正比例 · 增加救火交互画面", 4, 7),
        ("第二次迭代 · 沉浸式故事", "“小小消防员，出动！”电影级叙事海报", 8, 10),
        ("第三次迭代 · 购买信息", "加入 ¥30/件 · 批发抢购等采购信息", 11, 15),
    ],
    "朋友圈种草贴": [
        ("初代口令与结果", "世界义乌AI：5 篇朋友圈 + 2 篇小红书种草贴", 0, 6),
        ("第一次迭代 · emoji 精修", "DeepSeek：表情贴合情绪 · 语句微调", 7, 12),
        ("第二次迭代 · 内容扩容", "DeepSeek：卖点补齐 · 种草贴 380–450 字 + 话题标签", 13, 19),
        ("第三次迭代 · 强钩子", "DeepSeek：反问/爆料开头 · 真实探店风", 20, 23),
    ],
}

META = [
    ("主图", "MAIN IMAGE", "电商主图", "五套主图方案 × 多轮迭代，覆盖变形概念、功能特写、B端批发与亲子种草四大投放场景。", "grid"),
    ("详情页", "DETAIL PAGE", "详情页", "4 轮 9 屏文案策划 + 3 轮视觉副图，最终合成为可直接上架的图文详情页长图。", "masonry"),
    ("单页", "LEAFLET", "产品单页", "9:16 竖版产品宣传单页，从电商详情页风格迭代至国际品牌宣传册质感。", "portrait"),
    ("短视频", "SHORT VIDEO", "短视频", "30–35 秒商品宣传视频的分镜脚本、配音配乐与平台投放策略迭代。", "film"),
    ("海报", "POSTER", "营销海报", "从 1:1 商品摆拍迭代到 9:16 沉浸式消防救援故事海报，并补齐批发采购信息。", "portrait"),
    ("朋友圈种草贴", "SOCIAL POSTS", "社交文案", "朋友圈 × 5 + 小红书种草贴 × 2，三轮迭代完成 emoji、篇幅与钩子优化。", "masonry"),
]

site = []
for idx, (mat, en, label, desc, gallery) in enumerate(META, start=1):
    groups = []
    for gi, (title, note, lo, hi) in enumerate(GROUPS[mat]):
        groups.append({
            "title": title,
            "note": note,
            "final": gi == len(GROUPS[mat]) - 1,
            "blocks": convert(mat, lo, hi),
        })
    n_img = sum(1 for g in groups for b in g["blocks"] if b["t"] == "img")
    site.append({
        "id": mat,
        "index": "%02d" % idx,
        "en": en,
        "label": label,
        "desc": desc,
        "gallery": gallery,
        "groups": groups,
        "imgCount": n_img,
    })

# 短视频板块：用真实成片替换分镜截图（初版→迭代一→迭代二→迭代三 对应 1-4 号视频）
VIDEO_MAP = {"短视频": ["1.mp4", "2.mp4", "3.mp4", "4.mp4"]}
for _mat, _vids in VIDEO_MAP.items():
    _sec = next(s for s in site if s["id"] == _mat)
    for _g, _vid in zip(_sec["groups"], _vids):
        _g["blocks"] = [b for b in _g["blocks"] if b["t"] != "img"]
        _g["blocks"].append({"t": "video", "src": "assets/%s/%s" % (_mat, _vid)})
    _sec["imgCount"] = sum(1 for g in _sec["groups"] for b in g["blocks"] if b["t"] == "img")
    _sec["vidCount"] = sum(1 for g in _sec["groups"] for b in g["blocks"] if b["t"] == "video")

os.makedirs(WEB, exist_ok=True)
with open(os.path.join(WEB, "data.js"), "w", encoding="utf-8") as f:
    f.write("window.SITE_DATA = ")
    json.dump(site, f, ensure_ascii=False)
    f.write(";\n")
print("data.js ok, sections:", len(site))
for s in site:
    print(s["id"], s["imgCount"], "imgs,", len(s["groups"]), "groups")
