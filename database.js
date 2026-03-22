/**
 * Database setup - Hỗ trợ cả PostgreSQL (Render) và SQLite (local dev)
 * Nếu có DATABASE_URL → dùng PostgreSQL
 * Nếu không → dùng SQLite (better-sqlite3)
 */
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;
const IS_PG = !!DATABASE_URL;

// ==========================================
//  POSTGRESQL ADAPTER
// ==========================================
let pool = null;
if (IS_PG) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// ==========================================
//  SQLITE ADAPTER (local dev fallback)
// ==========================================
let sqliteDb = null;
if (!IS_PG) {
  const Database = require('better-sqlite3');
  const DB_PATH = path.join(__dirname, 'instance', 'thuc_don_quan_doi.db');
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

// ==========================================
//  UNIFIED DB INTERFACE (async)
// ==========================================
const db = {
  /**
   * db.get(sql, ...params) → single row or null
   */
  async get(sql, ...params) {
    if (IS_PG) {
      const { pgSql, pgParams } = convertQuery(sql, params);
      const result = await pool.query(pgSql, pgParams);
      return result.rows[0] || null;
    } else {
      return sqliteDb.prepare(sql).get(...params);
    }
  },

  /**
   * db.all(sql, ...params) → array of rows
   */
  async all(sql, ...params) {
    if (IS_PG) {
      const { pgSql, pgParams } = convertQuery(sql, params);
      const result = await pool.query(pgSql, pgParams);
      return result.rows;
    } else {
      return sqliteDb.prepare(sql).all(...params);
    }
  },

  /**
   * db.run(sql, ...params) → { lastInsertRowid, changes }
   */
  async run(sql, ...params) {
    if (IS_PG) {
      const { pgSql, pgParams } = convertQuery(sql, params);
      // For INSERT, add RETURNING id to get lastInsertRowid
      let finalSql = pgSql;
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
        finalSql = pgSql + ' RETURNING id';
      }
      const result = await pool.query(finalSql, pgParams);
      return {
        lastInsertRowid: isInsert && result.rows[0] ? result.rows[0].id : 0,
        changes: result.rowCount
      };
    } else {
      return sqliteDb.prepare(sql).run(...params);
    }
  },

  /**
   * db.exec(sql) → run multiple statements (for init)
   */
  async exec(sql) {
    if (IS_PG) {
      await pool.query(sql);
    } else {
      sqliteDb.exec(sql);
    }
  },

  /** Raw pool for session store */
  pool: pool
};

// ==========================================
//  SQL CONVERTER: SQLite → PostgreSQL
// ==========================================
function convertQuery(sql, params) {
  let idx = 0;
  let pgSql = sql.replace(/\?/g, () => `$${++idx}`);

  // SQLite → PostgreSQL syntax conversions
  pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  pgSql = pgSql.replace(/datetime\('now'\)/gi, 'NOW()');
  pgSql = pgSql.replace(/CAST\(strftime\('%m',\s*(\w+)\)\s*AS INTEGER\)/gi, 'EXTRACT(MONTH FROM $1::date)::integer');

  return { pgSql, pgParams: params };
}

