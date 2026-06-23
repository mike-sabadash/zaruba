(function () {
  var BASE = window.location.origin + '/api';

  function request(method, path, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || r.statusText); });
      return r.json();
    });
  }

  var listeners = new Set();
  function emit() { listeners.forEach(function (l) { l(); }); }

  window.mockDb = {
    subscribe: function (fn) {
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    },

    reset: function () { return request('POST', '/reset').then(emit); },

    listUsers: function () { return request('GET', '/users'); },

    getUser: function (id) { return request('GET', '/users/' + encodeURIComponent(id)); },

    upsertUser: function (user) {
      return request('PUT', '/users/' + encodeURIComponent(user.id), user).then(emit);
    },

    createUser: function (phone, nickname, referralCode) {
      return request('POST', '/users', { phone: phone, nickname: nickname, referralCode: referralCode }).then(function (u) { emit(); return u; });
    },

    findUserByPhone: function (phone) {
      return request('POST', '/users/find-by-phone', { phone: phone });
    },

    listLocations: function () { return request('GET', '/locations'); },

    addLocation: function (loc) {
      return request('POST', '/locations', loc).then(function (l) { emit(); return l; });
    },

    listZarubas: function () { return request('GET', '/zarubas'); },

    getZaruba: function (id) { return request('GET', '/zarubas/' + encodeURIComponent(id)); },

    createZaruba: function (input) {
      return request('POST', '/zarubas', input).then(function (z) { emit(); return z; });
    },

    getTeam: function (id) { return request('GET', '/teams/' + encodeURIComponent(id)); },

    listTeamsForZaruba: function (zarubaId) {
      return request('GET', '/zarubas/' + encodeURIComponent(zarubaId) + '/teams');
    },

    listMembers: function (teamId) {
      return request('GET', '/teams/' + encodeURIComponent(teamId) + '/members');
    },

    createTeam: function (input) {
      return request('POST', '/teams', input).then(function (t) { emit(); return t; });
    },

    joinTeam: function (teamId, userId) {
      return request('POST', '/teams/' + encodeURIComponent(teamId) + '/join', { userId: userId }).then(emit);
    },

    confirmMember: function (teamId, captainId, memberUserId) {
      return request('PUT', '/teams/' + encodeURIComponent(teamId) + '/confirm', { captainId: captainId, memberUserId: memberUserId }).then(emit);
    },

    setReferee: function (zarubaId, organizerId, refereeId) {
      return request('PUT', '/zarubas/' + encodeURIComponent(zarubaId) + '/referee', { organizerId: organizerId, refereeId: refereeId }).then(emit);
    },

    startLive: function (zarubaId, refereeId) {
      return request('PUT', '/zarubas/' + encodeURIComponent(zarubaId) + '/start', { refereeId: refereeId }).then(emit);
    },

    setMvp: function (zarubaId, refereeId, mvpUserId) {
      return request('PUT', '/zarubas/' + encodeURIComponent(zarubaId) + '/mvp', { refereeId: refereeId, mvpUserId: mvpUserId }).then(emit);
    },

    addGoal: function (input) {
      return request('POST', '/zarubas/' + encodeURIComponent(input.zarubaId) + '/goals', input).then(function (ev) { emit(); return ev; });
    },

    addFoul: function (zarubaId, refereeId) {
      return request('PUT', '/zarubas/' + encodeURIComponent(zarubaId) + '/fouls', { refereeId: refereeId }).then(emit);
    },

    checkIn: function (zarubaId, userId) {
      return request('PUT', '/zarubas/' + encodeURIComponent(zarubaId) + '/checkin', { userId: userId }).then(emit);
    },

    finishMatch: function (zarubaId, refereeId) {
      return request('PUT', '/zarubas/' + encodeURIComponent(zarubaId) + '/finish', { refereeId: refereeId }).then(emit);
    },

    listFans: function (zarubaId) {
      return request('GET', '/zarubas/' + encodeURIComponent(zarubaId) + '/fans');
    },

    bindFan: function (input) {
      return request('POST', '/fans', input).then(function (row) { emit(); return row; });
    },

    sendChipsToTeam: function (input) {
      return request('POST', '/chips/send', input).then(emit);
    },

    postFanChat: function (input) {
      return request('POST', '/messages', input).then(function (msg) { emit(); return msg; });
    },

    listMessages: function (zarubaId) {
      return request('GET', '/zarubas/' + encodeURIComponent(zarubaId) + '/messages');
    },

    listPointLogs: function (userId) {
      return request('GET', '/users/' + encodeURIComponent(userId) + '/points');
    },

    leaderboardByCharisma: function (limit) {
      return request('GET', '/leaderboard?limit=' + (limit || 20));
    },

    purchaseShopItem: function (userId, itemId) {
      return request('POST', '/shop/purchase', { userId: userId, itemId: itemId }).then(emit);
    },

    completeOnboarding: function (userId) {
      return request('PUT', '/users/' + encodeURIComponent(userId) + '/onboarding').then(emit);
    },

    listReferrals: function (userId) {
      return request('GET', '/users/' + encodeURIComponent(userId) + '/referrals');
    },

    userStatusLabel: function (userId) {
      return request('GET', '/users/' + encodeURIComponent(userId)).then(function (u) {
        if (!u) return '';
        if (u.charismaTotal >= 500) return 'Уличный генерал';
        if (u.charismaTotal >= 200) return 'Гроза района';
        return 'Бродяга';
      });
    },
  };
})();
