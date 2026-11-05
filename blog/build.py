#!/usr/bin/env python3
"""Generate the blog index, posts.json, and post pages from blog/posts/*.md."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POSTS = ROOT / "posts"
REPO = ROOT.parent

TAGS = {
    "case-study": "Case study",
    "tips": "Tips",
    "updates": "Updates",
}


def parse_post(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise SystemExit(f"{path} needs frontmatter")
    _, matter, body = text.split("---", 2)
    meta = {}
    for line in matter.strip().splitlines():
        if not line.strip() or ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("title", "date", "tag", "summary", "thumbnail", "slug"):
        if not meta.get(key):
            raise SystemExit(f"{path} is missing {key}")
    if meta["tag"] not in TAGS:
        raise SystemExit(f"{path} tag must be one of {', '.join(TAGS)}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta["date"]):
        raise SystemExit(f"{path} date must be YYYY-MM-DD")
    if meta.get("youtube") and not re.fullmatch(r"[A-Za-z0-9_-]{6,}", meta["youtube"]):
        raise SystemExit(f"{path} youtube must be a video id")
    meta["body"] = body.strip()
    meta["source"] = str(path.relative_to(REPO))
    return meta


def format_date(iso: str) -> str:
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    year, month, day = iso.split("-")
    return f"{months[int(month) - 1]} {int(day)}, {year}"


def inline(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\[(.+?)\]\((https?://[^\s)]+)\)", r'<a href="\2">\1</a>', escaped)
    return escaped


def markdown_to_html(body: str) -> str:
    blocks = re.split(r"\n\s*\n", body.strip())
    parts = []
    for block in blocks:
        lines = block.strip().splitlines()
        if not lines:
            continue
        if lines[0].startswith("## "):
            parts.append(f"<h2>{inline(lines[0][3:].strip())}</h2>")
            continue
        if lines[0].startswith("### "):
            parts.append(f"<h3>{inline(lines[0][4:].strip())}</h3>")
            continue
        if all(line.startswith("- ") for line in lines):
            items = "".join(f"<li>{inline(line[2:].strip())}</li>" for line in lines)
            parts.append(f"<ul>{items}</ul>")
            continue
        if all(re.match(r"\d+\. ", line) for line in lines):
            items = "".join(f"<li>{inline(re.sub(r'^\\d+\\.\\s+', '', line))}</li>" for line in lines)
            parts.append(f"<ol>{items}</ol>")
            continue
        parts.append(f"<p>{inline(' '.join(line.strip() for line in lines))}</p>")
    return "\n".join(parts)


def chrome(title: str, description: str, main: str, current: str) -> str:
    blog_current = ' aria-current="page"' if current == "blog" else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta name="theme-color" content="#07081a">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/blog/blog.css">
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  <header class="nav">
    <div class="wrap">
      <a class="brand" href="/">
        <img src="/assets/logo-wordmark-dark.svg" alt="Snipora" width="1600" height="600">
      </a>
      <nav class="links" aria-label="Page">
        <a href="/">Home</a>
        <a href="/#channels">Channels</a>
        <a href="/#work">Top Clips</a>
        <a href="/blog/"{blog_current}>Blog</a>
        <a href="/#contact">Contact</a>
      </nav>
      <a class="btn work" href="/#contact">Work with us</a>
    </div>
  </header>
  <main id="content">
{main}
  </main>
  <footer>
    <div class="wrap">
      <span>Snipora. Short-form clipping for brands.</span>
      <a href="mailto:sniporaph@gmail.com">sniporaph@gmail.com</a>
      <a href="/blog/">Blog</a>
    </div>
  </footer>
</body>
</html>
"""


def cta() -> str:
    return """
    <section class="wrap">
      <div class="blog-cta">
        <img src="/assets/icon.svg" alt="">
        <div class="copy">
          <strong>You film. Snipora grows it.</strong>
          <p>Short-form clipping and editing for YouTube Shorts, Instagram Reels and TikTok.</p>
        </div>
        <a class="btn" href="/#contact">Work with us</a>
      </div>
    </section>
"""


