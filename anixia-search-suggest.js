(() => {
  "use strict";

  const typeLabels = {
    anime: "作品",
    person: "声優・スタッフ",
    character: "キャラクター",
    studio: "制作会社",
    organization: "組織"
  };

  function attach(input, type, submitForm) {
    if (!input || input.dataset.suggestReady === "true") return;
    const host = input.closest(".anixia-field") || input.closest("form");
    if (!host) return;

    host.classList.add("anixia-suggest-host");
    input.dataset.suggestReady = "true";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-haspopup", "listbox");

    const panel = document.createElement("div");
    panel.className = "anixia-suggest";
    panel.id = "anixia-suggest-" + input.id;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "検索候補");
    panel.hidden = true;
    host.appendChild(panel);
    input.setAttribute("aria-controls", panel.id);
    input.setAttribute("aria-expanded", "false");

    let debounceId = 0;
    let requestVersion = 0;

    function hide() {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-busy");
    }

    function showMessage(message) {
      panel.replaceChildren();
      const note = document.createElement("div");
      note.className = "anixia-suggest-empty";
      note.textContent = message;
      panel.appendChild(note);
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function choose(item) {
      input.value = item.label || "";
      hide();
      if (typeof submitForm === "function") submitForm();
    }

    function render(items) {
      panel.replaceChildren();
      if (!items.length) {
        showMessage("候補が見つかりません");
        return;
      }

      items.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "anixia-suggest-item";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", "false");
        button.dataset.index = String(index);

        const copy = document.createElement("span");
        copy.className = "anixia-suggest-copy";
        const label = document.createElement("strong");
        label.textContent = item.label || "";
        const detail = document.createElement("small");
        detail.textContent = item.detail || "";
        copy.append(label, detail);

        const category = document.createElement("span");
        category.className = "anixia-suggest-type";
        category.textContent = typeLabels[item.suggestion_type] || "候補";

        button.append(copy, category);
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", () => choose(item));
        button.addEventListener("keydown", event => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            const next = button.nextElementSibling;
            if (next && next.matches("button")) next.focus();
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            const previous = button.previousElementSibling;
            if (previous && previous.matches("button")) previous.focus();
            else input.focus();
          } else if (event.key === "Escape") {
            event.preventDefault();
            hide();
            input.focus();
          }
        });
        panel.appendChild(button);
      });

      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    async function loadSuggestions() {
      const term = input.value.trim();
      const version = ++requestVersion;
      if (term.length < 2 || !window.ANIXIA || typeof window.ANIXIA.suggestCatalog !== "function") {
        hide();
        return;
      }

      input.setAttribute("aria-busy", "true");
      try {
        const items = await window.ANIXIA.suggestCatalog(term, type, 10);
        if (version !== requestVersion) return;
        render(items);
      } catch (error) {
        if (version === requestVersion) hide();
        console.warn("ANIXIA search suggestions unavailable", error);
      } finally {
        if (version === requestVersion) input.removeAttribute("aria-busy");
      }
    }

    input.addEventListener("input", () => {
      window.clearTimeout(debounceId);
      if (input.value.trim().length < 2) {
        requestVersion++;
        hide();
        return;
      }
      debounceId = window.setTimeout(loadSuggestions, 240);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length >= 2) {
        window.clearTimeout(debounceId);
        debounceId = window.setTimeout(loadSuggestions, 80);
      }
    });

    input.addEventListener("keydown", event => {
      if (event.key === "ArrowDown" && !panel.hidden) {
        const first = panel.querySelector("button");
        if (first) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === "Escape") {
        requestVersion++;
        hide();
      }
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!host.contains(document.activeElement)) hide();
      }, 140);
    });

    const form = input.closest("form");
    if (form) form.addEventListener("submit", () => {
      requestVersion++;
      hide();
    });

    document.addEventListener("pointerdown", event => {
      if (!host.contains(event.target)) {
        requestVersion++;
        hide();
      }
    });
  }

  function init() {
    const heroForm = document.getElementById("hero-search");
    const filterForm = document.getElementById("filter-form");
    attach(document.getElementById("search-input"), "all", () => heroForm?.requestSubmit());
    attach(document.getElementById("query"), "all", () => filterForm?.requestSubmit());
    attach(document.getElementById("person"), "person", () => filterForm?.requestSubmit());
    attach(document.getElementById("character"), "character", () => filterForm?.requestSubmit());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
