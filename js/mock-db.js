(function () {
  var STORAGE_KEY = "zaruba_mock_db_v1";
  var POINTS = window.ZARUBA_POINTS;
  var SHOP_ITEMS = window.ZARUBA_SHOP_ITEMS;
  var charismaStatus = window.zarubaCharismaStatus;

  var listeners = new Set();

  function emit() {
    listeners.forEach(function (l) {
      l();
    });
  }

  function generateToken() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    }
    return Math.random().toString(36).slice(2, 14);
  }

  function defaultUser(phone, nickname) {
    var id = crypto.randomUUID();
    var today = new Date().toISOString().slice(0, 10);
    return {
      id: id,
      phone: phone,
      nickname: nickname,
      avatarUrl: null,
      chips: 100,
      charismaTotal: 0,
      wins: 0,
      fansTotal: 0,
      zarubasCreated: 0,
      purchases: [],
      achievements: [],
      cosmetics: { nickColor: "default", avatarFrame: "none" },
      daily: { date: today, fansInvited: 0, challengeCompleted: false },
      onboardingDone: false,
      createdAt: new Date().toISOString(),
    };
  }

  function seedLocations() {
    return {
      loc_moscow_1: {
        id: "loc_moscow_1",
        name: "Корт «Северный»",
        lat: 55.7934,
        lng: 37.6165,
        address: "Москва, двор у школы №123",
      },
      loc_moscow_2: {
        id: "loc_moscow_2",
        name: "Короб 3×3",
        lat: 55.7512,
        lng: 37.6184,
        address: "Центр, баскет-площадка",
      },
      loc_spb_1: {
        id: "loc_spb_1",
        name: "Двор на Невском",
        lat: 59.9343,
        lng: 30.3351,
      },
    };
  }

  function emptyStore() {
    return {
      users: {},
      zarubas: {},
      teams: {},
      teamMembers: [],
      fans: [],
      messages: [],
      pointLogs: [],
      locations: seedLocations(),
    };
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      if (!parsed.locations || Object.keys(parsed.locations).length === 0) {
        parsed.locations = seedLocations();
      }
      return parsed;
    } catch (e) {
      return emptyStore();
    }
  }

  function saveStore(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function logPoints(s, userId, delta, reason, zarubaId) {
    s.pointLogs.unshift({
      id: crypto.randomUUID(),
      userId: userId,
      delta: delta,
      reason: reason,
      zarubaId: zarubaId,
      createdAt: new Date().toISOString(),
    });
  }

  function grantAchievement(u, id) {
    if (u.achievements.indexOf(id) === -1) u.achievements.push(id);
  }

  function bumpDailyFans(s, playerId) {
    var u = s.users[playerId];
    if (!u) return;
    var today = new Date().toISOString().slice(0, 10);
    if (u.daily.date !== today) {
      u.daily = { date: today, fansInvited: 0, challengeCompleted: false };
    }
    u.daily.fansInvited += 1;
    if (
      !u.daily.challengeCompleted &&
      u.daily.fansInvited >= POINTS.DAILY_FANS_TARGET
    ) {
      u.daily.challengeCompleted = true;
      u.chips += POINTS.DAILY_FANS_BONUS;
      logPoints(s, playerId, POINTS.DAILY_FANS_BONUS, "Ежедневное задание: 3 фаната");
    }
  }

  window.mockDb = {
    subscribe: function (fn) {
      listeners.add(fn);
      return function () {
        listeners.delete(fn);
      };
    },

    reset: function () {
      saveStore(emptyStore());
      emit();
    },

    listUsers: function () {
      return Object.values(loadStore().users);
    },

    getUser: function (id) {
      return loadStore().users[id];
    },

    upsertUser: function (user) {
      var s = loadStore();
      s.users[user.id] = user;
      saveStore(s);
      emit();
    },

    createUser: function (phone, nickname) {
      var s = loadStore();
      var u = defaultUser(phone, nickname);
      s.users[u.id] = u;
      saveStore(s);
      emit();
      return u;
    },

    findUserByPhone: function (phone) {
      return Object.values(loadStore().users).find(function (u) {
        return u.phone === phone;
      });
    },

    listLocations: function () {
      return Object.values(loadStore().locations);
    },

    addLocation: function (loc) {
      var s = loadStore();
      var id = crypto.randomUUID();
      var full = Object.assign({}, loc, { id: id });
      s.locations[id] = full;
      saveStore(s);
      emit();
      return full;
    },

    listZarubas: function () {
      return Object.values(loadStore().zarubas).sort(function (a, b) {
        return new Date(b.startsAt) - new Date(a.startsAt);
      });
    },

    getZaruba: function (id) {
      return loadStore().zarubas[id];
    },

    createZaruba: function (input) {
      var s = loadStore();
      var id = crypto.randomUUID();
      var z = {
        id: id,
        sport: input.sport,
        locationId: input.locationId,
        startsAt: input.startsAt,
        description: input.description,
        organizerId: input.organizerId,
        refereeId: null,
        status: "scheduled",
        inviteToken: generateToken(),
        teamAId: null,
        teamBId: null,
        scoreA: 0,
        scoreB: 0,
        mvpUserId: null,
        goals: [],
        fouls: 0,
        checkIns: [],
        finishedAt: null,
        createdAt: new Date().toISOString(),
      };
      s.zarubas[id] = z;
      var org = s.users[input.organizerId];
      if (org) {
        org.zarubasCreated += 1;
        grantAchievement(org, "first_zaruba");
      }
      saveStore(s);
      emit();
      return z;
    },

    getTeam: function (id) {
      return loadStore().teams[id];
    },

    listTeamsForZaruba: function (zarubaId) {
      return Object.values(loadStore().teams).filter(function (t) {
        return t.zarubaId === zarubaId;
      });
    },

    listMembers: function (teamId) {
      return loadStore().teamMembers.filter(function (m) {
        return m.teamId === teamId;
      });
    },

    createTeam: function (input) {
      var s = loadStore();
      var z = s.zarubas[input.zarubaId];
      if (!z) throw new Error("Zaruba not found");
      if (input.side === "A" && z.teamAId) throw new Error("Side A taken");
      if (input.side === "B" && z.teamBId) throw new Error("Side B taken");
      var id = crypto.randomUUID();
      var team = {
        id: id,
        zarubaId: input.zarubaId,
        side: input.side,
        name: input.name,
        captainId: input.captainId,
        logoUrl: null,
        fanPoolChips: 0,
      };
      s.teams[id] = team;
      s.teamMembers.push({
        teamId: id,
        userId: input.captainId,
        role: "field",
        confirmed: true,
      });
      if (input.side === "A") z.teamAId = id;
      else z.teamBId = id;
      saveStore(s);
      emit();
      return team;
    },

    joinTeam: function (teamId, userId) {
      var s = loadStore();
      var team = s.teams[teamId];
      if (!team) throw new Error("Team not found");
      var members = s.teamMembers.filter(function (m) {
        return m.teamId === teamId;
      });
      if (members.some(function (m) {
        return m.userId === userId;
      }))
        return;
      if (members.length >= 7) throw new Error("Команда полная");
      var fieldCount = members.filter(function (m) {
        return m.role === "field";
      }).length;
      var role = fieldCount < 5 ? "field" : "bench";
      s.teamMembers.push({ teamId: teamId, userId: userId, role: role, confirmed: false });
      saveStore(s);
      emit();
    },

    confirmMember: function (teamId, captainId, memberUserId) {
      var s = loadStore();
      var team = s.teams[teamId];
      if (!team || team.captainId !== captainId) throw new Error("Нет прав");
      var m = s.teamMembers.find(function (x) {
        return x.teamId === teamId && x.userId === memberUserId;
      });
      if (m) m.confirmed = true;
      saveStore(s);
      emit();
    },

    setReferee: function (zarubaId, organizerId, refereeId) {
      var s = loadStore();
      var z = s.zarubas[zarubaId];
      if (!z || z.organizerId !== organizerId) throw new Error("Нет прав");
      z.refereeId = refereeId;
      saveStore(s);
      emit();
    },

    startLive: function (zarubaId, refereeId) {
      var s = loadStore();
      var z = s.zarubas[zarubaId];
      if (!z || z.refereeId !== refereeId) throw new Error("Нет прав");
      if (z.status !== "scheduled") throw new Error("Матч уже начат или завершён");
      z.status = "live";
      saveStore(s);
      emit();
    },

    setMvp: function (zarubaId, refereeId, mvpUserId) {
      var s = loadStore();
      var z = s.zarubas[zarubaId];
      if (!z || z.refereeId !== refereeId) throw new Error("Нет прав");
      z.mvpUserId = mvpUserId;
      saveStore(s);
      emit();
    },

    addGoal: function (input) {
      var s = loadStore();
      var z = s.zarubas[input.zarubaId];
      if (!z || z.refereeId !== input.refereeId) throw new Error("Нет прав");
      if (z.status !== "live") throw new Error("Матч не идёт");
      var ev = {
        id: crypto.randomUUID(),
        team: input.team,
        scorerId: input.scorerId,
        at: new Date().toISOString(),
      };
      z.goals.push(ev);
      if (input.team === "A") z.scoreA += 1;
      else z.scoreB += 1;
      var scorer = s.users[input.scorerId];
      if (scorer) {
        scorer.chips += POINTS.GOAL;
        scorer.charismaTotal += POINTS.GOAL;
        logPoints(s, input.scorerId, POINTS.GOAL, "Гол", input.zarubaId);
        var inMatch = z.goals.filter(function (g) {
          return g.scorerId === input.scorerId;
        }).length;
        if (inMatch >= 3) grantAchievement(scorer, "hat_trick");
      }
      saveStore(s);
      emit();
      return ev;
    },

    addFoul: function (zarubaId, refereeId) {
      var s = loadStore();
      var z = s.zarubas[zarubaId];
      if (!z || z.refereeId !== refereeId) throw new Error("Нет прав");
      z.fouls += 1;
      saveStore(s);
      emit();
    },

    checkIn: function (zarubaId, userId) {
      var s = loadStore();
      var z = s.zarubas[zarubaId];
      if (!z) return;
      if (z.checkIns.indexOf(userId) !== -1) return;
      z.checkIns.push(userId);
      var u = s.users[userId];
      if (u) {
        u.chips += POINTS.CHECKIN;
        u.charismaTotal += POINTS.CHECKIN;
        logPoints(s, userId, POINTS.CHECKIN, "Присутствие на матче", zarubaId);
      }
      saveStore(s);
      emit();
    },

    finishMatch: function (zarubaId, refereeId) {
      var s = loadStore();
      var z = s.zarubas[zarubaId];
      if (!z || z.refereeId !== refereeId) throw new Error("Нет прав");
      if (z.status === "finished") return;

      var winSide =
        z.scoreA > z.scoreB ? "A" : z.scoreB > z.scoreA ? "B" : "draw";

      var teamA = z.teamAId ? s.teams[z.teamAId] : undefined;
      var teamB = z.teamBId ? s.teams[z.teamBId] : undefined;

      var membersA = z.teamAId
        ? s.teamMembers.filter(function (m) {
            return m.teamId === z.teamAId && m.confirmed;
          })
        : [];
      var membersB = z.teamBId
        ? s.teamMembers.filter(function (m) {
            return m.teamId === z.teamBId && m.confirmed;
          })
        : [];

      function rewardTeam(team, members, won) {
        if (!team) return;
        for (var i = 0; i < members.length; i++) {
          var m = members[i];
          var u = s.users[m.userId];
          if (!u) continue;
          if (won) {
            u.chips += POINTS.WIN_PLAYER;
            u.charismaTotal += POINTS.WIN_PLAYER;
            u.wins += 1;
            logPoints(s, m.userId, POINTS.WIN_PLAYER, "Победа в Зарубе", zarubaId);
            if (u.wins >= 5) grantAchievement(u, "five_wins");
            if (team.captainId === m.userId) {
              u.chips += POINTS.CAPTAIN_WIN_BONUS;
              u.charismaTotal += POINTS.CAPTAIN_WIN_BONUS;
              logPoints(s, m.userId, POINTS.CAPTAIN_WIN_BONUS, "Бонус капитана", zarubaId);
            }
          }
        }
      }

      if (winSide === "A") rewardTeam(teamA, membersA, true);
      else if (winSide === "B") rewardTeam(teamB, membersB, true);
      else {
        rewardTeam(teamA, membersA, false);
        rewardTeam(teamB, membersB, false);
      }

      if (z.mvpUserId) {
        var mvp = s.users[z.mvpUserId];
        if (mvp) {
          mvp.chips += POINTS.MVP;
          mvp.charismaTotal += POINTS.MVP;
          logPoints(s, z.mvpUserId, POINTS.MVP, "MVP матча", zarubaId);
        }
      }

      var org = s.users[z.organizerId];
      if (org) {
        var bonus = 25;
        org.chips += bonus;
        org.charismaTotal += bonus;
        logPoints(s, z.organizerId, bonus, "Организатор завершил Зарубу", zarubaId);
      }

      z.status = "finished";
      z.finishedAt = new Date().toISOString();
      saveStore(s);
      emit();
    },

    listFans: function (zarubaId) {
      return loadStore().fans.filter(function (f) {
        return f.zarubaId === zarubaId;
      });
    },

    bindFan: function (input) {
      var s = loadStore();
      if (input.fanUserId === input.playerId) {
        throw new Error("Нельзя быть фанатом самого себя");
      }
      var exists = s.fans.some(function (f) {
        return f.zarubaId === input.zarubaId && f.fanUserId === input.fanUserId;
      });
      if (exists) {
        return s.fans.find(function (f) {
          return f.zarubaId === input.zarubaId && f.fanUserId === input.fanUserId;
        });
      }
      var row = {
        id: crypto.randomUUID(),
        zarubaId: input.zarubaId,
        playerId: input.playerId,
        fanUserId: input.fanUserId,
        createdAt: new Date().toISOString(),
      };
      s.fans.push(row);
      var player = s.users[input.playerId];
      if (player) {
        player.chips += POINTS.FAN_PER_PLAYER;
        player.charismaTotal += POINTS.FAN_PER_PLAYER;
        player.fansTotal += 1;
        logPoints(s, input.playerId, POINTS.FAN_PER_PLAYER, "Новый фанат на Зарубе", input.zarubaId);
        bumpDailyFans(s, input.playerId);
        if (player.fansTotal >= 10) grantAchievement(player, "ten_fans");
      }
      var fanUser = s.users[input.fanUserId];
      if (fanUser) {
        grantAchievement(fanUser, "first_fan");
        var countFans = s.fans.filter(function (f) {
          return f.fanUserId === input.fanUserId;
        }).length;
        if (countFans >= 5) grantAchievement(fanUser, "sharp_crowd");
      }
      saveStore(s);
      emit();
      return row;
    },

    sendChipsToTeam: function (input) {
      var s = loadStore();
      var team = s.teams[input.teamId];
      var fan = s.users[input.fanUserId];
      if (!team || !fan) throw new Error("Неверные данные");
      if (fan.chips < input.amount) throw new Error("Недостаточно чипсеков");
      fan.chips -= input.amount;
      team.fanPoolChips += input.amount;
      logPoints(s, input.fanUserId, -input.amount, "Скинул чипсеки команде", team.zarubaId);
      saveStore(s);
      emit();
    },

    postFanChat: function (input) {
      var s = loadStore();
      var msg = {
        id: crypto.randomUUID(),
        zarubaId: input.zarubaId,
        userId: input.userId,
        body: input.body,
        createdAt: new Date().toISOString(),
      };
      s.messages.push(msg);
      saveStore(s);
      emit();
      return msg;
    },

    listMessages: function (zarubaId) {
      return loadStore()
        .messages.filter(function (m) {
          return m.zarubaId === zarubaId;
        })
        .sort(function (a, b) {
          return a.createdAt.localeCompare(b.createdAt);
        });
    },

    listPointLogs: function (userId) {
      return loadStore().pointLogs.filter(function (p) {
        return p.userId === userId;
      });
    },

    purchaseShopItem: function (userId, itemId) {
      var s = loadStore();
      var u = s.users[userId];
      if (!u) return;
      var item = SHOP_ITEMS.find(function (i) {
        return i.id === itemId;
      });
      if (!item) throw new Error("Товар не найден");
      if (u.purchases.indexOf(itemId) !== -1) throw new Error("Уже куплено");
      if (u.chips < item.price) throw new Error("Недостаточно чипсеков");
      u.chips -= item.price;
      u.purchases.push(itemId);
      if (item.type === "cosmetic") {
        if (item.cosmeticKey === "nickColor") u.cosmetics.nickColor = item.cosmeticValue;
        if (item.cosmeticKey === "avatarFrame") u.cosmetics.avatarFrame = item.cosmeticValue;
      }
      if (item.type === "achievement" && item.achievementId) {
        grantAchievement(u, item.achievementId);
      }
      logPoints(s, userId, -item.price, "Магазин: " + item.title);
      saveStore(s);
      emit();
    },

    leaderboardByCharisma: function (limit) {
      limit = limit || 20;
      return Object.values(loadStore().users)
        .sort(function (a, b) {
          return b.charismaTotal - a.charismaTotal;
        })
        .slice(0, limit);
    },

    userStatusLabel: function (userId) {
      var u = loadStore().users[userId];
      if (!u) return "";
      return charismaStatus(u.charismaTotal);
    },

    completeOnboarding: function (userId) {
      var s = loadStore();
      var u = s.users[userId];
      if (u) {
        u.onboardingDone = true;
        saveStore(s);
        emit();
      }
    },
  };
})();
