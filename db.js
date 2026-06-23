const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'zaruba.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      nickname TEXT,
      avatarUrl TEXT,
      chips INTEGER DEFAULT 100,
      charismaTotal INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      fansTotal INTEGER DEFAULT 0,
      zarubasCreated INTEGER DEFAULT 0,
      purchases TEXT DEFAULT '[]',
      achievements TEXT DEFAULT '[]',
      cosmetics TEXT DEFAULT '{"nickColor":"default","avatarFrame":"none"}',
      dailyDate TEXT,
      dailyFansInvited INTEGER DEFAULT 0,
      dailyChallengeCompleted INTEGER DEFAULT 0,
      onboardingDone INTEGER DEFAULT 0,
      invitedBy TEXT,
      referralCode TEXT UNIQUE,
      referredCount INTEGER DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT,
      lat REAL,
      lng REAL,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS zarubas (
      id TEXT PRIMARY KEY,
      sport TEXT,
      locationId TEXT,
      startsAt TEXT,
      description TEXT,
      organizerId TEXT,
      refereeId TEXT,
      status TEXT DEFAULT 'scheduled',
      inviteToken TEXT,
      teamAId TEXT,
      teamBId TEXT,
      scoreA INTEGER DEFAULT 0,
      scoreB INTEGER DEFAULT 0,
      mvpUserId TEXT,
      goals TEXT DEFAULT '[]',
      fouls INTEGER DEFAULT 0,
      checkIns TEXT DEFAULT '[]',
      finishedAt TEXT,
      createdAt TEXT,
      FOREIGN KEY (organizerId) REFERENCES users(id),
      FOREIGN KEY (locationId) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      zarubaId TEXT,
      side TEXT,
      name TEXT,
      captainId TEXT,
      logoUrl TEXT,
      fanPoolChips INTEGER DEFAULT 0,
      FOREIGN KEY (zarubaId) REFERENCES zarubas(id),
      FOREIGN KEY (captainId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamId TEXT,
      userId TEXT,
      role TEXT DEFAULT 'field',
      confirmed INTEGER DEFAULT 0,
      FOREIGN KEY (teamId) REFERENCES teams(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fans (
      id TEXT PRIMARY KEY,
      zarubaId TEXT,
      playerId TEXT,
      fanUserId TEXT,
      createdAt TEXT,
      FOREIGN KEY (zarubaId) REFERENCES zarubas(id),
      FOREIGN KEY (playerId) REFERENCES users(id),
      FOREIGN KEY (fanUserId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      zarubaId TEXT,
      userId TEXT,
      body TEXT,
      createdAt TEXT,
      FOREIGN KEY (zarubaId) REFERENCES zarubas(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS point_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      delta INTEGER,
      reason TEXT,
      zarubaId TEXT,
      createdAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // Migrations for existing databases
  const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!cols.includes('invitedBy')) db.exec("ALTER TABLE users ADD COLUMN invitedBy TEXT");
  if (!cols.includes('referralCode')) db.exec("ALTER TABLE users ADD COLUMN referralCode TEXT");
  if (!cols.includes('referredCount')) db.exec("ALTER TABLE users ADD COLUMN referredCount INTEGER DEFAULT 0");
}

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

module.exports = { getDb, generateToken };