// ==========================================
//  TABLE CREATION (PostgreSQL-compatible)
// ==========================================
const CREATE_TABLES_PG = `
  CREATE TABLE IF NOT EXISTS don_vi (
    id SERIAL PRIMARY KEY,
    ten TEXT NOT NULL,
    cap_do TEXT,
    don_vi_cha_id INTEGER REFERENCES don_vi(id)
  );

  CREATE TABLE IF NOT EXISTS chien_si (
    id SERIAL PRIMARY KEY,
    ho_ten TEXT NOT NULL,
    cap_bac TEXT,
    chuc_vu TEXT,
    que_quan TEXT,
    vung_mien TEXT,
    ngay_sinh TEXT,
    don_vi_id INTEGER NOT NULL REFERENCES don_vi(id),
    trang_thai TEXT DEFAULT 'tai_vi'
  );

  CREATE TABLE IF NOT EXISTS nguoi_dung (
    id SERIAL PRIMARY KEY,
    ten_dang_nhap TEXT UNIQUE NOT NULL,
    ho_ten TEXT NOT NULL,
    email TEXT,
    mat_khau_hash TEXT NOT NULL,
    vai_tro TEXT DEFAULT 'chien_si',
    don_vi_id INTEGER REFERENCES don_vi(id),
    chien_si_id INTEGER REFERENCES chien_si(id),
    ngay_tao TIMESTAMP DEFAULT NOW(),
    kich_hoat INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS mon_an (
    id SERIAL PRIMARY KEY,
    ten TEXT NOT NULL,
    don_vi_id INTEGER REFERENCES don_vi(id),
    mo_ta TEXT,
    hinh_anh TEXT,
    loai TEXT,
    vung_mien TEXT,
    calo REAL DEFAULT 0, protein REAL DEFAULT 0, fat REAL DEFAULT 0, carbs REAL DEFAULT 0,
    vitamin_a REAL DEFAULT 0, vitamin_c REAL DEFAULT 0, canxi REAL DEFAULT 0, sat REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS thuc_don (
    id SERIAL PRIMARY KEY,
    ngay TEXT NOT NULL,
    bua TEXT NOT NULL,
    don_vi_id INTEGER REFERENCES don_vi(id),
    ghi_chu TEXT
  );

  CREATE TABLE IF NOT EXISTS thuc_don_mon_an (
    thuc_don_id INTEGER NOT NULL REFERENCES thuc_don(id) ON DELETE CASCADE,
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
    PRIMARY KEY (thuc_don_id, mon_an_id)
  );

  CREATE TABLE IF NOT EXISTS danh_gia (
    id SERIAL PRIMARY KEY,
    thuc_don_id INTEGER NOT NULL REFERENCES thuc_don(id),
    don_vi_id INTEGER REFERENCES don_vi(id),
    chien_si_id INTEGER REFERENCES chien_si(id),
    so_sao INTEGER NOT NULL,
    binh_luan TEXT,
    hinh_anh TEXT,
    an_danh INTEGER DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS gop_y (
    id SERIAL PRIMARY KEY,
    chien_si_id INTEGER REFERENCES chien_si(id),
    don_vi_id INTEGER REFERENCES don_vi(id),
    noi_dung TEXT NOT NULL,
    hinh_anh TEXT,
    an_danh INTEGER DEFAULT 1,
    da_doc INTEGER DEFAULT 0,
    phan_hoi TEXT,
    ngay_tao TIMESTAMP DEFAULT NOW(),
    ngay_phan_hoi TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS binh_chon (
    id SERIAL PRIMARY KEY,
    chien_si_id INTEGER NOT NULL REFERENCES chien_si(id),
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
    tuan TEXT,
    ngay_tao TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS cat_com (
    id SERIAL PRIMARY KEY,
    chien_si_id INTEGER NOT NULL REFERENCES chien_si(id),
    ngay_bat_dau TEXT NOT NULL,
    ngay_ket_thuc TEXT NOT NULL,
    ly_do TEXT,
    loai TEXT,
    ghi_chu TEXT,
    nguoi_bao TEXT,
    ngay_tao TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS thuc_pham_thua (
    id SERIAL PRIMARY KEY,
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
    don_vi_id INTEGER REFERENCES don_vi(id),
    ngay TEXT NOT NULL,
    luong_thua_kg REAL NOT NULL,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS thi_dua (
    id SERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL REFERENCES don_vi(id),
    ngay TEXT NOT NULL,
    diem_dung_gio REAL DEFAULT 0,
    diem_ve_sinh REAL DEFAULT 0,
    diem_tiet_kiem REAL DEFAULT 0,
    ghi_chu TEXT
  );

  CREATE TABLE IF NOT EXISTS thong_bao_hau_can (
    id SERIAL PRIMARY KEY,
    tieu_de TEXT NOT NULL,
    don_vi_id INTEGER REFERENCES don_vi(id),
    noi_dung TEXT NOT NULL,
    loai TEXT DEFAULT 'thong_bao',
    gop_y_id INTEGER REFERENCES gop_y(id),
    ghim INTEGER DEFAULT 0,
    ngay_tao TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS huong_vi_que_nha (
    id SERIAL PRIMARY KEY,
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
    don_vi_id INTEGER REFERENCES don_vi(id),
    thang INTEGER NOT NULL,
    nam INTEGER NOT NULL,
    mo_ta TEXT
  );

  CREATE TABLE IF NOT EXISTS license_keys (
    id SERIAL PRIMARY KEY,
    key_code TEXT UNIQUE NOT NULL,
    goi TEXT NOT NULL DEFAULT 'trial',
    thoi_han_ngay INTEGER NOT NULL DEFAULT 30,
    nguoi_dung_id INTEGER REFERENCES nguoi_dung(id),
    trang_thai TEXT DEFAULT 'chua_dung',
    ngay_tao TIMESTAMP DEFAULT NOW(),
    ngay_kich_hoat TIMESTAMP,
    ngay_het_han TIMESTAMP,
    ghi_chu TEXT
  );
`;

