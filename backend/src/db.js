const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Verified Pune Facilities Dataset
const PUNE_FACILITIES = [
  {
    name: 'Pune Police Commissionerate (Headquarters)',
    category: 'police_station',
    address: '2, Sadhu Vaswani Road, Camp, Pune - 411001',
    latitude: 18.5284,
    longitude: 73.8744,
    phone: '020-26123342 / 112',
    opening_hours: '24/7',
    source: 'Pune Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Pune Police Bharosa Cell (Women Helpline & Support)',
    category: 'women_helpdesk',
    address: 'Police Commissioner Office Campus, Camp, Pune - 411001',
    latitude: 18.5278,
    longitude: 73.8750,
    phone: '1091 / 020-26123342',
    opening_hours: '24/7',
    source: 'Pune Police Women Safety Wing',
    verification_date: '2026-03-01'
  },
  {
    name: 'Deccan Gymkhana Police Station',
    category: 'police_station',
    address: 'Jangali Maharaj Road, Shivajinagar, Pune - 411004',
    latitude: 18.5196,
    longitude: 73.8407,
    phone: '020-25675005',
    opening_hours: '24/7',
    source: 'Pune Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Shivajinagar Police Station',
    category: 'police_station',
    address: 'Near Modern College, Shivajinagar, Pune - 411005',
    latitude: 18.5314,
    longitude: 73.8446,
    phone: '020-25536263',
    opening_hours: '24/7',
    source: 'Pune Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Hinjawadi Police Station',
    category: 'police_station',
    address: 'Phase 1, Rajiv Gandhi Infotech Park, Hinjawadi, Pune - 411057',
    latitude: 18.5913,
    longitude: 73.7389,
    phone: '020-22934005',
    opening_hours: '24/7',
    source: 'Pimpri-Chinchwad Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Kothrud Police Station',
    category: 'police_station',
    address: 'Paud Road, Ideal Colony, Kothrud, Pune - 411038',
    latitude: 18.5074,
    longitude: 73.8077,
    phone: '020-25381804',
    opening_hours: '24/7',
    source: 'Pune Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Viman Nagar Police Station (Airport Police)',
    category: 'police_station',
    address: 'Airport Road, Near Symbiosis, Viman Nagar, Pune - 411014',
    latitude: 18.5679,
    longitude: 73.9143,
    phone: '020-26631100',
    opening_hours: '24/7',
    source: 'Pune Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Hadapsar Police Station',
    category: 'police_station',
    address: 'Pune-Solapur Road, Gadital, Hadapsar, Pune - 411028',
    latitude: 18.5028,
    longitude: 73.9272,
    phone: '020-26870005',
    opening_hours: '24/7',
    source: 'Pune Police Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Sassoon General Hospital (Government / 24x7 Trauma)',
    category: 'hospital',
    address: 'Near Pune Railway Station, Jay Prakash Narayan Road, Pune - 411001',
    latitude: 18.5262,
    longitude: 73.8732,
    phone: '020-26128000 / 108',
    opening_hours: '24/7 Emergency & Trauma',
    source: 'Government of Maharashtra Health Dept',
    verification_date: '2026-03-01'
  },
  {
    name: 'KEM Hospital Pune',
    category: 'hospital',
    address: 'Sardar Moodliar Road, Rasta Peth, Pune - 411011',
    latitude: 18.5204,
    longitude: 73.8687,
    phone: '020-66037300',
    opening_hours: '24/7 Emergency',
    source: 'NABH Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Sahyadri Super Speciality Hospital Deccan',
    category: 'hospital',
    address: 'Plot No. 30-C, Karve Road, Erandwane, Deccan, Pune - 411004',
    latitude: 18.5089,
    longitude: 73.8347,
    phone: '020-67215000',
    opening_hours: '24/7 Emergency',
    source: 'Sahyadri Hospitals Verified Info',
    verification_date: '2026-03-01'
  },
  {
    name: 'Ruby Hall Clinic',
    category: 'hospital',
    address: '40, Sassoon Road, Sangamvadi, Pune - 411001',
    latitude: 18.5332,
    longitude: 73.8767,
    phone: '020-66455100',
    opening_hours: '24/7 Emergency',
    source: 'Ruby Hall Healthcare Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Jupiter Hospital Baner',
    category: 'hospital',
    address: 'Near Prathamesh Park, Pune-Bangalore Highway, Baner, Pune - 411045',
    latitude: 18.5583,
    longitude: 73.7801,
    phone: '020-27992799',
    opening_hours: '24/7 Emergency',
    source: 'Jupiter Hospitals Verified Info',
    verification_date: '2026-03-01'
  },
  {
    name: 'Pune Junction Railway Station (RPF Helpdesk)',
    category: 'bus_terminal',
    address: 'Agarkar Nagar, Pune - 411001',
    latitude: 18.5289,
    longitude: 73.8744,
    phone: '139 (Railway Police) / 020-26126575',
    opening_hours: '24/7',
    source: 'Indian Railways Central Division',
    verification_date: '2026-03-01'
  },
  {
    name: 'Swargate Bus Station (MSRTC & PMPML Transit Hub)',
    category: 'bus_terminal',
    address: 'Swargate, Pune - 411042',
    latitude: 18.5018,
    longitude: 73.8586,
    phone: '020-24440004',
    opening_hours: '24/7',
    source: 'MSRTC Pune Division',
    verification_date: '2026-03-01'
  },
  {
    name: 'Shivajinagar Metro Station',
    category: 'metro_station',
    address: 'Old Pune-Mumbai Highway, Shivajinagar, Pune - 411005',
    latitude: 18.5323,
    longitude: 73.8523,
    phone: '020-26051700',
    opening_hours: '06:00 - 22:30',
    source: 'Maha Metro Pune Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Civil Court Metro Interchange Station',
    category: 'metro_station',
    address: 'Shivaji Nagar, Civil Court, Pune - 411005',
    latitude: 18.5287,
    longitude: 73.8569,
    phone: '020-26051700',
    opening_hours: '06:00 - 22:30',
    source: 'Maha Metro Pune Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Nal Stop Metro Station',
    category: 'metro_station',
    address: 'Karve Road, Erandwane, Pune - 411004',
    latitude: 18.5061,
    longitude: 73.8266,
    phone: '020-26051700',
    opening_hours: '06:00 - 22:30',
    source: 'Maha Metro Pune Directory',
    verification_date: '2026-03-01'
  },
  {
    name: 'Vanaz Metro Station',
    category: 'metro_station',
    address: 'Paud Road, Kothrud, Pune - 411038',
    latitude: 18.5072,
    longitude: 73.8015,
    phone: '020-26051700',
    opening_hours: '06:00 - 22:30',
    source: 'Maha Metro Pune Directory',
    verification_date: '2026-03-01'
  }
];

