(function () {
  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function themeSwitchMarkup() {
    var sun =
      '<svg class="zb-theme-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.25"/><path fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" d="M12 2v2.5M12 19.5V22M4.5 12H2M22 12h-2.5M5.64 5.64l-1.77-1.77M20.13 20.13l-1.77-1.77M5.64 18.36l-1.77 1.77M20.13 3.87l-1.77 1.77"/></svg>';
    var moon =
      '<svg class="zb-theme-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
    return (
      '<button type="button" id="zaruba-theme-toggle" class="zb-theme-switch zb-tap" role="switch" aria-checked="true" aria-label="Тёмная тема">' +
      '<span class="zb-theme-lucide zb-theme-lucide--sun">' +
      sun +
      "</span>" +
      '<span class="zb-theme-switch-track"><span class="zb-theme-switch-thumb" aria-hidden="true"></span></span>' +
      '<span class="zb-theme-lucide zb-theme-lucide--moon">' +
      moon +
      "</span>" +
      "</button>"
    );
  }

  function syncThemeSwitch(btn) {
    if (!btn) return;
    var dark = document.documentElement.classList.contains("dark");
    btn.setAttribute("aria-checked", dark ? "true" : "false");
    btn.setAttribute("aria-label", dark ? "Тёмная тема" : "Светлая тема");
  }

  window.zarubaRenderHeader = function () {
    var mount = document.getElementById("zaruba-header");
    if (!mount) return;
    var uid = window.ZarubaSession.get();

    var headerShell =
      '<header class="zb-header">' +
      '<div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">' +
      '<a href="index.html" class="font-zb-display zb-tap flex items-center text-xl tracking-tight text-zb-accent sm:text-2xl">Zaruba</a>' +
      '<div class="flex items-center gap-2.5" id="zb-header-right"></div></div></header>';
    mount.innerHTML = headerShell;

    var rightEl = document.getElementById("zb-header-right");
    if (!uid) {
      rightEl.innerHTML = themeSwitchMarkup() +
        '<a href="login.html" class="zb-btn-primary px-5 py-2 text-sm">Войти</a>';
      bindThemeToggle();
      return;
    }

    mockDb.getUser(uid).then(function (user) {
      var chips = user ? String(user.chips) : "";
      var shopIcon =
        '<svg class="zb-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z M3 6h18 M16 10a4 4 0 0 1-8 0"/></svg>';
      rightEl.innerHTML = themeSwitchMarkup() +
        (user
          ? '<span class="zb-chip-balance hidden sm:inline-flex">' +
            '<span aria-hidden="true">🪙</span> ' +
            escapeHtml(chips) +
            "</span>" +
            '<a href="shop.html" class="zb-header-btn zb-tap" aria-label="Магазин" title="Магазин">' +
            shopIcon +
            "</a>" +
            '<a href="profile.html" class="zb-btn-primary px-4 py-2 text-sm">Я</a>'
          : '<a href="login.html" class="zb-btn-primary px-5 py-2 text-sm">Войти</a>');
      bindThemeToggle();
    }).catch(function () {
      rightEl.innerHTML = themeSwitchMarkup() +
        '<a href="login.html" class="zb-btn-primary px-5 py-2 text-sm">Войти</a>';
      bindThemeToggle();
    });
  };

  function bindThemeToggle() {
    var btn = document.getElementById("zaruba-theme-toggle");
    syncThemeSwitch(btn);
    if (btn) {
      btn.addEventListener("click", function () {
        var html = document.documentElement;
        var dark = html.classList.toggle("dark");
        localStorage.setItem("zaruba-theme", dark ? "dark" : "light");
        syncThemeSwitch(btn);
        window.dispatchEvent(new CustomEvent("zaruba-theme-change"));
      });
    }
  }

  window.zarubaRenderBottomNav = function (active) {
    var mount = document.getElementById("zaruba-bottom-nav");
    if (!mount) return;
    var uid = ZarubaSession.get();
    var profHref = uid ? "profile.html" : "login.html";

    var icon = function (pathD) {
      return (
        '<svg class="zb-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        pathD +
        '"/></svg>'
      );
    };

    var item = function (key, href, label, pathD) {
      var on = active === key;
      return (
        '<a href="' +
        href +
        '" class="zb-nav-item" data-active="' +
        (on ? "true" : "false") +
        '" ' +
        (on ? 'aria-current="page" ' : "") +
        ">" +
        '<span class="zb-nav-icon-wrap">' +
        icon(pathD) +
        "</span>" +
        "<span>" +
        label +
        "</span></a>"
      );
    };

    var dHome =
      "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10";
    var dShop =
      "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z M3 6h18 M16 10a4 4 0 0 1-8 0";
    var dUser = "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";

    mount.innerHTML =
      '<nav class="zb-nav zb-nav-shell fixed bottom-0 left-0 right-0 z-40" aria-label="Основное меню">' +
      '<div class="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-3 pt-1">' +
      item("home", "index.html", "Главная", dHome) +
      item("shop", "shop.html", "Магазин", dShop) +
      item("profile", profHref, "Профиль", dUser) +
      "</div></nav>";
  };

  window.zarubaInitTheme = function () {
    var stored = localStorage.getItem("zaruba-theme");
    var dark = stored ? stored === "dark" : true;
    document.documentElement.classList.toggle("dark", dark);
  };
})();
