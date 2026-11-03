(function () {
  var ANON = "Main YouTube (Collectibles)";
  var FRESH = {
    "Podcast Masters": "Podcast clips for YouTube Shorts, Reels and TikTok.",
    "Clipz Masturrz": "Creator-style viral clips for YouTube Shorts, Reels and TikTok.",
    "Snipora (@sniporaph)": "Snipora on TikTok."
  };

  var full = new Intl.NumberFormat("en-US");
  var channels = [];
  var dialog = document.getElementById("channel-dialog");
  var dialogBody = document.getElementById("dialog-body");

  document.documentElement.classList.add("js");
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupReveal();
    document.getElementById("dialog-close").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeDialog();
    });
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);

    fetch("data/channels.json")
      .then(function (response) {
        if (!response.ok) throw new Error("missing");
        return response.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("shape");
        channels = data.filter(function (channel) {
          return channel && channel.display_name;
        });
        renderHero();
        renderClips();
        renderProven();
        renderFresh();
        syncHash();
      })
      .catch(function () {
        document.getElementById("hero-stat").textContent = "Views unavailable";
        document.getElementById("hero-exact").textContent = "Channel data could not be loaded.";
        document.getElementById("clip-row").textContent = "Clips could not be loaded.";
      });
  }

  function setupReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-in"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    nodes.forEach(function (node) { observer.observe(node); });
  }

  function isAnon(channel) {
    return String(channel.display_name || "").trim() === ANON;
  }

  function isFresh(channel) {
    return Object.prototype.hasOwnProperty.call(FRESH, channel.display_name);
  }

  function postsOf(channel) {
    return Array.isArray(channel.posts) ? channel.posts : [];
  }

  function reportedViews(channel) {
    return typeof channel.channel_total_views_reported === "number"
      ? channel.channel_total_views_reported
      : null;
  }

  function postCount(channel) {
    if (typeof channel.post_count === "number") return channel.post_count;
    var posts = postsOf(channel);
    return posts.length ? posts.length : null;
  }

  function averageViews(channel) {
    if (typeof channel.avg_views_per_post === "number") return channel.avg_views_per_post;
    var posts = postsOf(channel);
    if (!posts.length) return null;
    var sum = posts.reduce(function (total, post) {
      return total + (typeof post.views === "number" ? post.views : 0);
    }, 0);
    return sum / posts.length;
  }

  function shortsOf(channel) {
    return postsOf(channel)
      .filter(function (post) { return post && post.type === "short" && typeof post.views === "number"; })
      .slice()
      .sort(function (a, b) { return b.views - a.views; });
  }

  function renderHero() {
    var total = channels.reduce(function (sum, channel) {
      var value = reportedViews(channel);
      return sum + (value || 0);
    }, 0);
    var hero = document.getElementById("hero-stat");
    var exact = document.getElementById("hero-exact");
    if (!total) {
      hero.textContent = "Views unavailable";
      exact.textContent = "";
      return;
    }
    var millions = Math.floor((total / 1000000) * 100) / 100;
    hero.textContent = trimNum(millions) + "M+";
    exact.textContent = full.format(total) + " reported views. TikTok @sniporaph is not included.";
  }

  function renderClips() {
    var row = document.getElementById("clip-row");
    var pool = [];
    channels.forEach(function (channel) {
      shortsOf(channel).forEach(function (post) {
        pool.push({ channel: channel, post: post });
      });
    });
    pool.sort(function (a, b) { return b.post.views - a.post.views; });
    row.replaceChildren();
    pool.slice(0, 5).forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "clip-card";
      var views = document.createElement("p");
      views.className = "clip-views";
      views.textContent = compact(item.post.views);
      var title = document.createElement("p");
      title.className = "clip-title";
      title.textContent = cleanTitle(item.post.title, 78);
      var label = document.createElement("p");
      label.className = "clip-channel";
      label.textContent = item.channel.display_name;
      button.append(views, title, label);
      button.addEventListener("click", function () {
        openChannel(item.channel, true);
      });
      row.append(button);
    });
  }

  function renderProven() {
    var grid = document.getElementById("channel-grid");
    var proven = channels.filter(function (channel) { return !isFresh(channel) && postsOf(channel).length; });
    proven.sort(function (a, b) { return (reportedViews(b) || 0) - (reportedViews(a) || 0); });
    grid.replaceChildren();
    proven.forEach(function (channel) { grid.append(channelCard(channel)); });
  }

  function channelCard(channel) {
    var card = document.createElement("article");
    card.className = "channel-card reveal is-in";
    card.id = slug(channel.display_name);

    var kicker = document.createElement("div");
    kicker.className = "card-kicker";
    if (channel.platform) {
      var badge = document.createElement("p");
      badge.className = "badge";
      badge.textContent = channel.platform;
      kicker.append(badge);
    }
    card.append(kicker);

    var title = document.createElement("h3");
    title.textContent = channel.display_name;
    card.append(title);

    if (channel.niche) {
      var niche = document.createElement("p");
      niche.className = "niche";
      niche.textContent = channel.niche;
      card.append(niche);
    }

    var stats = document.createElement("div");
    stats.className = "stat-row";
    stats.append(
      stat(compact(reportedViews(channel)), "Total views"),
      stat(compact(postCount(channel)), "Posts"),
      stat(compact(averageViews(channel)), "Avg / post")
    );
    card.append(stats);

    var shorts = shortsOf(channel).slice(0, 3);
    if (shorts.length) {
      var label = document.createElement("p");
      label.className = "shorts-label";
      label.textContent = "Top Shorts";
      card.append(label);
      card.append(featureShort(shorts[0], shorts[0].views));
      if (shorts.length > 1) card.append(shortList(shorts.slice(1), shorts[0].views));
    }

    var cue = document.createElement("p");
    cue.className = "view-all";
    cue.textContent = "View all posts";
    card.append(cue);

    var hit = document.createElement("button");
    hit.type = "button";
    hit.className = "card-hit";
    var hidden = document.createElement("span");
    hidden.textContent = "View all posts for " + channel.display_name;
    hit.append(hidden);
    hit.addEventListener("click", function () { openChannel(channel, true); });
    card.append(hit);
    return card;
  }

  function stat(value, label) {
    var wrap = document.createElement("div");
    var strong = document.createElement("p");
    strong.className = "stat-value";
    strong.textContent = value;
    var name = document.createElement("p");
    name.className = "stat-label";
    name.textContent = label;
    wrap.append(strong, name);
    return wrap;
  }

  function featureShort(post, max) {
    var block = document.createElement("div");
    block.className = "feature-short";
    var views = document.createElement("p");
    views.className = "short-views";
    views.textContent = compact(post.views);
    var title = document.createElement("p");
    title.textContent = cleanTitle(post.title, 90);
    block.append(views, title, bar(post.views, max));
    return block;
  }

  function shortList(posts, max) {
    var list = document.createElement("ul");
    list.className = "short-list";
    posts.forEach(function (post) {
      var item = document.createElement("li");
      var title = document.createElement("p");
      title.className = "short-title";
      title.textContent = cleanTitle(post.title, 72);
      var views = document.createElement("p");
      views.className = "short-views";
      views.textContent = compact(post.views);
      item.append(title, views, bar(post.views, max));
      list.append(item);
    });
    return list;
  }

  function bar(views, max) {
    var track = document.createElement("div");
    track.className = "bar";
    track.setAttribute("aria-hidden", "true");
    var fill = document.createElement("span");
    var pct = max > 0 ? Math.max(0, (views / max) * 100) : 0;
    fill.style.width = pct + "%";
    track.append(fill);
    return track;
  }

  function renderFresh() {
    var grid = document.getElementById("fresh-grid");
    var order = ["Podcast Masters", "Clipz Masturrz", "Snipora (@sniporaph)"];
    grid.replaceChildren();
    order.forEach(function (name) {
      var channel = channels.find(function (item) { return item.display_name === name; });
      if (channel) grid.append(freshCard(channel));
    });
  }

  function freshCard(channel) {
    var card = document.createElement("article");
    card.className = "fresh-card reveal is-in";
    if (!postsOf(channel).length) card.classList.add("fresh-card-soon");
    card.id = slug(channel.display_name);

    var status = document.createElement("p");
    status.className = "status";
    status.textContent = "Warming up";
    card.append(status);

    var title = document.createElement("h3");
    title.textContent = channel.display_name;
    card.append(title);

    if (channel.platform) {
      var badge = document.createElement("p");
      badge.className = "badge";
      badge.textContent = channel.platform;
      card.append(badge);
    }
    if (channel.niche) {
      var niche = document.createElement("p");
      niche.className = "niche";
      niche.textContent = channel.niche;
      card.append(niche);
    }
    var line = document.createElement("p");
    line.className = "fresh-line";
    line.textContent = FRESH[channel.display_name];
    card.append(line);

    var count = shortCount(channel);
    var subtle = document.createElement("p");
    subtle.className = "subtle-count";
    subtle.textContent = count || "Stats coming soon.";
    card.append(subtle);

    var link = document.createElement("a");
    link.className = "launch";
    link.href = "#contact";
    link.textContent = "Launch your campaign here";
    card.append(link);
    return card;
  }

  function shortCount(channel) {
    var posts = postsOf(channel);
    if (!posts.length) return null;
    var count = postCount(channel);
    var shorts = posts.filter(function (post) { return post && post.type === "short"; }).length;
    if (shorts === posts.length) {
      return count + (count === 1 ? " Short posted" : " Shorts posted");
    }
    return count + " posts";
  }

  function openChannel(channel, updateHash) {
    if (!channel || isFresh(channel)) return;
    renderDialog(channel);
    if (!dialog.open) dialog.showModal();
    var next = "#channel=" + slug(channel.display_name);
    if (updateHash && location.hash !== next) {
      history.pushState(null, "", next);
    }
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    if (location.hash.indexOf("#channel=") === 0) {
      history.pushState(null, "", location.pathname + location.search);
    }
  }

  function syncHash() {
    var match = location.hash.match(/^#channel=([a-z0-9-]+)$/);
    if (!match) {
      if (dialog.open) dialog.close();
      return;
    }
    var channel = channels.find(function (item) { return slug(item.display_name) === match[1]; });
    if (!channel || isFresh(channel)) {
      if (dialog.open) dialog.close();
      return;
    }
    openChannel(channel, false);
  }

  function renderDialog(channel) {
    dialogBody.replaceChildren();
    var kicker = document.createElement("div");
    kicker.className = "dialog-kicker";
    if (channel.platform) {
      var badge = document.createElement("p");
      badge.className = "badge";
      badge.textContent = channel.platform;
      kicker.append(badge);
    }
    var title = document.createElement("h2");
    title.id = "dialog-title";
    title.textContent = channel.display_name;
    var niche = document.createElement("p");
    niche.className = "niche";
    niche.textContent = channel.niche || "";

    var stats = document.createElement("div");
    stats.className = "dialog-stats";
    stats.append(
      exactStat("Subscribers", channel.followers),
      exactStat("Posts", postCount(channel)),
      exactStat("Total views", reportedViews(channel)),
      exactStat("Average views per post", averageViews(channel))
    );

    var posts = postsOf(channel).slice().sort(function (a, b) {
      return (b.views || 0) - (a.views || 0);
    });
    var max = posts.reduce(function (top, post) {
      return Math.max(top, typeof post.views === "number" ? post.views : 0);
    }, 0);
    var list = document.createElement("ol");
    list.className = "post-list";
    posts.forEach(function (post) {
      list.append(postRow(channel, post, max));
    });

    dialogBody.append(kicker, title, niche, stats, list);
  }

  function exactStat(label, value) {
    var wrap = document.createElement("div");
    wrap.className = "dialog-stat";
    var name = document.createElement("span");
    name.textContent = label;
    var strong = document.createElement("strong");
    if (typeof value === "number") {
      var digits = Number.isInteger(value) ? 0 : 1;
      strong.textContent = new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
    } else {
      strong.textContent = "Not listed";
    }
    wrap.append(name, strong);
    return wrap;
  }

  function postRow(channel, post, max) {
    var item = document.createElement("li");
    var meta = document.createElement("div");
    meta.className = "post-meta";
    var titleText = cleanTitle(post.title, 110);
    var titleNode;
    if (!isAnon(channel) && isYouTubeUrl(post.url)) {
      titleNode = document.createElement("a");
      titleNode.href = post.url;
      titleNode.target = "_blank";
      titleNode.rel = "noopener noreferrer";
      titleNode.textContent = titleText;
    } else {
      titleNode = document.createElement("span");
      titleNode.textContent = titleText;
    }
    var views = document.createElement("span");
    views.className = "post-views";
    views.textContent = typeof post.views === "number" ? full.format(post.views) : "Not listed";
    meta.append(titleNode, views);
    item.append(meta);
    if (typeof post.views === "number") item.append(bar(post.views, max));
    var bits = [];
    if (post.type === "short") bits.push("Short");
    else if (post.type === "video") bits.push("Video");
    if (post.date) bits.push(String(post.date));
    if (bits.length) {
      var sub = document.createElement("p");
      sub.className = "post-sub";
      sub.textContent = bits.join(" · ");
      item.append(sub);
    }
    return item;
  }

  function isYouTubeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
      var url = new URL(value);
      return url.protocol === "https:" &&
        (url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "youtu.be");
    } catch (error) {
      return false;
    }
  }

  function cleanTitle(raw, limit) {
    var text = String(raw || "");
    text = text.replace(/#\[channel\]/gi, " ");
    text = text.replace(/\[channel\]/gi, " ");
    text = text.replace(/#[^\s#]+/g, " ");
    text = text.replace(/\p{Extended_Pictographic}/gu, " ");
    text = text.replace(/[\uFE0F\u200D]/g, "");
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
    if (!text) return "Untitled";
    if (text.length > limit) {
      var cut = text.slice(0, limit);
      var last = cut.lastIndexOf(" ");
      text = (last > 40 ? cut.slice(0, last) : cut).trim() + "...";
    }
    return text;
  }

  function compact(value) {
    if (typeof value !== "number" || !isFinite(value)) return "Not listed";
    var abs = Math.abs(value);
    if (abs >= 1000000) return trimNum(Math.round((value / 1000000) * 100) / 100) + "M";
    if (abs >= 1000) {
      var thousands = value / 1000;
      var rounded = abs >= 100000 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return trimNum(rounded) + "K";
    }
    if (Number.isInteger(value)) return full.format(value);
    return trimNum(Math.round(value * 10) / 10);
  }

  function trimNum(value) {
    return String(value).replace(/\.0$/, "");
  }

  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
})();