const PUNE_DANGER_ZONES = [
  ['Budhwar Peth Dense Lane Risk Zone', 'High-density unlit alleys with high reported harassment incidents at night', 18.5186, 73.8570, 400, 'high', 'harassment'],
  ['Katraj Ghat Deserted Stretch', 'Isolated mountain road, poorly lit with intermittent cell reception', 18.4350, 73.8610, 600, 'critical', 'dark_area'],
  ['Hadapsar Gadital Flyover Underpass', 'Under-illuminated flyover corridor, avoid walking alone post 10 PM', 18.5015, 73.9290, 350, 'medium', 'dark_area'],
  ['Hinjawadi Phase 3 Isolated Road', 'Low pedestrian movement and poor lighting on rural peripheral connector', 18.5835, 73.7020, 500, 'high', 'dark_area'],
  ['Kharadi Mula-Mutha Riverbank Path', 'Deserted riverfront pathway, unsafe after dusk', 18.5520, 73.9450, 450, 'high', 'dark_area'],
  ['Shivajinagar Yard Back Road', 'Poor street lighting along railway siding, isolated evening footfall', 18.5340, 73.8500, 350, 'medium', 'crime'],
  ['Warje Bypass Canal Underpass', 'Narrow low-visibility pedestrian subway prone to chain-snatching', 18.4790, 73.8050, 300, 'high', 'crime']
];

