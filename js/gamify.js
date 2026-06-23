/**
 * Геймификация: тосты, вспышка монет, вибро, звуки (Web Audio).
 */
(function () {
  function soundMuted() {
    return localStorage.getItem("zaruba_sound_off") === "1";
  }

  window.zarubaSoundMuted = function () {
    return soundMuted();
  };

  window.zarubaToggleSoundMuted = function () {
    var next = soundMuted() ? "0" : "1";
    localStorage.setItem("zaruba_sound_off", next);
    return soundMuted();
  };

  /** Короткие «бипы» без файлов */
  window.zarubaPlayRewardSound = function (kind) {
    kind = kind || "info";
    if (soundMuted()) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var now = ctx.currentTime;
      function tone(freq, t0, dur, type, vol) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol || 0.06, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
      }
      if (kind === "win") {
        tone(523, now, 0.08, "square", 0.07);
        tone(784, now + 0.07, 0.12, "square", 0.08);
      } else if (kind === "xp") {
        tone(880, now, 0.1, "sine", 0.08);
        tone(1174, now + 0.08, 0.15, "sine", 0.06);
      } else {
        tone(440, now, 0.06, "triangle", 0.05);
      }
      window.setTimeout(function () {
        ctx.close();
      }, 400);
    } catch (e) {}
  };

  function ensureToastRoot() {
    var id = "zaruba-toast-root";
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    return el;
  }

  function ensureFxRoot() {
    var id = "zaruba-fx-root";
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * @param {string} message
   * @param {"win"|"info"|"xp"} kind
   * @param {number} [durationMs]
   * @param {boolean} [skipSound]
   */
  window.zarubaToast = function (message, kind, durationMs, skipSound) {
    kind = kind || "info";
    durationMs = durationMs == null ? 3200 : durationMs;
    var root = ensureToastRoot();
    var t = document.createElement("div");
    t.className = "zb-toast zb-toast--" + kind;
    t.setAttribute("role", "status");
    t.textContent = message;
    root.appendChild(t);
    if (
      !skipSound &&
      typeof window.zarubaPlayRewardSound === "function"
    ) {
      window.zarubaPlayRewardSound(
        kind === "win" ? "win" : kind === "xp" ? "xp" : "info",
      );
    }
    if (navigator.vibrate) navigator.vibrate(kind === "win" ? [30, 40, 30] : 25);
    window.setTimeout(function () {
      t.style.opacity = "0";
      t.style.transform = "translateY(-12px)";
      t.style.transition = "opacity 0.25s, transform 0.25s";
      window.setTimeout(function () {
        t.remove();
      }, 260);
    }, durationMs);
  };

  window.zarubaCelebrate = function () {
    var root = ensureFxRoot();
    root.innerHTML =
      '<div class="zb-flash"></div><div class="zb-coin-burst" aria-hidden="true">🪙</div>';
    if (navigator.vibrate) navigator.vibrate([35, 50, 35]);
    window.setTimeout(function () {
      root.innerHTML = "";
    }, 600);
  };

  /** Ежедневка: текст для баннера */
  window.zarubaDailyBannerHtml = function (user) {
    if (!user) return "";
    var t = ZARUBA_POINTS.DAILY_FANS_TARGET;
    var cur = user.daily.fansInvited || 0;
    var done = user.daily.challengeCompleted;
    var pct = Math.min(100, (cur / t) * 100);
    if (done) {
      return (
        '<div class="zb-glass zb-shine relative overflow-hidden rounded-2xl border border-[#22d3ee]/30 p-5 sm:p-6">' +
        '<p class="text-sm font-bold text-[#22d3ee]">🔥 Челлендж на сегодня выполнен!</p>' +
        '<p class="mt-1 text-xs text-zinc-400">Завтра будет новый квест.</p></div>'
      );
    }
    return (
      '<div class="zb-glass zb-shine relative overflow-hidden rounded-2xl border border-zb-accent-soft p-5 sm:p-6">' +
      '<div class="flex items-start justify-between gap-4">' +
      '<div><p class="zb-eyebrow zb-eyebrow-accent text-xs tracking-wider">Ежедневка</p>' +
      '<p class="mt-1 text-sm font-semibold text-zinc-100 dark:text-white">Приведи <span class="text-zb-accent font-semibold">' +
      t +
      "</span> фанатов сегодня</p>" +
      '<p class="text-xs text-zinc-500 dark:text-zinc-400">Награда: +' +
      ZARUBA_POINTS.DAILY_FANS_BONUS +
      " чипсеков</p></div>" +
      '<span class="shrink-0 rounded-full bg-zb-accent-soft px-2 py-1 text-xs font-black text-zb-accent">' +
      cur +
      "/" +
      t +
      "</span></div>" +
      '<div class="mt-4 h-2 overflow-hidden rounded-full bg-black/20 dark:bg-white/10">' +
      '<div class="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 transition-all duration-500" style="width:' +
      pct +
      '%"></div></div></div>'
    );
  };
})();
