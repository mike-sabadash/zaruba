(function () {
  function render() {
    var uid = ZarubaSession.get();
    var root = document.getElementById("shop-root");
    if (!root) return;
    if (!uid) {
      root.innerHTML = '<div class="zb-glass rounded-3xl p-8 text-center"><a href="login.html" class="font-bold text-zb-accent">Войди</a>, чтобы тратить чипсеки.</div>';
      return;
    }

    mockDb.getUser(uid).then(function (u) {
      var items = ZARUBA_SHOP_ITEMS.map(function (item) {
        var owned = u.purchases.indexOf(item.id) !== -1;
        var can = !owned && u.chips >= item.price;
        return (
          '<div class="zb-card zb-glass group relative overflow-hidden p-6 sm:p-7">' +
          '<div class="absolute -right-4 top-0 text-6xl opacity-10 grayscale transition group-hover:opacity-20">🪙</div>' +
          '<h3 class="font-zb-display relative text-2xl font-bold text-zinc-900 dark:text-white">' + item.title + "</h3>" +
          '<p class="relative mt-1 text-sm text-zinc-600 dark:text-zinc-400">' + item.description + "</p>" +
          '<p class="relative mt-3 inline-flex rounded-xl bg-zb-accent-muted px-3 py-1 text-sm font-black text-zb-accent">🪙 ' + item.price + "</p>" +
          (owned
            ? '<p class="relative mt-3 text-sm font-bold text-emerald-500">✓ Уже твоё</p>'
            : '<button type="button" class="btn-buy zb-tap zb-btn-cta relative mt-4 shadow-zb disabled:opacity-40" data-id="' + item.id + '" ' + (can ? "" : "disabled") + ">Забрать</button>") +
          "</div>"
        );
      }).join("");

      root.innerHTML =
        '<div class="zb-glass mb-8 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold">' +
        '<span>Баланс</span><span class="text-zb-accent">🪙 ' + u.chips + "</span></div>" +
        '<p class="mb-6 text-xs text-zinc-500 dark:text-zinc-400">Цифровые штуки — мерч и сертификаты добавим позже.</p>' +
        '<div class="grid gap-6 sm:grid-cols-2">' + items + "</div>";

      document.querySelectorAll(".btn-buy").forEach(function (b) {
        b.onclick = function () {
          mockDb.purchaseShopItem(uid, b.getAttribute("data-id")).then(function () {
            if (typeof zarubaToast === "function") zarubaToast("Куплено — забирай респект!", "win");
            if (typeof zarubaCelebrate === "function") zarubaCelebrate();
            render();
          }).catch(function (e) {
            if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 2800);
            if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 3000);
          });
        };
      });
    });
  }

  window.zarubaShopInit = function () {
    zarubaInitTheme();
    zarubaRenderHeader();
    if (typeof zarubaRenderBottomNav === "function") zarubaRenderBottomNav("shop");
    render();
    mockDb.subscribe(function () { render(); zarubaRenderHeader(); });
  };
})();
