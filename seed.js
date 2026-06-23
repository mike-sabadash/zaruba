const { getDb, generateToken } = require('./db');
const crypto = require('crypto');
const db = getDb();

function uuid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }

// Clear existing data
db.exec('DELETE FROM point_logs; DELETE FROM messages; DELETE FROM fans; DELETE FROM team_members; DELETE FROM teams; DELETE FROM zarubas; DELETE FROM locations; DELETE FROM users;');

console.log('Seeding...');

// ─── Users ────────────────────────────────────────────
const users = [
  { phone: '79001112233', nickname: 'Лёха Лютый', chips: 450, charismaTotal: 320, wins: 7, fansTotal: 18 },
  { phone: '79002223344', nickname: 'Димон Удар', chips: 280, charismaTotal: 210, wins: 4, fansTotal: 12 },
  { phone: '79003334455', nickname: 'Саня Рыжик', chips: 150, charismaTotal: 85, wins: 2, fansTotal: 5 },
  { phone: '79004445566', nickname: 'Маша Ствол', chips: 600, charismaTotal: 510, wins: 11, fansTotal: 32 },
  { phone: '79005556677', nickname: 'Артём Молния', chips: 320, charismaTotal: 275, wins: 6, fansTotal: 15 },
  { phone: '79006667788', nickname: 'Женя Тень', chips: 190, charismaTotal: 130, wins: 3, fansTotal: 8 },
  { phone: '79007778899', nickname: 'Костя Ёжик', chips: 100, charismaTotal: 40, wins: 1, fansTotal: 2 },
  { phone: '79008889900', nickname: 'Паша Дуб', chips: 400, charismaTotal: 380, wins: 8, fansTotal: 22 },
];