const CREATE_TABLES_SQLITE = `
  CREATE TABLE IF NOT EXISTS don_vi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten TEXT NOT NULL, cap_do TEXT, don_vi_cha_id INTEGER REFERENCES don_vi(id)
  );
  CREATE TABLE IF NOT EXISTS chien_si (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten TEXT NOT NULL, cap_bac TEXT, chuc_vu TEXT, que_quan TEXT, vung_mien TEXT,
    ngay_sinh TEXT, don_vi_id INTEGER NOT NULL REFERENCES don_vi(id), trang_thai TEXT DEFAULT 'tai_vi'
  );
  CREATE TABLE IF NOT EXISTS nguoi_dung (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_dang_nhap TEXT UNIQUE NOT NULL, ho_ten TEXT NOT NULL, email TEXT,
    mat_khau_hash TEXT NOT NULL, vai_tro TEXT DEFAULT 'chien_si',
    don_vi_id INTEGER REFERENCES don_vi(id), chien_si_id INTEGER REFERENCES chien_si(id),
    ngay_tao TEXT DEFAULT (datetime('now')), kich_hoat INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS mon_an (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten TEXT NOT NULL, don_vi_id INTEGER REFERENCES don_vi(id), mo_ta TEXT, hinh_anh TEXT,
    loai TEXT, vung_mien TEXT,
    calo REAL DEFAULT 0, protein REAL DEFAULT 0, fat REAL DEFAULT 0, carbs REAL DEFAULT 0,
    vitamin_a REAL DEFAULT 0, vitamin_c REAL DEFAULT 0, canxi REAL DEFAULT 0, sat REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS thuc_don (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay TEXT NOT NULL, bua TEXT NOT NULL, don_vi_id INTEGER REFERENCES don_vi(id), ghi_chu TEXT
  );
  CREATE TABLE IF NOT EXISTS thuc_don_mon_an (
    thuc_don_id INTEGER NOT NULL REFERENCES thuc_don(id) ON DELETE CASCADE,
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id), PRIMARY KEY (thuc_don_id, mon_an_id)
  );
  CREATE TABLE IF NOT EXISTS danh_gia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thuc_don_id INTEGER NOT NULL REFERENCES thuc_don(id), don_vi_id INTEGER REFERENCES don_vi(id),
    chien_si_id INTEGER REFERENCES chien_si(id), so_sao INTEGER NOT NULL, binh_luan TEXT,
    hinh_anh TEXT, an_danh INTEGER DEFAULT 0, ngay_tao TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gop_y (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chien_si_id INTEGER REFERENCES chien_si(id), don_vi_id INTEGER REFERENCES don_vi(id),
    noi_dung TEXT NOT NULL, hinh_anh TEXT, an_danh INTEGER DEFAULT 1, da_doc INTEGER DEFAULT 0,
    phan_hoi TEXT, ngay_tao TEXT DEFAULT (datetime('now')), ngay_phan_hoi TEXT
  );
  CREATE TABLE IF NOT EXISTS binh_chon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chien_si_id INTEGER NOT NULL REFERENCES chien_si(id),
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id), tuan TEXT, ngay_tao TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cat_com (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chien_si_id INTEGER NOT NULL REFERENCES chien_si(id),
    ngay_bat_dau TEXT NOT NULL, ngay_ket_thuc TEXT NOT NULL, ly_do TEXT, loai TEXT,
    ghi_chu TEXT, nguoi_bao TEXT, ngay_tao TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS thuc_pham_thua (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id), don_vi_id INTEGER REFERENCES don_vi(id),
    ngay TEXT NOT NULL, luong_thua_kg REAL NOT NULL, ghi_chu TEXT, ngay_tao TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS thi_dua (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_vi_id INTEGER NOT NULL REFERENCES don_vi(id), ngay TEXT NOT NULL,
    diem_dung_gio REAL DEFAULT 0, diem_ve_sinh REAL DEFAULT 0, diem_tiet_kiem REAL DEFAULT 0, ghi_chu TEXT
  );
  CREATE TABLE IF NOT EXISTS thong_bao_hau_can (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tieu_de TEXT NOT NULL, don_vi_id INTEGER REFERENCES don_vi(id), noi_dung TEXT NOT NULL,
    loai TEXT DEFAULT 'thong_bao', gop_y_id INTEGER REFERENCES gop_y(id),
    ghim INTEGER DEFAULT 0, ngay_tao TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS huong_vi_que_nha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id), don_vi_id INTEGER REFERENCES don_vi(id),
    thang INTEGER NOT NULL, nam INTEGER NOT NULL, mo_ta TEXT
  );
  CREATE TABLE IF NOT EXISTS license_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code TEXT UNIQUE NOT NULL,
    goi TEXT NOT NULL DEFAULT 'trial',
    thoi_han_ngay INTEGER NOT NULL DEFAULT 30,
    nguoi_dung_id INTEGER REFERENCES nguoi_dung(id),
    trang_thai TEXT DEFAULT 'chua_dung',
    ngay_tao TEXT DEFAULT (datetime('now')),
    ngay_kich_hoat TEXT,
    ngay_het_han TEXT,
    ghi_chu TEXT
  );
`;

