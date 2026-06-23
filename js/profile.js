(function () {
  var ACH = {
    first_zaruba: { t: "Первая Заруба", e: "🏟" },
    five_wins: { t: "5 побед", e: "👑" },
    ten_fans: { t: "10 фанатов", e: "📣" },
    hat_trick: { t: "Хет-трик", e: "⚽" },
    first_fan: { t: "Первый фанат", e: "❤️" },
    sharp_crowd: { t: "Глазастая тусовка", e: "👀" },
    own_the_board: { t: "Свой в доску", e: "🛹" },
    first_referral: { t: "Первый реферал", e: "🤝" },
  };

  function render() {
    var q = zarubaQs();
    var userId = q.id;
    var root = document.getElementById("profile-root");
    if (!root) return;
    if (!userId && ZarubaSession.get()) {
      window.location.replace("profile.html?id=" + encodeURIComponent(ZarubaSession.get()));
      return;
    }
    if (!userId) {
      root.innerHTML = '<div class="zb-glass rounded-3xl p-8 text-center"><p class="text-zinc-600 dark:text-zinc-300">Укажи id или <a href="login.html" class="font-bold text-zb-accent">войди</a>.</p></div>';
      return;
    }

    Promise.all([
      mockDb.getUser(userId),
      mockDb.listPointLogs(userId),
    ]).then(function (results) {
      var u = results[0], logs = results[1];
      if (!u) { root.innerHTML = '<div class="zb-glass rounded-3xl p-6">Пользователь не найден</div>'; return; }

      var sessionId = ZarubaSession.get();
      var isMe = sessionId === userId;
      var prog = zarubaCharismaProgress(u.charismaTotal);
      var status = zarubaCharismaStatus(u.charismaTotal);
      logs = logs.slice(0, 25);
      var pctRing = Math.min(100, prog.pct);

      var logout = isMe ? '<button type="button" id="btn-logout" class="zb-tap mt-3 w-full rounded-2xl border border-zinc-400/50 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300">Выйти</button>' : "";
      var shop = isMe ? '<a href="shop.html" class="zb-tap zb-btn-cta mt-3 shadow-zb">🛒 В магазин</a>' : "";

      var achHtml = u.achievements.length === 0
        ? '<p class="text-sm text-zinc-500">Забивай Зарубы — собирай значки.</p>'
        : '<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">' +
          u.achievements.map(function (a) {
            var meta = ACH[a] || { t: a, e: "⭐" };
            return '<div class="zb-card zb-glass flex flex-col items-center rounded-2xl p-3 text-center">' +
              '<span class="text-2xl">' + meta.e + '</span>' +
              '<span class="mt-1 text-[11px] font-bold leading-tight text-zinc-800 dark:text-zinc-100">' + meta.t + '</span></div>';
          }).join("") + "</div>";

      root.innerHTML =
        '<div class="zb-glass relative overflow-hidden rounded-3xl p-6 sm:p-8">' +
        '<div class="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl"></div>' +
        '<div class="relative flex flex-col gap-6 sm:flex-row sm:items-center">' +
        '<div class="zb-ring shrink-0 self-center sm:self-start" style="--zb-pct:' + pctRing + '">' +
        '<div class="zb-ring-inner"><span class="px-1">LVL<br/><span class="text-zb-accent">' + Math.floor(1 + u.charismaTotal / 100) + "</span></span></div></div>" +
        '<div class="flex-1 min-w-0">' +
        '<h1 class="font-zb-display truncate text-4xl font-bold ' + zarubaNickClass(u) + '">' + u.nickname + "</h1>" +
        '<p class="mt-1 text-sm font-semibold text-violet-400">' + status + "</p>" +
        '<div class="mt-3 flex flex-wrap gap-2">' +
        '<span class="rounded-xl bg-zb-accent-soft px-3 py-1.5 text-sm font-black text-zb-accent">🪙 ' + u.chips + "</span>" +
        '<span class="rounded-xl bg-cyan-500/15 px-3 py-1.5 text-sm font-black text-cyan-400">✨ ' + u.charismaTotal + " XP</span></div>" +
        shop + logout + "</div></div></div>" +
        '<div class="zb-glass mt-8 rounded-3xl p-6 sm:p-7">' +
        '<h2 class="font-zb-display mb-2 text-2xl font-bold">Прогресс статуса</h2>' +
        '<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">' +
        (prog.pct >= 100 ? "Ты на максимуме в этом MVP — дальше больше." : "До следующего уровня: " + Math.round(prog.current) + " / " + prog.next + " XP") +
        '</p>' +
        '<div class="mt-5 h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">' +
        '<div class="h-full rounded-full bg-gradient-to-r from-violet-500 via-orange-600 to-amber-400 transition-all duration-700" style="width:' + Math.min(100, prog.pct) + '%"></div></div></div>' +
        '<div class="zb-glass mt-8 rounded-3xl p-6 sm:p-7">' +
        '<h2 class="font-zb-display mb-2 text-2xl font-bold">Ачивки</h2>' + achHtml + "</div>" +
        '<div class="zb-glass mt-8 rounded-3xl p-6 sm:p-7">' +
        '<h2 class="font-zb-display mb-2 text-2xl font-bold">Пригласи друга</h2>' +
        '<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Поделись ссылкой — получи +50 чипсеков за каждого друга, он получит +75.</p>' +
        '<div class="mt-4 flex items-center gap-2">' +
        '<input type="text" readonly class="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300" id="ref-link" value="' + window.location.origin + '/login.html?ref=' + (u.referralCode || '') + '" />' +
        '<button type="button" id="copy-ref" class="rounded-xl bg-zb-accent px-4 py-2 text-sm font-bold text-black">Копировать</button>' +
        '</div>' +
        '<p class="mt-2 text-xs text-zinc-500">Приглашено: <span class="font-bold text-zb-accent">' + u.referredCount + '</span> чел.</p>' +
        '</div>' +
        '<div class="zb-glass mt-8 rounded-3xl p-6 sm:p-7">' +
        '<h2 class="font-zb-display mb-2 text-2xl font-bold">Скоро</h2>' +
        '<p class="mt-1 text-xs text-zinc-500">Реальные призы — витрина уже под это заточена.</p>' +
        '<div class="zb-hide-scrollbar mt-5 flex gap-4 overflow-x-auto pb-1">' +
        [{ e: "👕", t: "Мерч", l: "Скоро" }, { e: "🎟", t: "Партнёры", l: "Сертификаты" }, { e: "🏆", t: "Турниры", l: "В планах" }]
          .map(function (x) {
            return '<div class="shrink-0 rounded-2xl border border-dashed border-zinc-500/40 bg-black/5 px-4 py-3 text-center opacity-75 dark:bg-white/5">' +
              '<div class="text-2xl grayscale">' + x.e + '</div>' +
              '<p class="mt-1 text-xs font-bold text-zinc-700 dark:text-zinc-200">' + x.t + '</p>' +
              '<p class="text-[10px] text-zinc-500">' + x.l + '</p></div>';
          }).join("") + "</div></div>" +
        '<div class="zb-glass mt-8 rounded-3xl p-6 sm:p-7">' +
        '<h2 class="font-zb-display mb-2 text-2xl font-bold">История чипсеков</h2>' +
        '<ul class="mt-4 space-y-3 text-sm">' +
        (logs.length ? logs.map(function (l) {
          return '<li class="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">' +
            '<span class="flex-1 text-zinc-800 dark:text-zinc-200">' + l.reason + "</span>" +
            '<span class="shrink-0 font-black ' + (l.delta >= 0 ? "text-emerald-500" : "text-red-400") + '">' + (l.delta > 0 ? "+" : "") + l.delta + "</span>" +
            '<span class="w-full text-[10px] text-zinc-400 sm:w-auto sm:text-right">' + zarubaFormatDateTime(l.createdAt) + "</span></li>";
        }).join("") : '<li class="text-zinc-500">Пока тихо — пора в игру.</li>') + "</ul></div>";

      var lo = document.getElementById("btn-logout");
      if (lo) lo.onclick = function () { ZarubaSession.clear(); window.location.href = "index.html"; };

      var copyBtn = document.getElementById("copy-ref");
      if (copyBtn) copyBtn.onclick = function () {
        var input = document.getElementById("ref-link");
        if (input) {
          input.select();
          navigator.clipboard.writeText(input.value).then(function () {
            if (typeof zarubaToast === "function") zarubaToast("Ссылка скопирована!", "win", 2000);
          }).catch(function () {
            document.execCommand('copy');
            if (typeof zarubaToast === "function") zarubaToast("Ссылка скопирована!", "win", 2000);
          });
        }
      };
    });
  }

  window.zarubaProfileInit = function () {
    zarubaInitTheme();
    zarubaRenderHeader();
    if (typeof zarubaRenderBottomNav === "function") zarubaRenderBottomNav("profile");
    render();
    mockDb.subscribe(function () { render(); zarubaRenderHeader(); });
  };
})();
