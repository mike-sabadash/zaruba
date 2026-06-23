(function () {
  function getQueryParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  function render() {
    var zarubaId = getQueryParam('id');
    var root = document.getElementById('zaruba-root');
    if (!root) return;
    if (!zarubaId) { root.innerHTML = '<div class="card" style="text-align:center">Не указан ID зарубы</div>'; return; }

    Promise.all([
      mockDb.getZaruba(zarubaId),
      mockDb.listLocations(),
      mockDb.listTeamsForZaruba(zarubaId),
      mockDb.listFans(zarubaId),
      mockDb.listMessages(zarubaId),
    ]).then(function (results) {
      var z = results[0], allLocs = results[1], teams = results[2], fans = results[3], messages = results[4];
      if (!z) { root.innerHTML = '<div class="card" style="text-align:center">Заруба не найдена</div>'; return; }

      var location = allLocs.find(function (l) { return l.id === z.locationId; });
      var uid = ZarubaSession.get();
      var isOrg = uid === z.organizerId;
      var isReferee = uid === z.refereeId;
      var teamA = teams.find(function (t) { return t.side === 'A'; });
      var teamB = teams.find(function (t) { return t.side === 'B'; });

      var pUsers = {};
      var userIdsToFetch = [z.organizerId];
      if (z.mvpUserId) userIdsToFetch.push(z.mvpUserId);
      if (teamA) userIdsToFetch.push(teamA.captainId);
      if (teamB) userIdsToFetch.push(teamB.captainId);
      fans.forEach(function (f) { userIdsToFetch.push(f.fanUserId, f.playerId); });
      messages.forEach(function (m) { userIdsToFetch.push(m.userId); });

      var uniqueIds = Array.from(new Set(userIdsToFetch.filter(Boolean)));
      var userPromises = uniqueIds.map(function (id) {
        return mockDb.getUser(id).then(function (u) { pUsers[id] = u; }).catch(function () {});
      });

      var memberPromises = [];
      if (teamA) memberPromises.push(mockDb.listMembers(teamA.id).then(function (m) { teamA._members = m; }));
      if (teamB) memberPromises.push(mockDb.listMembers(teamB.id).then(function (m) { teamB._members = m; }));

      Promise.all(userPromises.concat(memberPromises)).then(function () {
        var html = '';
        html += '<div class="card">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">';
        html += '<div><h2 style="margin:0">' + (location ? location.name : 'Площадка') + '</h2>';
        html += '<p style="margin:8px 0 0; color:#aaa;">' + (location ? location.address : '') + '</p>';
        html += '<p style="margin:4px 0 0; font-size:14px;">Организатор: ' + (pUsers[z.organizerId] ? pUsers[z.organizerId].nickname : '—') + '</p></div>';
        html += '<div style="text-align:right"><span class="status-badge">' + (z.status === 'scheduled' ? 'Ожидает' : (z.status === 'live' ? 'В процессе' : 'Завершена')) + '</span>';
        html += '<div class="score" style="font-size:36px; margin-top:8px;">' + z.scoreA + ' : ' + z.scoreB + '</div></div></div>';
        if (z.description) html += '<p style="margin-top:16px;">' + z.description + '</p>';
        if (isOrg && z.status === 'scheduled') html += '<div style="margin-top:16px;"><button class="btn btn-outline btn-sm" id="selectRefereeBtn">Назначить судью</button></div>';
        if (isReferee && z.status === 'scheduled') html += '<div style="margin-top:16px;"><button class="btn" id="startMatchBtn">Начать матч</button></div>';
        html += '</div>';

        html += '<div class="two-columns">';
        html += renderTeamColumn(z, teamA, 'A', uid, isOrg, pUsers);
        html += renderTeamColumn(z, teamB, 'B', uid, isOrg, pUsers);
        html += '</div>';

        html += '<div class="card"><h3>👥 Фанаты (' + fans.length + ')</h3>';
        if (fans.length === 0) {
          html += '<p style="color:#aaa;">Пока никого. Приведи друзей!</p>';
        } else {
          html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
          fans.forEach(function (f) {
            var fan = pUsers[f.fanUserId];
            var player = pUsers[f.playerId];
            html += '<span style="background: rgba(255,255,255,0.1); padding:4px 12px; border-radius:20px;">' + (fan ? fan.nickname : '?') + ' за ' + (player ? player.nickname : '?') + '</span>';
          });
          html += '</div>';
        }
        html += '</div>';

        html += '<div class="card"><h3>💬 Чат фанатов</h3>';
        html += '<div class="chat-box" id="chatBox">';
        messages.forEach(function (m) {
          var user = pUsers[m.userId];
          html += '<div class="chat-message"><strong>' + (user ? user.nickname : '?') + ':</strong> ' + m.body + '</div>';
        });
        html += '</div>';
        if (uid) html += '<div class="chat-input"><input type="text" id="chatMessage" placeholder="Напиши что-нибудь..."><button class="btn btn-sm" id="sendChatBtn">Отправить</button></div>';
        else html += '<p style="margin-top:12px;"><a href="login.html" style="color:#f20b88;">Войдите</a>, чтобы писать в чат.</p>';
        html += '</div>';

        if (uid && (teamA || teamB)) {
          html += '<div class="card"><h3>🪙 Поддержать команду чипсеками</h3><div style="display: flex; gap: 16px;">';
          if (teamA) html += '<button class="btn btn-outline btn-sm" data-team="' + teamA.id + '" id="supportA">Команда А (+10)</button>';
          if (teamB) html += '<button class="btn btn-outline btn-sm" data-team="' + teamB.id + '" id="supportB">Команда Б (+10)</button>';
          html += '</div></div>';
        }

        root.innerHTML = html;

        if (document.getElementById('selectRefereeBtn')) {
          document.getElementById('selectRefereeBtn').onclick = function () {
            var allPlayers = [];
            if (teamA && teamA._members) allPlayers.push.apply(allPlayers, teamA._members.map(function (m) { return m.userId; }));
            if (teamB && teamB._members) allPlayers.push.apply(allPlayers, teamB._members.map(function (m) { return m.userId; }));
            var unique = Array.from(new Set(allPlayers));
            if (!unique.length) { if (typeof zarubaToast === "function") zarubaToast("Нет игроков", "info"); return; }
            var newRef = prompt('Введите ID пользователя:\n' + unique.join(', '));
            if (newRef && pUsers[newRef]) { mockDb.setReferee(zarubaId, z.organizerId, newRef).then(render); }
            else if (newRef) { if (typeof zarubaToast === "function") zarubaToast("Пользователь не найден", "info"); }
          };
        }
        if (document.getElementById('startMatchBtn')) {
          document.getElementById('startMatchBtn').onclick = function () { mockDb.startLive(zarubaId, uid).then(render); };
        }
        if (document.getElementById('sendChatBtn')) {
          document.getElementById('sendChatBtn').onclick = function () {
            var input = document.getElementById('chatMessage');
            var text = input.value.trim();
            if (!text) return;
            mockDb.postFanChat({ zarubaId: zarubaId, userId: uid, body: text }).then(function () { render(); });
          };
        }
        if (document.getElementById('supportA')) {
          document.getElementById('supportA').onclick = function () { mockDb.sendChipsToTeam({ teamId: this.getAttribute('data-team'), fanUserId: uid, amount: 10 }).then(render); };
        }
        if (document.getElementById('supportB')) {
          document.getElementById('supportB').onclick = function () { mockDb.sendChipsToTeam({ teamId: this.getAttribute('data-team'), fanUserId: uid, amount: 10 }).then(render); };
        }
      });
    });
  }

  function renderTeamColumn(z, team, side, uid, isOrg, pUsers) {
    if (!team) {
      if (uid) return '<div class="team-card"><h3>Команда ' + side + '</h3><button class="btn btn-sm" id="createTeam' + side + '">Создать команду</button></div>';
      else return '<div class="team-card"><h3>Команда ' + side + '</h3><p style="color:#aaa;">Войдите, чтобы создать</p></div>';
    }
    var members = team._members || [];
    var captain = pUsers[team.captainId];
    var isCaptain = uid === team.captainId;
    var inviteLink = new URL('invite.html?zarubaId=' + z.id + '&teamId=' + team.id, window.location.href).href;
    var fanLink = new URL('fan.html?zarubaId=' + z.id + '&playerId=' + (uid || ''), window.location.href).href;
    var html = '<div class="team-card"><h3>Команда ' + side + ' — ' + team.name + '</h3>';
    html += '<p>Капитан: ' + (captain ? captain.nickname : '—') + '</p>';
    html += '<ul class="member-list">';
    members.forEach(function (m) {
      var player = pUsers[m.userId];
      html += '<li><span>' + (player ? player.nickname : '?') + '</span><span>' + (m.role === 'field' ? 'поле' : 'запас') + (m.confirmed ? ' ✓' : ' (ожидание)') + '</span></li>';
    });
    html += '</ul>';
    if (isCaptain) {
      html += '<button class="btn btn-outline btn-sm copyInviteBtn" data-link="' + inviteLink + '">Копировать приглашение</button> ';
      html += '<button class="btn btn-outline btn-sm copyFanBtn" data-link="' + fanLink + '">Копировать ссылку для фанатов</button>';
    } else if (uid && !members.some(function (m) { return m.userId === uid; })) {
      html += '<button class="btn btn-sm joinTeamBtn" data-team="' + team.id + '">Вступить в команду</button>';
    }
    html += '</div>';
    return html;
  }

  window.zarubaDetailInit = function () {
    if (!window.mockDb) return;
    render();
    mockDb.subscribe(function () { render(); });
  };
})();