// Init tables
async function initDB() {
  if (IS_PG) {
    console.log('[DB] Dang ket noi PostgreSQL...');
    await pool.query(CREATE_TABLES_PG);
    console.log('[DB] PostgreSQL - Da tao bang thanh cong');
  } else {
    console.log('[DB] Su dung SQLite (local dev)');
    sqliteDb.exec(CREATE_TABLES_SQLITE);
  }
}

// ==========================================
//  HELPER FUNCTIONS (now async)
// ==========================================

function getUserDonViId(req) {
  return req.session && req.session.user ? req.session.user.don_vi_id : null;
}

async function getDonViChildIds(dvid) {
  if (!dvid) return [];
  const ids = [dvid];
  const children = await db.all('SELECT id FROM don_vi WHERE don_vi_cha_id = ?', dvid);
  children.forEach(c => ids.push(c.id));
  return ids;
}

async function getChienSiTen(chienSiId) {
  if (!chienSiId) return null;
  const cs = await db.get('SELECT ho_ten FROM chien_si WHERE id = ?', chienSiId);
  return cs ? cs.ho_ten : null;
}

async function getDonViTen(donViId) {
  if (!donViId) return null;
  const dv = await db.get('SELECT ten FROM don_vi WHERE id = ?', donViId);
  return dv ? dv.ten : null;
}

async function getMonAnForThucDon(thucDonId) {
  return await db.all(`
    SELECT ma.* FROM mon_an ma
    JOIN thuc_don_mon_an tdma ON tdma.mon_an_id = ma.id
    WHERE tdma.thuc_don_id = ?
  `, thucDonId);
}

async function thucDonToDict(td) {
  const monAnList = await getMonAnForThucDon(td.id);
  return {
    id: td.id, ngay: td.ngay, bua: td.bua, ghi_chu: td.ghi_chu,
    mon_an: monAnList,
    tong_calo: monAnList.reduce((s, m) => s + (m.calo || 0), 0),
    tong_protein: monAnList.reduce((s, m) => s + (m.protein || 0), 0),
    tong_fat: monAnList.reduce((s, m) => s + (m.fat || 0), 0),
    tong_carbs: monAnList.reduce((s, m) => s + (m.carbs || 0), 0)
  };
}

