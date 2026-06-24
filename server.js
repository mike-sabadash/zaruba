const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { getDb, generateToken } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const db = getDb();

// Telegram Bot Token — set via env or hardcoded for dev
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DOMAIN = process.env.DOMAIN || 'zaruba.riffkiller.fun';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function uuid() {
  return require('crypto').randomUUID();
}

function now() {
  return new Date().toISOString();
}

// ─── Telegram Auth ────────────────────────────────────
function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    urlParams.sort();

    let dataCheckArr = [];
    for (const [key, value] of urlParams) {
      dataCheckArr.push(key + '=' + value);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) return null;

    const user = JSON.parse(urlParams.get('user') || '{}');
    return user;
  } catch (e) {
    return null;
  }
}

app.post('/api/auth/telegram', (req, res) => {
  const { initData } = req.body;
  const tgUser = validateTelegramInitData(initData, TELEGRAM_BOT_TOKEN);

  if (!tgUser || !tgUser.id) {
    return res.status(401).json({ error: 'Invalid Telegram auth' });
  }

  // Find or create user
  const phone = 'tg_' + tgUser.id;
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (!user) {
    const id = uuid();
    const nickname = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    const d = new Date().toISOString().slice(0, 10);
    const myRefCode = generateToken();
    db.prepare(`INSERT INTO users (id, phone, nickname, dailyDate, referralCode, createdAt) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, phone, nickname, d, myRefCode, now());
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  res.json(parseUser(user));
});

// ─── Users ────────────────────────────────────────────
app.get('/api/users', (req, res) => {
  const rows = db.prepare('SELECT * FROM users').all();
  res.json(rows.map(parseUser));
});

app.get('/api/users/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parseUser(row));
});

app.post('/api/users/find-by-phone', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE phone = ?').get(req.body.phone);
  res.json(row ? parseUser(row) : null);
});

app.post('/api/users', (req, res) => {
  const { phone, nickname, referralCode } = req.body;
  const id = uuid();
  const d = new Date().toISOString().slice(0, 10);
  const myRefCode = generateToken();

  // Check referral
  let invitedBy = null;
  if (referralCode) {
    const referrer = db.prepare('SELECT * FROM users WHERE referralCode = ?').get(referralCode);
    if (referrer && referrer.id !== id) {
      invitedBy = referrer.id;
      // Bonus for referrer: +50 chips
      db.prepare('UPDATE users SET chips = chips + 50, referredCount = referredCount + 1 WHERE id = ?').run(referrer.id);
      logPoint(referrer.id, 50, 'Реферал: ' + nickname);
      grantAchievement(referrer.id, 'first_referral');
    }
  }

  db.prepare(`INSERT INTO users (id, phone, nickname, dailyDate, invitedBy, referralCode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, phone, nickname, d, invitedBy, myRefCode, now());

  // Bonus for new user if referred: +75 chips
  if (invitedBy) {
    db.prepare('UPDATE users SET chips = chips + 75 WHERE id = ?').run(id);
    logPoint(id, 75, 'Бонус за реферальную ссылку');
  }

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json(parseUser(row));
});

app.put('/api/users/:id', (req, res) => {
  const u = req.body;
  db.prepare(`UPDATE users SET chips=?, charismaTotal=?, wins=?, fansTotal=?, zarubasCreated=?,
    purchases=?, achievements=?, cosmetics=?, dailyDate=?, dailyFansInvited=?,
    dailyChallengeCompleted=?, onboardingDone=? WHERE id=?`)
    .run(u.chips, u.charismaTotal, u.wins, u.fansTotal, u.zarubasCreated,
      JSON.stringify(u.purchases), JSON.stringify(u.achievements), JSON.stringify(u.cosmetics),
      u.daily.date, u.daily.fansInvited, u.daily.challengeCompleted ? 1 : 0,
      u.onboardingDone ? 1 : 0, u.id);
  res.json({ ok: true });
});

// ─── Locations ────────────────────────────────────────
app.get('/api/locations', (req, res) => {
  res.json(db.prepare('SELECT * FROM locations').all());
});

app.post('/api/locations', (req, res) => {
  const id = uuid();
  const { name, lat, lng, address } = req.body;
  db.prepare('INSERT INTO locations (id, name, lat, lng, address) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, lat, lng, address || null);
  res.json({ id, name, lat, lng, address });
});

// ─── Zarubas ──────────────────────────────────────────
app.get('/api/zarubas', (req, res) => {
  const rows = db.prepare('SELECT * FROM zarubas ORDER BY startsAt DESC').all();
  res.json(rows.map(parseZaruba));
});

app.get('/api/zarubas/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parseZaruba(row));
});

app.post('/api/zarubas', (req, res) => {
  const id = uuid();
  const { sport, locationId, startsAt, description, organizerId } = req.body;
  const inviteToken = generateToken();
  db.prepare(`INSERT INTO zarubas (id, sport, locationId, startsAt, description, organizerId, inviteToken, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, sport, locationId, startsAt, description || '', organizerId, inviteToken, now());
  db.prepare('UPDATE users SET zarubasCreated = zarubasCreated + 1 WHERE id = ?').run(organizerId);
  grantAchievement(organizerId, 'first_zaruba');
  res.json(parseZaruba(db.prepare('SELECT * FROM zarubas WHERE id = ?').get(id)));
});

// ─── Teams ────────────────────────────────────────────
app.get('/api/teams/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.get('/api/zarubas/:zarubaId/teams', (req, res) => {
  res.json(db.prepare('SELECT * FROM teams WHERE zarubaId = ?').all(req.params.zarubaId));
});

app.get('/api/teams/:teamId/members', (req, res) => {
  res.json(db.prepare('SELECT * FROM team_members WHERE teamId = ?').all(req.params.teamId));
});

app.post('/api/teams', (req, res) => {
  const id = uuid();
  const { zarubaId, side, name, captainId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(zarubaId);
  if (!z) return res.status(400).json({ error: 'Zaruba not found' });
  if (side === 'A' && z.teamAId) return res.status(400).json({ error: 'Side A taken' });
  if (side === 'B' && z.teamBId) return res.status(400).json({ error: 'Side B taken' });

  db.prepare('INSERT INTO teams (id, zarubaId, side, name, captainId) VALUES (?, ?, ?, ?, ?)')
    .run(id, zarubaId, side, name, captainId);
  db.prepare('INSERT INTO team_members (teamId, userId, role, confirmed) VALUES (?, ?, ?, ?)')
    .run(id, captainId, 'field', 1);
  if (side === 'A') db.prepare('UPDATE zarubas SET teamAId = ? WHERE id = ?').run(id, zarubaId);
  else db.prepare('UPDATE zarubas SET teamBId = ? WHERE id = ?').run(id, zarubaId);

  res.json(db.prepare('SELECT * FROM teams WHERE id = ?').get(id));
});

app.post('/api/teams/:teamId/join', (req, res) => {
  const { userId } = req.body;
  const members = db.prepare('SELECT * FROM team_members WHERE teamId = ?').all(req.params.teamId);
  if (members.some(m => m.userId === userId)) return res.json({ ok: true });
  if (members.length >= 7) return res.status(400).json({ error: 'Команда полная' });
  const fieldCount = members.filter(m => m.role === 'field').length;
  const role = fieldCount < 5 ? 'field' : 'bench';
  db.prepare('INSERT INTO team_members (teamId, userId, role, confirmed) VALUES (?, ?, ?, ?)')
    .run(req.params.teamId, userId, role, 0);
  res.json({ ok: true });
});

app.put('/api/teams/:teamId/confirm', (req, res) => {
  const { captainId, memberUserId } = req.body;
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.teamId);
  if (!team || team.captainId !== captainId) return res.status(403).json({ error: 'Нет прав' });
  db.prepare('UPDATE team_members SET confirmed = 1 WHERE teamId = ? AND userId = ?')
    .run(req.params.teamId, memberUserId);
  res.json({ ok: true });
});

// ─── Zaruba actions ───────────────────────────────────
app.put('/api/zarubas/:id/referee', (req, res) => {
  const { organizerId, refereeId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z || z.organizerId !== organizerId) return res.status(403).json({ error: 'Нет прав' });
  db.prepare('UPDATE zarubas SET refereeId = ? WHERE id = ?').run(refereeId, req.params.id);
  res.json({ ok: true });
});

app.put('/api/zarubas/:id/start', (req, res) => {
  const { refereeId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z || z.refereeId !== refereeId) return res.status(403).json({ error: 'Нет прав' });
  if (z.status !== 'scheduled') return res.status(400).json({ error: 'Матч уже начат' });
  db.prepare('UPDATE zarubas SET status = ? WHERE id = ?').run('live', req.params.id);
  res.json({ ok: true });
});

app.post('/api/zarubas/:id/goals', (req, res) => {
  const { refereeId, team, scorerId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z || z.refereeId !== refereeId) return res.status(403).json({ error: 'Нет прав' });
  if (z.status !== 'live') return res.status(400).json({ error: 'Матч не идёт' });

  const ev = { id: uuid(), team, scorerId, at: now() };
  const goals = JSON.parse(z.goals || '[]');
  goals.push(ev);
  const scoreA = team === 'A' ? z.scoreA + 1 : z.scoreA;
  const scoreB = team === 'B' ? z.scoreB + 1 : z.scoreB;
  db.prepare('UPDATE zarubas SET goals = ?, scoreA = ?, scoreB = ? WHERE id = ?')
    .run(JSON.stringify(goals), scoreA, scoreB, req.params.id);

  const POINTS_GOAL = 5;
  const scorer = db.prepare('SELECT * FROM users WHERE id = ?').get(scorerId);
  if (scorer) {
    db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ? WHERE id = ?')
      .run(POINTS_GOAL, POINTS_GOAL, scorerId);
    logPoint(scorerId, POINTS_GOAL, 'Гол', req.params.id);
    const inMatch = goals.filter(g => g.scorerId === scorerId).length;
    if (inMatch >= 3) grantAchievement(scorerId, 'hat_trick');
  }
  res.json(ev);
});

app.put('/api/zarubas/:id/fouls', (req, res) => {
  const { refereeId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z || z.refereeId !== refereeId) return res.status(403).json({ error: 'Нет прав' });
  db.prepare('UPDATE zarubas SET fouls = fouls + 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/zarubas/:id/mvp', (req, res) => {
  const { refereeId, mvpUserId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z || z.refereeId !== refereeId) return res.status(403).json({ error: 'Нет прав' });
  db.prepare('UPDATE zarubas SET mvpUserId = ? WHERE id = ?').run(mvpUserId, req.params.id);
  res.json({ ok: true });
});

app.put('/api/zarubas/:id/checkin', (req, res) => {
  const { userId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z) return res.status(404).json({ error: 'Not found' });
  const checkIns = JSON.parse(z.checkIns || '[]');
  if (checkIns.includes(userId)) return res.json({ ok: true });
  checkIns.push(userId);
  db.prepare('UPDATE zarubas SET checkIns = ? WHERE id = ?').run(JSON.stringify(checkIns), req.params.id);
  const POINTS_CHECKIN = 10;
  db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ? WHERE id = ?')
    .run(POINTS_CHECKIN, POINTS_CHECKIN, userId);
  logPoint(userId, POINTS_CHECKIN, 'Присутствие на матче', req.params.id);
  res.json({ ok: true });
});

app.put('/api/zarubas/:id/finish', (req, res) => {
  const { refereeId } = req.body;
  const z = db.prepare('SELECT * FROM zarubas WHERE id = ?').get(req.params.id);
  if (!z || z.refereeId !== refereeId) return res.status(403).json({ error: 'Нет прав' });
  if (z.status === 'finished') return res.json({ ok: true });

  const POINTS = { WIN_PLAYER: 30, MVP: 25, CAPTAIN_WIN_BONUS: 20 };
  const winSide = z.scoreA > z.scoreB ? 'A' : z.scoreB > z.scoreA ? 'B' : 'draw';

  function rewardTeam(side) {
    const teamCol = side === 'A' ? 'teamAId' : 'teamBId';
    const teamId = z[teamCol];
    if (!teamId) return;
    const members = db.prepare('SELECT * FROM team_members WHERE teamId = ? AND confirmed = 1').all(teamId);
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    members.forEach(m => {
      const won = winSide === side;
      if (won) {
        db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ?, wins = wins + 1 WHERE id = ?')
          .run(POINTS.WIN_PLAYER, POINTS.WIN_PLAYER, m.userId);
        logPoint(m.userId, POINTS.WIN_PLAYER, 'Победа в Зарубе', req.params.id);
        const u = db.prepare('SELECT * FROM users WHERE id = ?').get(m.userId);
        if (u && u.wins >= 5) grantAchievement(m.userId, 'five_wins');
        if (team && team.captainId === m.userId) {
          db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ? WHERE id = ?')
            .run(POINTS.CAPTAIN_WIN_BONUS, POINTS.CAPTAIN_WIN_BONUS, m.userId);
          logPoint(m.userId, POINTS.CAPTAIN_WIN_BONUS, 'Бонус капитана', req.params.id);
        }
      }
    });
  }

  rewardTeam('A');
  rewardTeam('B');

  if (z.mvpUserId) {
    db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ? WHERE id = ?')
      .run(POINTS.MVP, POINTS.MVP, z.mvpUserId);
    logPoint(z.mvpUserId, POINTS.MVP, 'MVP матча', req.params.id);
  }

  const bonus = 25;
  db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ? WHERE id = ?')
    .run(bonus, bonus, z.organizerId);
  logPoint(z.organizerId, bonus, 'Организатор завершил Зарубу', req.params.id);

  db.prepare('UPDATE zarubas SET status = ?, finishedAt = ? WHERE id = ?')
    .run('finished', now(), req.params.id);
  res.json({ ok: true });
});

// ─── Fans ─────────────────────────────────────────────
app.get('/api/zarubas/:zarubaId/fans', (req, res) => {
  res.json(db.prepare('SELECT * FROM fans WHERE zarubaId = ?').all(req.params.zarubaId));
});

app.post('/api/fans', (req, res) => {
  const { zarubaId, playerId, fanUserId } = req.body;
  if (fanUserId === playerId) return res.status(400).json({ error: 'Нельзя быть фанатом самого себя' });
  const exists = db.prepare('SELECT * FROM fans WHERE zarubaId = ? AND fanUserId = ?').get(zarubaId, fanUserId);
  if (exists) return res.json(exists);

  const id = uuid();
  db.prepare('INSERT INTO fans (id, zarubaId, playerId, fanUserId, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, zarubaId, playerId, fanUserId, now());

  const POINTS_FAN = 5;
  db.prepare('UPDATE users SET chips = chips + ?, charismaTotal = charismaTotal + ?, fansTotal = fansTotal + 1 WHERE id = ?')
    .run(POINTS_FAN, POINTS_FAN, playerId);
  logPoint(playerId, POINTS_FAN, 'Новый фанат на Зарубе', zarubaId);
  bumpDailyFans(playerId);

  const player = db.prepare('SELECT * FROM users WHERE id = ?').get(playerId);
  if (player && player.fansTotal >= 10) grantAchievement(playerId, 'ten_fans');
  grantAchievement(fanUserId, 'first_fan');
  const fanCount = db.prepare('SELECT COUNT(*) as c FROM fans WHERE fanUserId = ?').get(fanUserId).c;
  if (fanCount >= 5) grantAchievement(fanUserId, 'sharp_crowd');

  res.json({ id, zarubaId, playerId, fanUserId, createdAt: now() });
});

// ─── Chips transfer ───────────────────────────────────
app.post('/api/chips/send', (req, res) => {
  const { teamId, fanUserId, amount } = req.body;
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  const fan = db.prepare('SELECT * FROM users WHERE id = ?').get(fanUserId);
  if (!team || !fan) return res.status(400).json({ error: 'Неверные данные' });
  if (fan.chips < amount) return res.status(400).json({ error: 'Недостаточно чипсеков' });
  db.prepare('UPDATE users SET chips = chips - ? WHERE id = ?').run(amount, fanUserId);
  db.prepare('UPDATE teams SET fanPoolChips = fanPoolChips + ? WHERE id = ?').run(amount, teamId);
  logPoint(fanUserId, -amount, 'Скинул чипсеки команде', team.zarubaId);
  res.json({ ok: true });
});

// ─── Messages ─────────────────────────────────────────
app.get('/api/zarubas/:zarubaId/messages', (req, res) => {
  res.json(db.prepare('SELECT * FROM messages WHERE zarubaId = ? ORDER BY createdAt ASC')
    .all(req.params.zarubaId));
});

app.post('/api/messages', (req, res) => {
  const { zarubaId, userId, body } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO messages (id, zarubaId, userId, body, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, zarubaId, userId, body, now());
  res.json({ id, zarubaId, userId, body, createdAt: now() });
});

// ─── Point Logs ───────────────────────────────────────
app.get('/api/users/:userId/points', (req, res) => {
  res.json(db.prepare('SELECT * FROM point_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT 50')
    .all(req.params.userId));
});

// ─── Leaderboard ──────────────────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(db.prepare('SELECT * FROM users ORDER BY charismaTotal DESC LIMIT ?').all(limit));
});

// ─── Shop ─────────────────────────────────────────────
app.post('/api/shop/purchase', (req, res) => {
  const { userId, itemId } = req.body;
  const SHOP_ITEMS = [
    { id: 'nick_gold', price: 300, type: 'cosmetic', cosmeticKey: 'nickColor', cosmeticValue: 'gold' },
    { id: 'nick_orange', price: 300, type: 'cosmetic', cosmeticKey: 'nickColor', cosmeticValue: 'orange' },
    { id: 'frame_unique', price: 200, type: 'cosmetic', cosmeticKey: 'avatarFrame', cosmeticValue: 'stencil' },
    { id: 'ach_own_board', price: 150, type: 'achievement', achievementId: 'own_the_board' },
    { id: 'sticker_pack', price: 250, type: 'sticker' },
  ];
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Товар не найден' });
  const purchases = JSON.parse(u.purchases || '[]');
  if (purchases.includes(itemId)) return res.status(400).json({ error: 'Уже куплено' });
  if (u.chips < item.price) return res.status(400).json({ error: 'Недостаточно чипсеков' });

  purchases.push(itemId);
  const cosmetics = JSON.parse(u.cosmetics || '{}');
  if (item.type === 'cosmetic') {
    if (item.cosmeticKey === 'nickColor') cosmetics.nickColor = item.cosmeticValue;
    if (item.cosmeticKey === 'avatarFrame') cosmetics.avatarFrame = item.cosmeticValue;
  }
  db.prepare('UPDATE users SET chips = chips - ?, purchases = ?, cosmetics = ? WHERE id = ?')
    .run(item.price, JSON.stringify(purchases), JSON.stringify(cosmetics), userId);
  if (item.type === 'achievement' && item.achievementId) grantAchievement(userId, item.achievementId);
  logPoint(userId, -item.price, 'Магазин: ' + (item.id));
  res.json({ ok: true });
});

// ─── Onboarding ───────────────────────────────────────
app.put('/api/users/:id/onboarding', (req, res) => {
  db.prepare('UPDATE users SET onboardingDone = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Referral stats ───────────────────────────────────
app.get('/api/users/:id/referrals', (req, res) => {
  const refs = db.prepare('SELECT id, nickname, createdAt FROM users WHERE invitedBy = ? ORDER BY createdAt DESC')
    .all(req.params.id);
  res.json(refs);
});

// ─── Helpers ──────────────────────────────────────────
function logPoint(userId, delta, reason, zarubaId) {
  db.prepare('INSERT INTO point_logs (id, userId, delta, reason, zarubaId, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), userId, delta, reason, zarubaId || null, now());
}

function grantAchievement(userId, achId) {
  const u = db.prepare('SELECT achievements FROM users WHERE id = ?').get(userId);
  if (!u) return;
  const arr = JSON.parse(u.achievements || '[]');
  if (!arr.includes(achId)) {
    arr.push(achId);
    db.prepare('UPDATE users SET achievements = ? WHERE id = ?').run(JSON.stringify(arr), userId);
  }
}

function bumpDailyFans(userId) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u) return;
  const today = new Date().toISOString().slice(0, 10);
  let dDate = u.dailyDate;
  let dFans = u.dailyFansInvited;
  let dDone = u.dailyChallengeCompleted;
  if (dDate !== today) { dDate = today; dFans = 0; dDone = 0; }
  dFans += 1;
  if (!dDone && dFans >= 3) {
    dDone = 1;
    db.prepare('UPDATE users SET chips = chips + 50 WHERE id = ?').run(userId);
    logPoint(userId, 50, 'Ежедневное задание: 3 фаната');
  }
  db.prepare('UPDATE users SET dailyDate = ?, dailyFansInvited = ?, dailyChallengeCompleted = ? WHERE id = ?')
    .run(dDate, dFans, dDone ? 1 : 0, userId);
}

function parseUser(row) {
  if (!row) return null;
  return {
    id: row.id, phone: row.phone, nickname: row.nickname, avatarUrl: row.avatarUrl,
    chips: row.chips, charismaTotal: row.charismaTotal, wins: row.wins,
    fansTotal: row.fansTotal, zarubasCreated: row.zarubasCreated,
    purchases: JSON.parse(row.purchases || '[]'),
    achievements: JSON.parse(row.achievements || '[]'),
    cosmetics: JSON.parse(row.cosmetics || '{"nickColor":"default","avatarFrame":"none"}'),
    daily: { date: row.dailyDate, fansInvited: row.dailyFansInvited, challengeCompleted: !!row.dailyChallengeCompleted },
    onboardingDone: !!row.onboardingDone, createdAt: row.createdAt,
    invitedBy: row.invitedBy || null,
    referralCode: row.referralCode || null,
    referredCount: row.referredCount || 0,
  };
}

function parseZaruba(row) {
  if (!row) return null;
  return {
    id: row.id, sport: row.sport, locationId: row.locationId, startsAt: row.startsAt,
    description: row.description, organizerId: row.organizerId, refereeId: row.refereeId,
    status: row.status, inviteToken: row.inviteToken,
    teamAId: row.teamAId, teamBId: row.teamBId,
    scoreA: row.scoreA, scoreB: row.scoreB, mvpUserId: row.mvpUserId,
    goals: JSON.parse(row.goals || '[]'), fouls: row.fouls,
    checkIns: JSON.parse(row.checkIns || '[]'),
    finishedAt: row.finishedAt, createdAt: row.createdAt,
  };
}

// ─── Telegram Bot Webhook ─────────────────────────────
app.post('/api/telegram/webhook', (req, res) => {
  const update = req.body;
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const from = msg.from;

    if (text === '/start') {
      // Find or create user
      const phone = 'tg_' + from.id;
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
      if (!user) {
        const id = uuid();
        const nickname = from.first_name + (from.last_name ? ' ' + from.last_name : '');
        const d = new Date().toISOString().slice(0, 10);
        const myRefCode = generateToken();
        db.prepare(`INSERT INTO users (id, phone, nickname, dailyDate, referralCode, createdAt) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(id, phone, nickname, d, myRefCode, now());
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      }

      // Send Mini App button
      const keyboard = {
        inline_keyboard: [[{ text: '⚽ Открыть Zaruba', web_app: { url: 'https://' + DOMAIN + '/miniapp.html' } }]]
      };

      sendTelegramMessage(chatId,
        '⚽ <b>Zaruba</b> — уличная спортивная платформа\n\n' +
        'Собирай банды, зарубайся дворами и районами!\n\n' +
        '🪙 Баланс: <b>' + (user ? user.chips : 0) + '</b>\n' +
        '✨ Харизма: <b>' + (user ? user.charismaTotal : 0) + ' XP</b>',
        keyboard
      );
    }

    if (text === '/help') {
      sendTelegramMessage(chatId,
        '📋 Команды:\n' +
        '/start — Открыть Zaruba\n' +
        '/help — Помощь\n' +
        '/profile — Мой профиль\n' +
        '/top — Топ района'
      );
    }

    if (text === '/profile') {
      const phone = 'tg_' + from.id;
      const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
      if (user) {
        sendTelegramMessage(chatId,
          '👤 <b>' + user.nickname + '</b>\n\n' +
          '🪙 Чипсеки: ' + user.chips + '\n' +
          '✨ Харизма: ' + user.charismaTotal + ' XP\n' +
          '🏆 Победы: ' + user.wins + '\n' +
          '📣 Фанаты: ' + user.fansTotal
        );
      }
    }

    if (text === '/top') {
      const leaders = db.prepare('SELECT nickname, charismaTotal FROM users ORDER BY charismaTotal DESC LIMIT 5').all();
      let topText = '🏆 <b>Топ района</b>\n\n';
      const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
      leaders.forEach((u, i) => {
        topText += medals[i] + ' ' + u.nickname + ' — ' + u.charismaTotal + ' XP\n';
      });
      sendTelegramMessage(chatId, topText);
    }
  }
  res.json({ ok: true });
});

function sendTelegramMessage(chatId, text, keyboard) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };
  if (keyboard) payload.reply_markup = keyboard;

  const { SocksProxyAgent } = require('socks-proxy-agent');
  const https = require('https');
  const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');
  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    agent: agent,
    timeout: 15000,
  };
  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => {
      if (res.statusCode !== 200) console.log('TG send error:', res.statusCode, body.slice(0, 200));
    });
  });
  req.on('error', (e) => console.log('TG send failed:', e.message));
  req.on('timeout', () => { req.destroy(); console.log('TG send timeout'); });
  req.write(data);
  req.end();
}

// ─── Seed check & start ───────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  console.log('No data found — run `npm run seed` to populate test data');
}

app.listen(PORT, () => {
  console.log(`\n  ⚽ Zaruba running at http://localhost:${PORT}\n`);
});
