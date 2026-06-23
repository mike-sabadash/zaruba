(function () {
  var mapInstance = null;
  var yandexMap = null;
  var lastMapView = { lng: 37.62, lat: 55.75, zoom: 11 };

  function snapshotMapView() {
    if (mapInstance && typeof mapInstance.getCenter === "function") {
      try {
        var c = mapInstance.getCenter();
        lastMapView = { lng: c.lng, lat: c.lat, zoom: mapInstance.getZoom() };
      } catch (e) {}
    } else if (yandexMap && typeof yandexMap.getCenter === "function") {
      try {
        var c2 = yandexMap.getCenter();
        lastMapView = { lng: c2[1], lat: c2[0], zoom: yandexMap.getZoom() };
      } catch (e2) {}
    }
  }

  function destroyMapInstances() {
    snapshotMapView();
    if (mapInstance) {
      try { mapInstance.remove(); } catch (e) {}
      mapInstance = null;
    }
    if (yandexMap) {
      try { yandexMap.destroy(); } catch (e2) {}
      yandexMap = null;
    }
  }

  function getYandexApiKey() {
    var k = (window.ZARUBA_YANDEX_API_KEY && String(window.ZARUBA_YANDEX_API_KEY).trim()) || "";
    if (k) return k;
    try {
      return (localStorage.getItem("zaruba_yandex_api_key") || "").trim();
    } catch (e) { return ""; }
  }

  function renderMapPlaceholder(container) {
    destroyMapInstances();
    container.innerHTML =
      '<div class="zb-map-placeholder">' +
      '<p class="text-base font-semibold text-zinc-900 dark:text-white">Яндекс.Карты</p>' +
      '<p class="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">Вставьте ключ <strong>JavaScript API</strong> в файл <code>js/constants.js</code> → <code>ZARUBA_YANDEX_API_KEY</code>, либо в консоли браузера:</p>' +
      '<code class="block max-w-full break-all text-left text-xs text-zinc-700 dark:text-zinc-300">localStorage.setItem("zaruba_yandex_api_key","ВАШ_КЛЮЧ"); location.reload()</code>' +
      '<a class="text-sm font-semibold text-zb-accent underline decoration-zb-accent/40 underline-offset-2 hover:opacity-90" href="https://developer.tech.yandex.ru/services/" target="_blank" rel="noreferrer">Кабинет разработчика Яндекса</a>' +
      "</div>";
  }

  function ensureYandexScript(apiKey, onDone) {
    if (window.ymaps) { onDone(); return; }
    var existing = document.getElementById("zaruba-yandex-maps-script");
    if (existing) {
      var n = 0;
      var t = window.setInterval(function () {
        if (window.ymaps) { window.clearInterval(t); onDone(); }
        else if (++n > 120) { window.clearInterval(t); onDone(); }
      }, 50);
      return;
    }
    var s = document.createElement("script");
    s.id = "zaruba-yandex-maps-script";
    s.async = true;
    s.src = "https://api-maps.yandex.ru/2.1/?apikey=" + encodeURIComponent(apiKey) + "&lang=ru_RU";
    s.onload = onDone;
    s.onerror = onDone;
    document.head.appendChild(s);
  }

  function paintYandexMarkers(locs, zarubas) {
    if (!yandexMap || !window.ymaps) return;
    yandexMap.geoObjects.removeAll();
    locs.forEach(function (l) {
      var pm = new ymaps.Placemark([l.lat, l.lng], { hintContent: l.name },
        { preset: "islands#circleIcon", iconColor: "#71717a" });
      yandexMap.geoObjects.add(pm);
    });
    zarubas.forEach(function (z) {
      var l = locs.find(function (x) { return x.id === z.locationId; });
      if (!l) return;
      var href = "zaruba.html?id=" + encodeURIComponent(z.id);
      var hint = "Заруба — " + locName(locs, z.locationId);
      var pm = new ymaps.Placemark([l.lat, l.lng], { hintContent: hint },
        { preset: "islands#circleDotIcon", iconColor: z.status === "live" ? "#dc2626" : "#ea580c" });
      pm.events.add("click", function () { window.location.href = href; });
      yandexMap.geoObjects.add(pm);
    });
  }

  function locName(locs, id) {
    var l = locs.find(function (x) { return x.id === id; });
    return l ? l.name : "Площадка";
  }

  function renderDaily(user) {
    var el = document.getElementById("zaruba-daily");
    if (!el) return;
    el.innerHTML = user ? zarubaDailyBannerHtml(user) : "";
    el.classList.toggle("hidden", !user);
  }

  function hideSkeleton() {
    var sk = document.getElementById("zaruba-feed-skeleton");
    if (sk) sk.classList.add("hidden");
  }

  function renderFeed(locs, list) {
    var el = document.getElementById("zaruba-feed");
    if (!el) return;
    hideSkeleton();
    if (list.length === 0) {
      el.innerHTML =
        '<div class="zb-glass rounded-2xl border border-dashed border-zb-accent-soft p-8 text-center">' +
        '<p class="text-4xl">⚽</p>' +
        '<p class="mt-2 text-lg font-bold text-zinc-900 dark:text-white">Пока тихо на районе</p>' +
        '<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Создай первую Зарубу — собери команду и фанатов.</p>' +
        '<button type="button" id="empty-create" class="zb-tap zb-btn-primary mt-4 px-6 py-3 text-sm shadow-zb">+ Забить Зарубу</button></div>';
      var ec = document.getElementById("empty-create");
      if (ec) {
        ec.onclick = function () {
          var uid = ZarubaSession.get();
          if (!uid) window.location.href = "login.html";
          else openSheet(true);
        };
      }
      return;
    }
    el.innerHTML = list
      .map(function (z) {
        var st =
          z.status === "live"
            ? '<span class="zb-live-pulse rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Live</span>'
            : z.status === "finished"
              ? '<span class="rounded-full bg-zinc-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Итог</span>'
              : '<span class="rounded-full bg-zb-accent px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">Скоро</span>';
        var score =
          z.status === "finished"
            ? '<span class="tabular-nums">' + z.scoreA + " : " + z.scoreB + "</span>"
            : '<span class="text-zinc-400">— : —</span>';
        return (
          '<a href="zaruba.html?id=' + encodeURIComponent(z.id) + '" class="zb-card zb-glass block p-6 sm:p-7">' +
          '<div class="flex justify-between gap-2"><div>' +
          '<p class="zb-eyebrow zb-eyebrow-accent text-[11px] tracking-widest">' + window.zarubaSportLabel(z.sport) + "</p>" +
          '<h3 class="font-zb-display mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">' + locName(locs, z.locationId) + "</h3>" +
          '<p class="text-sm text-zinc-600 dark:text-zinc-400">' + window.zarubaFormatDateTime(z.startsAt) + "</p></div>" + st + "</div>" +
          '<p class="mt-2 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">' + (z.description || "Без описания — заходи разберёмся в коробе") + "</p>" +
          '<div class="mt-5 flex items-center justify-between">' +
          '<span class="font-zb-display text-3xl font-bold tabular-nums text-zb-accent">' + score + "</span>" +
          '<span class="text-xl text-zb-accent">→</span></div></a>'
        );
      })
      .join("");
  }

  function renderLeaderboard(rows) {
    var el = document.getElementById("zaruba-lb");
    if (!el) return;
    if (rows.length === 0) {
      el.innerHTML = '<li class="text-sm text-zinc-500">Залетай первым — качай харизму.</li>';
      return;
    }
    var medals = ["🥇", "🥈", "🥉", "4", "5"];
    el.innerHTML = rows.map(function (u, i) {
      return '<li class="flex items-center justify-between gap-2 rounded-xl border border-black/5 bg-white/50 px-3 py-2.5 dark:border-white/10 dark:bg-black/25">' +
        '<span class="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">' +
        '<span class="w-6 text-center text-lg">' + (medals[i] || i + 1) + "</span>" + u.nickname + "</span>" +
        '<span class="shrink-0 rounded-lg bg-zb-accent-muted px-2 py-0.5 text-xs font-black text-zb-accent">' + u.charismaTotal + " XP</span></li>";
    }).join("");
  }

  function paintMapMarkers(locs, zarubas) {
    if (yandexMap) { paintYandexMarkers(locs, zarubas); return; }
    if (!mapInstance || !mapInstance.loaded()) return;
    mapInstance.getContainer().querySelectorAll(".zaruba-m").forEach(function (n) { n.remove(); });
    locs.forEach(function (l) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "zaruba-m flex size-9 items-center justify-center rounded-full border border-white bg-zinc-800 text-xs text-white shadow-lg";
      el.textContent = "▣";
      el.title = l.name;
      new maplibregl.Marker({ element: el }).setLngLat([l.lng, l.lat]).addTo(mapInstance);
    });
    zarubas.forEach(function (z) {
      var l = locs.find(function (x) { return x.id === z.locationId; });
      if (!l) return;
      var a = document.createElement("a");
      a.href = "zaruba.html?id=" + encodeURIComponent(z.id);
      a.className = "zaruba-m flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/80 bg-gradient-to-br from-orange-500 to-orange-700 px-2 text-sm font-black text-white shadow-zb" +
        (z.status === "live" ? " zb-live-pulse" : "");
      a.textContent = z.status === "live" ? "🔥" : "⚽";
      new maplibregl.Marker({ element: a }).setLngLat([l.lng, l.lat]).addTo(mapInstance);
    });
  }

  function initMaplibreInternal(container, locs, zarubas) {
    if (typeof maplibregl === "undefined") return;
    var cfg = window.ZARUBA_MAP;
    if (!cfg) return;
    var dark = document.documentElement.classList.contains("dark");
    var tiles = dark ? cfg.tilesDark : cfg.tilesLight;
    if (!tiles || !tiles.length) return;
    destroyMapInstances();
    container.innerHTML = "";
    mapInstance = new maplibregl.Map({
      container: container,
      style: {
        version: 8,
        sources: { basemap: { type: "raster", tiles: tiles, tileSize: 256, attribution: cfg.attribution } },
        layers: [{ id: "basemap", type: "raster", source: "basemap", minzoom: 0, maxzoom: 20 }],
      },
      center: [lastMapView.lng, lastMapView.lat],
      zoom: lastMapView.zoom,
    });
    mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapInstance.on("load", function () { paintMapMarkers(locs, zarubas); });
  }

  function initMap(locs, zarubas) {
    var container = document.getElementById("zaruba-map");
    if (!container) return;
    var key = getYandexApiKey();
    if (!key) { renderMapPlaceholder(container); return; }
    destroyMapInstances();
    ensureYandexScript(key, function () {
      if (!window.ymaps) {
        if (typeof maplibregl !== "undefined") initMaplibreInternal(container, locs, zarubas);
        else renderMapPlaceholder(container);
        return;
      }
      ymaps.ready(function () {
        try {
          container.innerHTML = "";
          yandexMap = new ymaps.Map(container,
            { center: [lastMapView.lat, lastMapView.lng], zoom: lastMapView.zoom, controls: ["zoomControl"], type: "yandex#map" },
            { suppressMapOpenBlock: true });
          paintYandexMarkers(locs, zarubas);
        } catch (err) {
          console.warn("Zaruba: Yandex map init failed, fallback MapLibre", err);
          yandexMap = null;
          if (typeof maplibregl !== "undefined") initMaplibreInternal(container, locs, zarubas);
          else renderMapPlaceholder(container);
        }
      });
    });
  }

  function renderLiveStrip(locs, zarubas) {
    var wrap = document.getElementById("zaruba-live-strip-wrap");
    if (!wrap) return;
    var live = zarubas.filter(function (z) { return z.status === "live"; });
    if (live.length === 0) { wrap.innerHTML = ""; wrap.classList.add("hidden"); return; }
    wrap.classList.remove("hidden");
    wrap.innerHTML =
      '<div class="mb-2 flex items-center justify-between gap-2 px-1">' +
      '<p class="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500/90">Сейчас в эфире</p>' +
      '<span class="zb-live-dot" aria-hidden="true"></span></div>' +
      '<div class="zb-hide-scrollbar flex gap-3 overflow-x-auto pb-1 pt-0.5 snap-x snap-mandatory">' +
      live.map(function (z) {
        return '<a href="zaruba.html?id=' + encodeURIComponent(z.id) + '" class="zb-card zb-glass shrink-0 snap-start rounded-2xl px-4 py-3 min-w-[10.5rem] border border-red-500/25">' +
          '<p class="text-[10px] font-bold uppercase tracking-wide text-zb-accent">' + zarubaSportLabel(z.sport) + "</p>" +
          '<p class="mt-0.5 truncate text-sm font-bold text-zinc-900 dark:text-white">' + locName(locs, z.locationId) + "</p>" +
          '<p class="font-zb-display mt-1 text-2xl font-bold tabular-nums text-zb-accent">' + z.scoreA + ":" + z.scoreB + "</p></a>";
      }).join("") + "</div>";
  }

  function refreshHomeData() {
    return Promise.all([
      mockDb.listLocations(),
      mockDb.listZarubas(),
      mockDb.leaderboardByCharisma(5),
    ]).then(function (results) {
      var locs = results[0], zarubas = results[1], lbRows = results[2];
      renderFeed(locs, zarubas);
      renderLeaderboard(lbRows);
      renderLiveStrip(locs, zarubas);
      initMap(locs, zarubas);
      paintMapMarkers(locs, zarubas);
      if (navigator.vibrate) navigator.vibrate(12);
    });
  }

  function openSheet(open) {
    var s = document.getElementById("zaruba-sheet");
    if (!s) return;
    s.classList.toggle("hidden", !open);
    s.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function fillCreateForm() {
    var sel = document.getElementById("create-loc");
    if (!sel) return;
    mockDb.listLocations().then(function (locs) {
      sel.innerHTML = '<option value="">Выбери площадку</option>' +
        locs.map(function (l) { return '<option value="' + l.id + '">' + l.name + "</option>"; }).join("");
    });
  }

  function bindCreateForm() {
    var form = document.getElementById("form-create-zaruba");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var uid = window.ZarubaSession.get();
      if (!uid) { window.location.href = "login.html"; return; }
      var sport = document.querySelector('input[name="sport"]:checked');
      var loc = document.getElementById("create-loc").value;
      var dt = document.getElementById("create-dt").value;
      var desc = document.getElementById("create-desc").value;
      if (!loc || !dt) return;
      mockDb.createZaruba({
        sport: sport ? sport.value : "football_5",
        locationId: loc,
        startsAt: new Date(dt).toISOString(),
        description: desc,
        organizerId: uid,
      }).then(function (z) {
        openSheet(false);
        if (typeof zarubaToast === "function") zarubaToast("Заруба создана — зови команду!", "win", 2200);
        if (typeof zarubaCelebrate === "function") zarubaCelebrate();
        window.setTimeout(function () { window.location.href = "zaruba.html?id=" + encodeURIComponent(z.id); }, 400);
      });
    });
  }

  window.zarubaHomeInit = function () {
    window.zarubaInitTheme();
    window.zarubaRenderHeader();
    if (typeof zarubaRenderBottomNav === "function") zarubaRenderBottomNav("home");

    var uid = window.ZarubaSession.get();
    if (uid) {
      mockDb.getUser(uid).then(function (user) { renderDaily(user); });
    } else {
      renderDaily(null);
    }

    refreshHomeData();
    fillCreateForm();
    bindCreateForm();

    window.addEventListener("zaruba-theme-change", function () {
      Promise.all([mockDb.listLocations(), mockDb.listZarubas()]).then(function (r) {
        initMap(r[0], r[1]);
      });
    });

    window.mockDb.subscribe(function () {
      refreshHomeData();
      window.zarubaRenderHeader();
      if (uid) mockDb.getUser(uid).then(function (user) { renderDaily(user); });
    });

    var btnCreate = document.getElementById("btn-create-zaruba");
    var btnFab = document.getElementById("btn-fab-zaruba");
    function goCreate() {
      if (!uid) window.location.href = "login.html";
      else { fillCreateForm(); openSheet(true); }
    }
    if (btnCreate) btnCreate.addEventListener("click", goCreate);
    if (btnFab) btnFab.addEventListener("click", goCreate);

    var btnRef = document.getElementById("btn-feed-refresh");
    if (btnRef) {
      btnRef.addEventListener("click", function () {
        btnRef.classList.add("animate-spin");
        refreshHomeData().then(function () {
          window.setTimeout(function () { btnRef.classList.remove("animate-spin"); }, 500);
        });
      });
    }

    document.getElementById("sheet-close") && document.getElementById("sheet-close").addEventListener("click", function () { openSheet(false); });
    document.getElementById("sheet-backdrop") && document.getElementById("sheet-backdrop").addEventListener("click", function () { openSheet(false); });
  };
})();