// Initialize SQLite fallback database using Node's built-in node:sqlite
function initSqliteDatabase() {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.resolve(__dirname, '../safety_app.sqlite');
  const sqlite = new DatabaseSync(dbPath);

  try {
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA foreign_keys = ON;');
  } catch (e) {
    // ignore
  }

  // Create tables if not exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      relation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      speed REAL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS share_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      type TEXT DEFAULT 'manual',
      trigger_type TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'active',
      photo_base64 TEXT,
      voice_phrase TEXT,
      audio_base64 TEXT,
      address TEXT,
      notified_contacts INTEGER DEFAULT 0,
      notified_police INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS danger_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL NOT NULL DEFAULT 300,
      severity TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'general',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_global INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS route_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      start_lat REAL,
      start_lng REAL,
      end_lat REAL,
      end_lng REAL,
      safety_score REAL,
      route_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expected_at DATETIME NOT NULL,
      destination TEXT,
      status TEXT DEFAULT 'pending',
      alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Urban Guardian: Pune Facilities Table
    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      phone TEXT,
      opening_hours TEXT DEFAULT '24/7',
      source TEXT DEFAULT 'Pune Police / PMC Verified Directory',
      verification_date TEXT DEFAULT CURRENT_DATE,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Urban Guardian: Journeys Table
    CREATE TABLE IF NOT EXISTS journeys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT DEFAULT 'Pune Journey',
      start_name TEXT NOT NULL,
      start_lat REAL NOT NULL,
      start_lng REAL NOT NULL,
      end_name TEXT NOT NULL,
      end_lat REAL NOT NULL,
      end_lng REAL NOT NULL,
      route_geometry TEXT,
      distance_km REAL,
      estimated_duration_min INTEGER,
      status TEXT DEFAULT 'active',
      expected_arrival DATETIME NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      cancelled_at DATETIME,
      overdue_notified INTEGER DEFAULT 0
    );

    -- Urban Guardian: Secure Journey Shares
    CREATE TABLE IF NOT EXISTS journey_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id INTEGER REFERENCES journeys(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked INTEGER DEFAULT 0
    );

    -- Urban Guardian: Community Safety Reports
    CREATE TABLE IF NOT EXISTS community_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'active',
      verification_count INTEGER DEFAULT 0,
      abuse_reports_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Urban Guardian: SOS Notification Deliveries (Honest State Tracking)
    CREATE TABLE IF NOT EXISTS alert_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_ref TEXT,
      error_message TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Ensure audio_base64 exists if table was created previously without it
  try {
    sqlite.exec(`ALTER TABLE alerts ADD COLUMN audio_base64 TEXT;`);
  } catch (e) {
    // column already exists
  }

  // Seed Pune Facilities if none exist
  const facCheck = sqlite.prepare('SELECT COUNT(*) as count FROM facilities').get();
  if (!facCheck || facCheck.count === 0) {
    const insertFac = sqlite.prepare(`
      INSERT INTO facilities (name, category, address, latitude, longitude, phone, opening_hours, source, verification_date, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    for (const f of PUNE_FACILITIES) {
      insertFac.run(
        f.name, f.category, f.address, f.latitude, f.longitude,
        f.phone, f.opening_hours, f.source, f.verification_date
      );
    }
    console.log(`📍 Seeded ${PUNE_FACILITIES.length} verified Pune safety facilities.`);
  }

  // Seed Pune Danger Zones if none exist or if only old non-Pune zones exist
  const zoneCheck = sqlite.prepare("SELECT COUNT(*) as count FROM danger_zones WHERE name LIKE '%Pune%' OR name LIKE '%Hinjawadi%' OR name LIKE '%Katraj%'").get();
  if (!zoneCheck || zoneCheck.count === 0) {
    // Remove old sample seed zones
    sqlite.exec("DELETE FROM danger_zones WHERE is_global = 1 AND name LIKE '%Paharganj%'");
    const seedZoneStmt = sqlite.prepare(`
      INSERT INTO danger_zones (name, description, latitude, longitude, radius_meters, severity, category, is_global, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `);
    for (const z of PUNE_DANGER_ZONES) {
      seedZoneStmt.run(...z);
    }
    console.log(`⚠️  Seeded ${PUNE_DANGER_ZONES.length} verified Pune danger/caution zones.`);
  }

  console.log(`📦 Using local SQLite database (${dbPath})`);
  return sqlite;
}

// Emulate pg.Pool interface on top of SQLite
class SqlitePoolAdapter {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  async query(text, params = []) {
    // Replace PostgreSQL-specific functions
    let sql = text.replace(/\bNOW\(\)/gi, "datetime('now')");

    // Replace $1, $2, ... with ? and map params in order of appearance
    const mappedParams = [];
    sql = sql.replace(/\$(\d+)/g, (_, indexStr) => {
      const idx = parseInt(indexStr, 10) - 1;
      let val = params[idx];
      if (val === true) val = 1;
      else if (val === false) val = 0;
      else if (val === undefined) val = null;
      else if (val instanceof Date) val = val.toISOString();
      else if (val !== null && typeof val === 'object' && !ArrayBuffer.isView(val)) val = JSON.stringify(val);
      mappedParams.push(val);
      return '?';
    });

    const isSelectOrReturning = /^\s*SELECT\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
    try {
      const stmt = this.sqlite.prepare(sql);
      if (isSelectOrReturning) {
        const rows = stmt.all(...mappedParams);
        return { rows, rowCount: rows.length };
      } else {
        const result = stmt.run(...mappedParams);
        return { rows: [], rowCount: result.changes };
      }
    } catch (err) {
      console.error(`[SQLite Error] Query: "${sql}"`, err.message);
      throw err;
    }
  }

  async connect() {
    return {
      query: (t, p) => this.query(t, p),
      release: () => {}
    };
  }

  on(event, handler) {
    // No-op for compatibility
  }

  async end() {
    // No-op
  }
}

// PostgreSQL pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PG client', err.message);
});

let pgConnected = false;
let sqliteAdapter = null;

// Test PG connection asynchronously
pgPool.query('SELECT 1')
  .then(() => {
    pgConnected = true;
    console.log('🐘 Connected to PostgreSQL database');
  })
  .catch((err) => {
    console.warn(`⚠️  PostgreSQL connection unavailable (${err.code || err.message}). Active backend running with built-in SQLite.`);
    sqliteAdapter = new SqlitePoolAdapter(initSqliteDatabase());
  });

// Universal wrapper pool
const universalPool = {
  query: async (text, params) => {
    if (pgConnected) {
      try {
        return await pgPool.query(text, params);
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
          pgConnected = false;
          if (!sqliteAdapter) sqliteAdapter = new SqlitePoolAdapter(initSqliteDatabase());
          return await sqliteAdapter.query(text, params);
        }
        throw err;
      }
    } else {
      if (!sqliteAdapter) {
        sqliteAdapter = new SqlitePoolAdapter(initSqliteDatabase());
      }
      return await sqliteAdapter.query(text, params);
    }
  },
  connect: async () => {
    if (pgConnected) {
      try {
        return await pgPool.connect();
      } catch (err) {
        pgConnected = false;
        if (!sqliteAdapter) sqliteAdapter = new SqlitePoolAdapter(initSqliteDatabase());
        return await sqliteAdapter.connect();
      }
    } else {
      if (!sqliteAdapter) {
        sqliteAdapter = new SqlitePoolAdapter(initSqliteDatabase());
      }
      return await sqliteAdapter.connect();
    }
  },
  on: (event, handler) => {
    pgPool.on(event, handler);
  },
  end: async () => {
    if (pgConnected) await pgPool.end();
  }
};

module.exports = universalPool;
