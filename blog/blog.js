(function () {
  var chips = document.querySelectorAll(".chip");
  var cards = document.querySelectorAll(".post-card");
  if (!chips.length) return;

  function apply(filter) {
    cards.forEach(function (card) {
      var show = filter === "all" || card.getAttribute("data-tag") === filter;
      card.hidden = !show;
    });
    chips.forEach(function (chip) {
      var on = chip.getAttribute("data-filter") === filter;
      chip.classList.toggle("is-on", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      apply(chip.getAttribute("data-filter"));
    });
  });
})();
