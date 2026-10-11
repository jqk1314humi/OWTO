# -*- coding: utf-8 -*-
"""按文档顺序提取 docx 中的文字与图片，输出结构化 JSON。"""
import json
import os
import shutil
from docx import Document
from docx.oxml.ns import qn

BASE = r"d:\国赛ppt"
OUT = os.path.join(BASE, "web", "assets")

FILES = {
    "主图": "主图.docx",
    "详情页": "详情页.docx",
    "单页": "单页docx.docx",
    "短视频": "短视频.docx",
    "海报": "海报.docx",
    "朋友圈种草贴": "朋友圈和种草贴.docx",
}


def iter_block_items(doc):
    """按顺序产出 (类型, 内容)；图片以 {img: 文件名} 标记。"""
    body = doc.element.body
    rels = doc.part.rels
    img_counter = 0
    blocks = []
    for p in body.iter(qn("w:p")):
        # 收集段落中的文本与图片
        parts = []
        for node in p.iter():
            tag = node.tag
            if tag == qn("w:t") and node.text:
                parts.append(node.text)
            elif tag == qn("a:blip"):
                rid = node.get(qn("r:embed"))
                if rid and rid in rels:
                    img_counter += 1
                    ext = os.path.splitext(str(rels[rid].target_part.partname))[1] or ".png"
                    fname = f"img_{img_counter:02d}{ext}"
                    parts.append({"img": fname, "rid": rid})
            elif tag == "{urn:schemas-microsoft-com:vml}imagedata":
                rid = node.get(qn("r:id"))
                if rid and rid in rels:
                    img_counter += 1
                    ext = os.path.splitext(str(rels[rid].target_part.partname))[1] or ".png"
                    fname = f"img_{img_counter:02d}{ext}"
                    parts.append({"img": fname, "rid": rid})
        text = "".join(x for x in parts if isinstance(x, str)).strip()
        imgs = [x for x in parts if isinstance(x, dict)]
        if text or imgs:
            blocks.append({"text": text, "imgs": imgs})
    return blocks, rels


result = {}
for key, fname in FILES.items():
    path = os.path.join(BASE, fname)
    doc = Document(path)
    blocks, rels = iter_block_items(doc)
    asset_dir = os.path.join(OUT, key)
    if os.path.isdir(asset_dir):
        shutil.rmtree(asset_dir)
    os.makedirs(asset_dir, exist_ok=True)
    saved = {}
    for b in blocks:
        for im in b["imgs"]:
            if im["img"] not in saved:
                blob = rels[im["rid"]].target_part.blob
                with open(os.path.join(asset_dir, im["img"]), "wb") as f:
                    f.write(blob)
                saved[im["img"]] = len(blob)
            del im["rid"]
    result[key] = {"file": fname, "blocks": blocks, "images": saved}
    print(f"== {key} ({fname}): {len(blocks)} blocks, {len(saved)} images ==")

with open(os.path.join(BASE, "web", "content.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("done")
