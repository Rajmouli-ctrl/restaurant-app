const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_DB = process.env.MYSQL_DB;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;

if (!MYSQL_HOST || !MYSQL_DB || !MYSQL_USER) {
  console.error("Missing MySQL env vars. Set MYSQL_HOST, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD.");
  process.exit(1);
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 5
});

const serverDir = __dirname;
const menuFile = path.join(serverDir, "menu.json");
const ordersFile = path.join(serverDir, "orders.json");
const reservationsFile = path.join(serverDir, "reservations.json");
const preparedFile = path.join(serverDir, "prepared.json");

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function initTables(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS menu (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      type VARCHAR(20) NOT NULL,
      description TEXT,
      imageUrl TEXT
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT PRIMARY KEY,
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      status VARCHAR(20) NOT NULL,
      time DATETIME NOT NULL,
      updatedAt DATETIME NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id BIGINT NOT NULL,
      item_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      qty INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      people INT NOT NULL,
      status VARCHAR(20) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NULL
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS prepared_entries (
      date DATE PRIMARY KEY,
      items JSON NOT NULL
    )
  `);
}

async function migrate() {
  const conn = await pool.getConnection();
  try {
    await initTables(conn);

    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query("TRUNCATE TABLE order_items");
    await conn.query("TRUNCATE TABLE orders");
    await conn.query("TRUNCATE TABLE reservations");
    await conn.query("TRUNCATE TABLE prepared_entries");
    await conn.query("TRUNCATE TABLE menu");
    await conn.query("SET FOREIGN_KEY_CHECKS=1");

    const menu = readJSON(menuFile, []);
    for (const item of menu) {
      await conn.query(
        "INSERT INTO menu (id, name, price, type, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?)",
        [item.id, item.name, item.price, item.type, item.description || "", item.imageUrl || ""]
      );
    }

    const orders = readJSON(ordersFile, []);
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const orderId = o.id || Date.now() + i;
      const time = o.time ? new Date(o.time) : new Date();
      await conn.query(
        "INSERT INTO orders (id, customer_name, customer_phone, status, time) VALUES (?, ?, ?, ?, ?)",
        [
          orderId,
          o.customer?.name || "",
          o.customer?.phone || "",
          o.status || "Pending",
          time
        ]
      );
      for (const item of o.items || []) {
        await conn.query(
          "INSERT INTO order_items (order_id, item_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
          [orderId, item.id, item.name, item.price, item.qty]
        );
      }
    }

    const reservations = readJSON(reservationsFile, []);
    for (let i = 0; i < reservations.length; i++) {
      const r = reservations[i];
      if (!r.date || !r.time) {
        continue;
      }
      await conn.query(
        "INSERT INTO reservations (id, name, phone, date, time, people, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          r.id || Date.now() + i,
          r.name || "",
          r.phone || "",
          r.date,
          r.time,
          Number(r.people) || 0,
          r.status || "Pending",
          r.createdAt ? new Date(r.createdAt) : new Date()
        ]
      );
    }

    const prepared = readJSON(preparedFile, []);
    let entries = [];
    if (Array.isArray(prepared)) {
      entries = prepared;
    } else if (prepared && typeof prepared === "object") {
      entries = [
        {
          date: new Date().toISOString().slice(0, 10),
          items: prepared
        }
      ];
    }

    for (const e of entries) {
      if (!e.date) continue;
      await conn.query(
        "INSERT INTO prepared_entries (date, items) VALUES (?, ?)",
        [e.date, JSON.stringify(e.items || {})]
      );
    }

    console.log("✅ Migration completed.");
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