async function danhGiaToDict(dg) {
  const csTen = (dg.chien_si_id && !dg.an_danh) ? await getChienSiTen(dg.chien_si_id) : 'Ẩn danh';
  return {
    id: dg.id, thuc_don_id: dg.thuc_don_id, chien_si_id: dg.chien_si_id,
    chien_si_ten: csTen, so_sao: dg.so_sao, binh_luan: dg.binh_luan,
    hinh_anh: dg.hinh_anh, an_danh: !!dg.an_danh, ngay_tao: dg.ngay_tao
  };
}

async function gopYToDict(gy) {
  const csTen = (gy.chien_si_id && !gy.an_danh) ? await getChienSiTen(gy.chien_si_id) : 'Ẩn danh';
  return {
    id: gy.id, chien_si_id: gy.chien_si_id, chien_si_ten: csTen,
    noi_dung: gy.noi_dung, hinh_anh: gy.hinh_anh, an_danh: !!gy.an_danh,
    da_doc: !!gy.da_doc, phan_hoi: gy.phan_hoi,
    ngay_tao: gy.ngay_tao, ngay_phan_hoi: gy.ngay_phan_hoi
  };
}

async function chienSiToDict(cs) {
  return {
    id: cs.id, ho_ten: cs.ho_ten, cap_bac: cs.cap_bac, chuc_vu: cs.chuc_vu,
    que_quan: cs.que_quan, vung_mien: cs.vung_mien, ngay_sinh: cs.ngay_sinh,
    don_vi_id: cs.don_vi_id, don_vi_ten: await getDonViTen(cs.don_vi_id), trang_thai: cs.trang_thai
  };
}

async function catComToDict(cc) {
  const cs = await db.get('SELECT ho_ten, don_vi_id FROM chien_si WHERE id = ?', cc.chien_si_id);
  return {
    id: cc.id, chien_si_id: cc.chien_si_id,
    chien_si_ten: cs ? cs.ho_ten : null,
    don_vi_ten: cs ? await getDonViTen(cs.don_vi_id) : null,
    ngay_bat_dau: cc.ngay_bat_dau, ngay_ket_thuc: cc.ngay_ket_thuc,
    ly_do: cc.ly_do, loai: cc.loai, ghi_chu: cc.ghi_chu,
    nguoi_bao: cc.nguoi_bao, ngay_tao: cc.ngay_tao
  };
}

async function thucPhamThuaToDict(tpt) {
  const ma = await db.get('SELECT ten FROM mon_an WHERE id = ?', tpt.mon_an_id);
  return {
    id: tpt.id, mon_an_id: tpt.mon_an_id, mon_an_ten: ma ? ma.ten : null,
    ngay: tpt.ngay, luong_thua_kg: tpt.luong_thua_kg, ghi_chu: tpt.ghi_chu
  };
}

async function thiDuaToDict(td) {
  return {
    id: td.id, don_vi_id: td.don_vi_id, don_vi_ten: await getDonViTen(td.don_vi_id),
    ngay: td.ngay, diem_dung_gio: td.diem_dung_gio, diem_ve_sinh: td.diem_ve_sinh,
    diem_tiet_kiem: td.diem_tiet_kiem,
    tong_diem: Math.round((td.diem_dung_gio + td.diem_ve_sinh + td.diem_tiet_kiem) * 10) / 10,
    ghi_chu: td.ghi_chu
  };
}

function nguoiDungToDict(u) {
  return {
    id: u.id, ten_dang_nhap: u.ten_dang_nhap, ho_ten: u.ho_ten,
    email: u.email, vai_tro: u.vai_tro, don_vi_id: u.don_vi_id,
    chien_si_id: u.chien_si_id, ngay_tao: u.ngay_tao
  };
}

async function donViToDict(dv) {
  const count = await db.get('SELECT COUNT(*) as c FROM chien_si WHERE don_vi_id = ?', dv.id);
  return {
    id: dv.id, ten: dv.ten, cap_do: dv.cap_do,
    don_vi_cha_id: dv.don_vi_cha_id, so_quan_so: count.c
  };
}

module.exports = {
  db, IS_PG, pool, initDB,
  getUserDonViId, getDonViChildIds, getChienSiTen, getDonViTen,
  getMonAnForThucDon, thucDonToDict, danhGiaToDict, gopYToDict,
  chienSiToDict, catComToDict, thucPhamThuaToDict, thiDuaToDict,
  nguoiDungToDict, donViToDict
};