const userIds = [];
users.forEach(u => {
  const id = uuid();
  userIds.push(id);
  const cosmetics = JSON.stringify({ nickColor: 'default', avatarFrame: 'none' });
  const purchases = '[]';
  let achievements = '[]';
  if (u.wins >= 5) achievements = JSON.stringify(['five_wins']);
  if (u.fansTotal >= 10) achievements = JSON.stringify(['ten_fans']);

  db.prepare(`INSERT INTO users (id, phone, nickname, chips, charismaTotal, wins, fansTotal,
    purchases, achievements, cosmetics, dailyDate, dailyFansInvited, dailyChallengeCompleted,
    onboardingDone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, u.phone, u.nickname, u.chips, u.charismaTotal, u.wins, u.fansTotal,
      purchases, achievements, cosmetics, today(), 0, 0, 1, now());
});

console.log(`  + ${users.length} users`);

// ─── Locations ────────────────────────────────────────
const locs = [
  { name: 'Корт «Северный»', lat: 55.7934, lng: 37.6165, address: 'Москва, двор у школы №123' },
  { name: 'Короб 3×3', lat: 55.7512, lng: 37.6184, address: 'Центр, баскет-площадка' },
  { name: 'Двор на Невском', lat: 59.9343, lng: 30.3351, address: 'Санкт-Петербург, Невский пр.' },
  { name: 'Стадион «Южный»', lat: 55.7156, lng: 37.6044, address: 'Южный район, ул. Спортивная 15' },
];

const locIds = [];
locs.forEach(l => {
  const id = uuid();
  locIds.push(id);
  db.prepare('INSERT INTO locations (id, name, lat, lng, address) VALUES (?, ?, ?, ?, ?)')
    .run(id, l.name, l.lat, l.lng, l.address);
});

console.log(`  + ${locs.length} locations`);

// ─── Zarubas ──────────────────────────────────────────
const future1 = new Date(Date.now() + 2 * 3600000).toISOString();
const future2 = new Date(Date.now() + 24 * 3600000).toISOString();
const past = new Date(Date.now() - 48 * 3600000).toISOString();

const zarubaData = [
  { sport: 'football_5', locationId: locIds[0], startsAt: future1, desc: 'Кто не пришёл — тот трус! 5×5 на поле.', organizerId: userIds[0], status: 'scheduled' },
  { sport: 'basketball_3', locationId: locIds[1], startsAt: future1, desc: 'Стритбол, короб 3×3. Жарко будет!', organizerId: userIds[3], status: 'live' },
  { sport: 'football_5', locationId: locIds[2], startsAt: past, desc: 'Вечерний футбол на районе', organizerId: userIds[1], status: 'finished', scoreA: 4, scoreB: 2 },
];

const zarubaIds = [];
zarubaData.forEach(z => {
  const id = uuid();
  zarubaIds.push(id);
  db.prepare(`INSERT INTO zarubas (id, sport, locationId, startsAt, description, organizerId,
    status, inviteToken, scoreA, scoreB, goals, fouls, checkIns, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, z.sport, z.locationId, z.startsAt, z.desc, z.organizerId,
      z.status, generateToken(), z.scoreA || 0, z.scoreB || 0, '[]', 0, '[]', now());
});

console.log(`  + ${zarubaData.length} zarubas`);

// ─── Teams for live zaruba ────────────────────────────
const teamAId = uuid();
const teamBId = uuid();

db.prepare('INSERT INTO teams (id, zarubaId, side, name, captainId, fanPoolChips) VALUES (?, ?, ?, ?, ?, ?)')
  .run(teamAId, zarubaIds[1], 'A', 'Огненные', userIds[3], 50);
db.prepare('INSERT INTO teams (id, zarubaId, side, name, captainId, fanPoolChips) VALUES (?, ?, ?, ?, ?, ?)')
  .run(teamBId, zarubaIds[1], 'B', 'Тени', userIds[4], 30);

db.prepare('UPDATE zarubas SET teamAId = ?, teamBId = ? WHERE id = ?')
  .run(teamAId, teamBId, zarubaIds[1]);

// Members
const teamAMembers = [userIds[3], userIds[0], userIds[5], userIds[2], userIds[6]];
const teamBMembers = [userIds[4], userIds[1], userIds[7], userIds[2]];

teamAMembers.forEach((uid, i) => {
  db.prepare('INSERT INTO team_members (teamId, userId, role, confirmed) VALUES (?, ?, ?, ?)')
    .run(teamAId, uid, i < 5 ? 'field' : 'bench', i < 5 ? 1 : 0);
});

teamBMembers.forEach((uid, i) => {
  db.prepare('INSERT INTO team_members (teamId, userId, role, confirmed) VALUES (?, ?, ?, ?)')
    .run(teamBId, uid, i < 5 ? 'field' : 'bench', 1);
});

// Referee
db.prepare('UPDATE zarubas SET refereeId = ? WHERE id = ?').run(userIds[5], zarubaIds[1]);

// Goals for live match
db.prepare('UPDATE zarubas SET scoreA = 2, scoreB = 1 WHERE id = ?').run(zarubaIds[1]);
const goals = [
  { id: uuid(), team: 'A', scorerId: userIds[3], at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: uuid(), team: 'B', scorerId: userIds[4], at: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: uuid(), team: 'A', scorerId: userIds[0], at: new Date(Date.now() - 10 * 60000).toISOString() },
];
db.prepare('UPDATE zarubas SET goals = ? WHERE id = ?').run(JSON.stringify(goals), zarubaIds[1]);

console.log('  + teams + members + goals for live match');

// ─── Fans ─────────────────────────────────────────────
const fans = [
  { zarubaId: zarubaIds[1], playerId: userIds[3], fanUserId: userIds[6] },
  { zarubaId: zarubaIds[1], playerId: userIds[0], fanUserId: userIds[7] },
];
fans.forEach(f => {
  db.prepare('INSERT INTO fans (id, zarubaId, playerId, fanUserId, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(uuid(), f.zarubaId, f.playerId, f.fanUserId, now());
});

console.log('  + fans');

// ─── Messages ─────────────────────────────────────────
const msgs = [
  { zarubaId: zarubaIds[1], userId: userIds[6], body: 'Давайте Огненные! 🔥' },
  { zarubaId: zarubaIds[1], userId: userIds[7], body: 'Тени покажут класс!' },
  { zarubaId: zarubaIds[1], userId: userIds[0], body: 'Го го, уже разминаемся!' },
];
msgs.forEach(m => {
  db.prepare('INSERT INTO messages (id, zarubaId, userId, body, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(uuid(), m.zarubaId, m.userId, m.body, now());
});

console.log('  + messages');

// ─── Point logs (sample) ──────────────────────────────
const sampleLogs = [
  { userId: userIds[0], delta: 30, reason: 'Победа в Зарубе' },
  { userId: userIds[0], delta: 5, reason: 'Гол' },
  { userId: userIds[3], delta: 25, reason: 'MVP матча' },
  { userId: userIds[4], delta: 30, reason: 'Победа в Зарубе' },
];
sampleLogs.forEach(l => {
  db.prepare('INSERT INTO point_logs (id, userId, delta, reason, zarubaId, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), l.userId, l.delta, l.reason, zarubaIds[1] || null, now());
});

console.log('  + point logs\n');
console.log('Done! Test accounts (phone → code 123456):');
users.forEach((u, i) => console.log(`  ${u.phone} → ${u.nickname}`));
console.log('\nStart: npm run dev');
