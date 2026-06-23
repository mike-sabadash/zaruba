(function () {
  function qs(name) {
    var q = zarubaQs();
    return q[name] || "";
  }

  function render() {
    var id = qs("id");
    var uid = ZarubaSession.get();
    var root = document.getElementById("judge-root");
    if (!id || !root) return;

    mockDb.getZaruba(id).then(function (z) {
      if (!z) { root.innerHTML = "<p>Не найдено</p>"; return; }
      if (!uid || z.refereeId !== uid) {
        root.innerHTML = '<p>Только судья.</p><a href="zaruba.html?id=' + encodeURIComponent(id) + '" class="text-zb-accent">Назад</a>';
        return;
      }

      var fetches = [];
      if (z.teamAId) fetches.push(mockDb.getTeam(z.teamAId));
      else fetches.push(Promise.resolve(null));
      if (z.teamBId) fetches.push(mockDb.getTeam(z.teamBId));
      else fetches.push(Promise.resolve(null));

      Promise.all(fetches).then(function (teams) {
        var teamA = teams[0], teamB = teams[1];
        var memberFetches = [];
        if (teamA) memberFetches.push(mockDb.listMembers(teamA.id).then(function (m) { teamA._members = m.filter(function (x) { return x.confirmed; }); }));
        if (teamB) memberFetches.push(mockDb.listMembers(teamB.id).then(function (m) { teamB._members = m.filter(function (x) { return x.confirmed; }); }));

        Promise.all(memberFetches).then(function () {
          var goalSection = "";
          if (z.status === "live") {
            goalSection =
              '<div class="rounded-2xl border border-white/10 bg-[#161616] p-4 space-y-3">' +
              '<p class="font-zb-display text-xl font-bold">Гол</p>' +
              '<div class="flex gap-2">' +
              '<label><input type="radio" name="gteam" value="A" checked /> Команда А</label>' +
              '<label><input type="radio" name="gteam" value="B" /> Команда Б</label></div>' +
              '<select id="j-scorer" class="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-white">' +
              scorerOptions(teamA) + "</select>" +
              '<button type="button" id="j-goal" class="min-h-12 w-full rounded-xl bg-zb-accent font-semibold text-black">Засчитать гол</button></div>' +
              '<button type="button" id="j-foul" class="mt-3 min-h-12 w-full rounded-xl border border-zb-accent font-semibold text-zb-accent">Фол</button>' +
              '<div class="mt-4 rounded-2xl border border-white/10 bg-[#161616] p-4">' +
              '<p class="font-bold">MVP</p>' +
              '<div class="flex gap-2">' +
              '<select id="j-mvp" class="min-h-11 flex-1 rounded-xl border bg-black/40 px-3 text-white">' +
              mvpOptions(z, teamA, teamB) +
              "</select>" +
              '<button type="button" id="j-mvp-ok" class="min-h-11 rounded-xl bg-zb-accent px-4 text-black font-semibold">OK</button></div></div>' +
              '<button type="button" id="j-finish" class="mt-4 min-h-12 w-full rounded-xl bg-red-600 font-semibold text-white">Завершить матч</button>';
          }

          root.innerHTML =
            '<div class="flex items-center justify-between">' +
            '<h1 class="font-zb-display text-3xl font-bold">Судья</h1>' +
            '<a href="zaruba.html?id=' + encodeURIComponent(id) + '" class="text-zb-accent">Закрыть</a></div>' +
            '<p class="font-zb-display mt-4 text-center text-6xl font-bold text-zb-accent">' + z.scoreA + " : " + z.scoreB + "</p>" +
            '<p class="text-center text-sm text-zinc-400">Фолы: ' + z.fouls + "</p>" +
            (z.status === 'scheduled' ? '<button type="button" id="j-start" class="mt-4 min-h-12 w-full rounded-xl bg-zb-accent font-semibold text-black">Начать матч (LIVE)</button>' : "") +
            goalSection +
            (z.status === 'finished' ? '<p class="mt-4 text-center font-semibold text-emerald-400">Матч завершён</p>' : "");

          var start = document.getElementById("j-start");
          if (start) start.onclick = function () {
            mockDb.startLive(id, uid).then(function () {
              if (typeof zarubaToast === "function") zarubaToast("Матч LIVE — жги!", "info");
              render();
            }).catch(function (e) { if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 3000); });
          };

          document.querySelectorAll('input[name="gteam"]').forEach(function (r) {
            r.onchange = function () {
              var side = document.querySelector('input[name="gteam"]:checked').value;
              var team = side === "A" ? teamA : teamB;
              document.getElementById("j-scorer").innerHTML = scorerOptions(team);
            };
          });

          var jg = document.getElementById("j-goal");
          if (jg) jg.onclick = function () {
            var side = document.querySelector('input[name="gteam"]:checked').value;
            var sid = document.getElementById("j-scorer").value;
            if (!sid) { if (typeof zarubaToast === "function") zarubaToast("Выбери забившего", "info"); return; }
            mockDb.addGoal({ zarubaId: id, refereeId: uid, team: side, scorerId: sid }).then(function () {
              zarubaVibrate();
              if (typeof zarubaToast === "function") zarubaToast("Го-о-ол! +5 чипсеков", "win");
              if (typeof zarubaCelebrate === "function") zarubaCelebrate();
              render();
            }).catch(function (e) { if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 3000); });
          };

          var jf = document.getElementById("j-foul");
          if (jf) jf.onclick = function () {
            mockDb.addFoul(id, uid).then(function () { zarubaVibrate(); render(); }).catch(function (e) { if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 3000); });
          };

          var mvpOk = document.getElementById("j-mvp-ok");
          if (mvpOk) mvpOk.onclick = function () {
            var v = document.getElementById("j-mvp").value;
            if (!v) return;
            mockDb.setMvp(id, uid, v).then(render).catch(function (e) { if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 3000); });
          };

          var fin = document.getElementById("j-finish");
          if (fin) fin.onclick = function () {
            mockDb.finishMatch(id, uid).then(function () {
              zarubaVibrate();
              if (typeof zarubaToast === "function") zarubaToast("Матч в архиве — баллы у игроков!", "xp", 4000);
              render();
            }).catch(function (e) { if (typeof zarubaToast === "function") zarubaToast(e.message, "info", 3000); });
          };
        });
      });
    });
  }

  function scorerOptions(team) {
    if (!team || !team._members) return '<option value="">Кто забил</option>';
    return '<option value="">Кто забил</option>' +
      team._members.map(function (m) {
        return '<option value="' + m.userId + '">' + m.userId + '</option>';
      }).join("");
  }

  function mvpOptions(z, teamA, teamB) {
    var parts = ['<option value="">Не выбран</option>'];
    function addTeam(team) {
      if (!team || !team._members) return;
      team._members.forEach(function (m) {
        parts.push('<option value="' + m.userId + '">' + m.userId + '</option>');
      });
    }
    addTeam(teamA);
    addTeam(teamB);
    return parts.join("");
  }

  window.zarubaJudgeInit = function () {
    zarubaInitTheme();
    if (!ZarubaSession.get()) { window.location.href = "login.html"; return; }
    render();
    mockDb.subscribe(render);
  };
})();
