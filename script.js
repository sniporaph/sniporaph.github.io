(function () {
  var ANONYMOUS_NAME = "Main YouTube (Collectibles)";
  var DATA_URL = "data/channels.json";
  var numberFormat = new Intl.NumberFormat("en-US");

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var lead = document.getElementById("view-lead");
    var exact = document.getElementById("view-exact");
    var list = document.getElementById("channel-list");

    fetch(DATA_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Channel file could not be loaded");
        }
        return response.json();
      })
      .then(function (channels) {
        if (!Array.isArray(channels)) {
          throw new Error("Channel file must be a list");
        }
        renderLead(channels, lead, exact);
        renderChannels(channels, list);
      })
      .catch(function () {
        lead.textContent = "Channel totals unavailable";
        exact.textContent = "Channel data could not be loaded.";
        list.replaceChildren();
      });
  }

  function renderLead(channels, lead, exact) {
    var total = channels.reduce(function (sum, channel) {
      var value = channel.channel_total_views_reported;
      return sum + (typeof value === "number" ? value : 0);
    }, 0);

    lead.replaceChildren();
    if (total <= 0) {
      lead.textContent = "No reported view totals yet";
      exact.textContent = "";
      return;
    }

    var about = formatAbout(total);
    var hot = document.createElement("span");
    hot.className = "hot-num";
    hot.textContent = about.endsWith("M") ? "About " + about : about;
    lead.append(hot, document.createTextNode(" total views across channels"));
    exact.textContent =
      numberFormat.format(total) +
      " reported views, summed from each channel total. TikTok @sniporaph is not included.";
  }

  function formatAbout(n) {
    if (n < 1000000) {
      return numberFormat.format(n);
    }
    var truncated = Math.floor((n / 1000000) * 100) / 100;
    var text = truncated.toFixed(2);
    if (text.endsWith("0")) {
      text = text.slice(0, -1);
    }
    if (text.endsWith(".0")) {
      text = text.slice(0, -2);
    }
    return text + "M";
  }

  function renderChannels(channels, list) {
    list.replaceChildren();
    channels.forEach(function (channel) {
      if (!channel || !channel.display_name) {
        return;
      }
      list.append(renderCard(channel));
    });
  }

  function renderCard(channel) {
    var card = document.createElement("article");
    card.className = "card";
    card.id = slug(channel.display_name);

    var head = document.createElement("div");
    head.className = "card-head";
    var title = document.createElement("h3");
    title.textContent = channel.display_name;
    head.append(title);
    if (channel.platform) {
      var badge = document.createElement("p");
      badge.className = "badge";
      badge.textContent = channel.platform;
      head.append(badge);
    }
    card.append(head);

    if (channel.niche) {
      var niche = document.createElement("p");
      niche.className = "niche";
      niche.textContent = channel.niche;
      card.append(niche);
    }

    if (statsComingSoon(channel)) {
      var soon = document.createElement("p");
      soon.className = "soon";
      soon.textContent = "Stats coming soon.";
      card.append(soon);
      return card;
    }

    var metrics = document.createElement("dl");
    metrics.className = "metrics";
    metrics.append(
      metric("Subscribers", formatCount(channel.followers)),
      metric("Posts", formatCount(postCount(channel))),
      metric("Total views", formatCount(totalViews(channel))),
      metric("Average views per post", formatAverage(channel))
    );
    card.append(metrics);
    card.append(renderTable(channel));
    return card;
  }

  function metric(label, value) {
    var wrap = document.createElement("div");
    var term = document.createElement("dt");
    term.textContent = label;
    var detail = document.createElement("dd");
    detail.textContent = value;
    wrap.append(term, detail);
    return wrap;
  }

  function statsComingSoon(channel) {
    return !Array.isArray(channel.posts);
  }

  function isAnonymous(channel) {
    return String(channel.display_name || "").trim() === ANONYMOUS_NAME;
  }

  function postCount(channel) {
    if (typeof channel.post_count === "number") {
      return channel.post_count;
    }
    if (Array.isArray(channel.posts)) {
      return channel.posts.length;
    }
    return null;
  }

  function totalViews(channel) {
    if (typeof channel.channel_total_views_reported === "number") {
      return channel.channel_total_views_reported;
    }
    if (typeof channel.total_views === "number") {
      return channel.total_views;
    }
    return null;
  }

  function formatCount(value) {
    if (typeof value !== "number") {
      return "Not listed";
    }
    return numberFormat.format(value);
  }

  function formatAverage(channel) {
    var value = channel.avg_views_per_post;
    if (typeof value !== "number") {
      if (!Array.isArray(channel.posts) || channel.posts.length === 0) {
        return "Not listed";
      }
      var sum = channel.posts.reduce(function (total, post) {
        return total + (typeof post.views === "number" ? post.views : 0);
      }, 0);
      value = sum / channel.posts.length;
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  function hasDate(post) {
    return !!(post && post.date != null && String(post.date).trim() !== "");
  }

  function isYouTubeUrl(value) {
    if (typeof value !== "string" || value.trim() === "") {
      return false;
    }
    try {
      var url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "www.youtube.com" ||
          url.hostname === "youtube.com" ||
          url.hostname === "youtu.be")
      );
    } catch (error) {
      return false;
    }
  }

  function renderTable(channel) {
    var posts = channel.posts.slice();
    var showDate = posts.some(hasDate);
    var sortKey = "views";
    var sortDir = "desc";
    var anonymous = isAnonymous(channel);

    var note = document.createElement("p");
    note.className = "table-note";
    note.textContent = "Scroll the list. Select a heading to sort.";

    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.tabIndex = 0;
    wrap.setAttribute(
      "aria-label",
      "Scrollable views per post for " + channel.display_name
    );

    var table = document.createElement("table");
    var caption = document.createElement("caption");
    caption.className = "visually-hidden";
    caption.textContent = "Views per post for " + channel.display_name;
    table.append(caption);

    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    var columns = [{ key: "title", label: "Title", numeric: false }];
    if (showDate) {
      columns.push({ key: "date", label: "Date", numeric: false });
    }
    columns.push({ key: "views", label: "Views", numeric: true });

    var headerCells = columns.map(function (column) {
      var cell = document.createElement("th");
      cell.scope = "col";
      cell.dataset.sort = column.key;
      if (column.numeric) {
        cell.className = "num";
      }
      if (column.key === "date") {
        cell.className = "date";
      }
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = column.label;
      button.addEventListener("click", function () {
        if (sortKey === column.key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = column.key;
          sortDir = column.key === "title" ? "asc" : "desc";
        }
        paint();
      });
      cell.append(button);
      return cell;
    });
    headRow.append.apply(headRow, headerCells);
    head.append(headRow);
    table.append(head);

    var body = document.createElement("tbody");
    table.append(body);
    wrap.append(table);

    function paint() {
      headerCells.forEach(function (cell) {
        var active = cell.dataset.sort === sortKey;
        cell.setAttribute(
          "aria-sort",
          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        );
        var button = cell.querySelector("button");
        button.setAttribute(
          "aria-label",
          active
            ? columnLabel(cell.dataset.sort) +
              ", sorted " +
              (sortDir === "asc" ? "ascending" : "descending")
            : "Sort by " + columnLabel(cell.dataset.sort)
        );
      });

      var sorted = posts.slice().sort(function (a, b) {
        return comparePosts(a, b, sortKey, sortDir);
      });
      body.replaceChildren();
      if (sorted.length === 0) {
        var emptyRow = document.createElement("tr");
        var emptyCell = document.createElement("td");
        emptyCell.colSpan = columns.length;
        emptyCell.textContent = "No posts listed.";
        emptyRow.append(emptyCell);
        body.append(emptyRow);
        return;
      }
      sorted.forEach(function (post) {
        body.append(renderRow(post, showDate, anonymous));
      });
    }

    paint();

    var fragment = document.createDocumentFragment();
    fragment.append(note, wrap);
    return fragment;
  }

  function columnLabel(key) {
    if (key === "title") return "title";
    if (key === "date") return "date";
    return "views";
  }

  function renderRow(post, showDate, anonymous) {
    var row = document.createElement("tr");
    var titleCell = document.createElement("td");
    var title = post && post.title ? String(post.title) : "Untitled";
    if (!anonymous && post && isYouTubeUrl(post.url)) {
      var link = document.createElement("a");
      link.href = post.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = title;
      titleCell.append(link);
    } else {
      titleCell.textContent = title;
    }
    row.append(titleCell);

    if (showDate) {
      var dateCell = document.createElement("td");
      dateCell.className = "date";
      if (hasDate(post)) {
        dateCell.textContent = String(post.date);
      } else {
        dateCell.setAttribute("aria-label", "Not listed");
      }
      row.append(dateCell);
    }

    var viewsCell = document.createElement("td");
    viewsCell.className = "num";
    viewsCell.textContent =
      post && typeof post.views === "number"
        ? numberFormat.format(post.views)
        : "Not listed";
    row.append(viewsCell);
    return row;
  }

  function comparePosts(a, b, key, dir) {
    var factor = dir === "asc" ? 1 : -1;
    if (key === "views") {
      return compareMissing(numberOrNull(a && a.views), numberOrNull(b && b.views), factor);
    }
    if (key === "date") {
      var aAge = ageInDays(a && a.date);
      var bAge = ageInDays(b && b.date);
      var aRecency = aAge == null ? null : -aAge;
      var bRecency = bAge == null ? null : -bAge;
      return compareMissing(aRecency, bRecency, factor);
    }
    var at = String((a && a.title) || "");
    var bt = String((b && b.title) || "");
    return at.localeCompare(bt, undefined, { sensitivity: "base", numeric: true }) * factor;
  }

  function numberOrNull(value) {
    return typeof value === "number" ? value : null;
  }

  function compareMissing(a, b, factor) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (a === b) return 0;
    return a < b ? -factor : factor;
  }

  function ageInDays(value) {
    if (value == null || String(value).trim() === "") return null;
    var match = String(value)
      .trim()
      .match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago$/i);
    if (!match) return null;
    var amount = Number(match[1]);
    var unit = match[2].toLowerCase();
    if (unit.indexOf("day") === 0) return amount;
    if (unit.indexOf("week") === 0) return amount * 7;
    if (unit.indexOf("month") === 0) return amount * 30;
    return amount * 365;
  }

  function slug(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
})();