def card(post: dict) -> str:
    tag = TAGS[post["tag"]]
    return f"""
      <a class="post-card" data-tag="{html.escape(post["tag"])}" href="/blog/{html.escape(post["slug"])}/">
        <span class="thumb"><img src="{html.escape(post["thumbnail"])}" alt=""></span>
        <span class="card-body">
          <span class="tag tag-{html.escape(post["tag"])}">{html.escape(tag)}</span>
          <h2>{html.escape(post["title"])}</h2>
          <p class="date">{html.escape(format_date(post["date"]))}</p>
          <p class="summary">{html.escape(post["summary"])}</p>
        </span>
      </a>"""


def index_page(posts: list[dict]) -> str:
    cards = "\n".join(card(post) for post in posts)
    main = f"""
    <section class="page">
      <div class="wrap">
        <h1>Snipora <span class="grad">Blog</span></h1>
        <p class="lede">Clipping tips, case studies and growth updates.</p>
        <div class="chips" role="toolbar" aria-label="Filter posts">
          <button class="chip is-on" type="button" data-filter="all" aria-pressed="true">All</button>
          <button class="chip" type="button" data-filter="case-study" aria-pressed="false">Case Studies</button>
          <button class="chip" type="button" data-filter="tips" aria-pressed="false">Tips</button>
          <button class="chip" type="button" data-filter="updates" aria-pressed="false">Updates</button>
        </div>
        <div class="post-grid">
{cards}
        </div>
        <p class="empty" id="blog-empty" hidden>No posts in this filter.</p>
      </div>
    </section>
{cta()}
    <script src="/blog/blog.js"></script>
"""
    return chrome("Snipora Blog", "Clipping tips, case studies and growth updates.", main, "blog")


def post_page(post: dict) -> str:
    video = ""
    if post.get("youtube"):
        video_id = post["youtube"]
        video = f"""
        <div class="short-frame">
          <iframe src="https://www.youtube.com/embed/{html.escape(video_id)}" title="{html.escape(post["title"])}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>"""
    main = f"""
    <article class="article">
      <a class="tag tag-{html.escape(post["tag"])}" href="/blog/">{html.escape(TAGS[post["tag"]])}</a>
      <h1>{html.escape(post["title"])}</h1>
      <p class="date">{html.escape(format_date(post["date"]))}</p>
      {video}
      <div class="prose">
{markdown_to_html(post["body"])}
      </div>
    </article>
{cta()}
"""
    return chrome(f"{post['title']} | Snipora Blog", post["summary"], main, "blog")


def main() -> None:
    posts = [parse_post(path) for path in sorted(POSTS.glob("*.md"))]
    posts.sort(key=lambda post: post["date"], reverse=True)
    slugs = [post["slug"] for post in posts]
    if len(slugs) != len(set(slugs)):
        raise SystemExit("duplicate slug")

    (ROOT / "index.html").write_text(index_page(posts), encoding="utf-8")
    listing = []
    for post in posts:
        folder = ROOT / post["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(post_page(post), encoding="utf-8")
        listing.append({
            "title": post["title"],
            "date": post["date"],
            "tag": post["tag"],
            "summary": post["summary"],
            "thumbnail": post["thumbnail"],
            "slug": post["slug"],
            "url": f"/blog/{post['slug']}/",
        })
    (ROOT / "posts.json").write_text(json.dumps(listing, indent=2) + "\n", encoding="utf-8")
    # Drop generated folders whose slug is no longer in the source.
    for child in ROOT.iterdir():
        if child.is_dir() and (child / "index.html").exists() and child.name not in slugs and child.name != "posts":
            (child / "index.html").unlink()
            child.rmdir()
    print(f"built {len(posts)} posts")


if __name__ == "__main__":
    main()
