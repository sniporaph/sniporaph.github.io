# Snipora blog

Posts live in `blog/posts/` as Markdown. The index, `posts.json`, and each post page are generated. Do not hand-edit `blog/index.html`, `blog/posts.json`, or `blog/<slug>/index.html`.

## Add a post

1. Add a thumbnail under `blog/thumbs/` (SVG, JPG, or PNG). Use a site-relative path such as `/blog/thumbs/my-art.svg`.
2. Create `blog/posts/your-slug.md` with this frontmatter:

```markdown
---
title: Post title
date: 2026-11-05
tag: tips
summary: One sentence for the card.
thumbnail: /blog/thumbs/my-art.svg
slug: your-slug
youtube: VIDEO_ID
---

The article starts here.

## A section

Paragraphs are separated by a blank line. Use `- ` for a list and `## ` for a heading.
```

`tag` must be `case-study`, `tips`, or `updates`. `date` must be `YYYY-MM-DD`. `youtube` is optional and must be a YouTube video id that is already used on the site. Do not add a channel URL that the portfolio does not already publish.

3. From the repo root, run:

```bash
python3 blog/build.py
```

4. Commit the Markdown file, the thumbnail, and the generated files (`blog/index.html`, `blog/posts.json`, and `blog/<slug>/index.html`).

The Blog link in the nav is active on every blog page. Filters on `/blog/` read the `tag` on each card.
