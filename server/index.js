require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- MYSQL CONFIG ----------------
const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_DB = process.env.MYSQL_DB;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;

if (!MYSQL_HOST || !MYSQL_DB || !MYSQL_USER) {
  console.warn(
    "⚠️ Missing MySQL env vars. Set MYSQL_HOST, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD."
  );
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10
});

async function initDb() {
  const conn = await pool.getConnection();
  try {
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
  } finally {
    conn.release();
  }
}

// ---------------- OWNER ----------------
const OWNER = {
  username: "owner",
  password: "admin123"
};

// ---------------- HELPERS ----------------
async function getMenu() {
  const [rows] = await pool.query("SELECT * FROM menu ORDER BY id ASC");
  return rows;
}

async function getOrders() {
  const [orders] = await pool.query(
    "SELECT * FROM orders ORDER BY time DESC"
  );
  const [items] = await pool.query(
    "SELECT * FROM order_items ORDER BY id ASC"
  );

  const byOrder = {};
  items.forEach(i => {
    if (!byOrder[i.order_id]) byOrder[i.order_id] = [];
    byOrder[i.order_id].push({
      id: i.item_id,
      name: i.name,
      price: i.price,
      qty: i.qty
    });
  });

  return orders.map(o => ({
    id: o.id,
    items: byOrder[o.id] || [],
    customer: { name: o.customer_name, phone: o.customer_phone },
    status: o.status,
    time: new Date(o.time).toISOString()
  }));
}

async function getPreparedEntries() {
  const [rows] = await pool.query(
    "SELECT date, items FROM prepared_entries ORDER BY date DESC"
  );
  return rows.map(r => ({
    date: r.date.toISOString().slice(0, 10),
    items: r.items
  }));
}

function buildDailySalesReport(orders) {
  const daily = {};
  orders.forEach(o => {
    const dayKey = o.time ? o.time.slice(0, 10) : "Unknown";
    const orderTotal = (o.items || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0),
      0
    );
    if (!daily[dayKey]) daily[dayKey] = { date: dayKey, orders: 0, revenue: 0 };
    daily[dayKey].orders += 1;
    daily[dayKey].revenue += orderTotal;
  });
  return Object.values(daily).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function buildMonthlyRevenueReport(orders) {
  const monthly = {};
  orders.forEach(o => {
    const monthKey = o.time ? o.time.slice(0, 7) : "Unknown";
    const orderTotal = (o.items || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0),
      0
    );
    if (!monthly[monthKey]) monthly[monthKey] = { month: monthKey, orders: 0, revenue: 0 };
    monthly[monthKey].orders += 1;
    monthly[monthKey].revenue += orderTotal;
  });
  return Object.values(monthly).sort((a, b) => (a.month < b.month ? 1 : -1));
}

function buildDailyWasteReport(menu, orders, preparedEntries) {
  const soldByDate = {};
  orders.forEach(order => {
    const dayKey = order.time ? order.time.slice(0, 10) : "Unknown";
    if (!soldByDate[dayKey]) soldByDate[dayKey] = {};
    (order.items || []).forEach(item => {
      const id = item.id;
      soldByDate[dayKey][id] = (soldByDate[dayKey][id] || 0) + (item.qty || 0);
    });
  });

  const report = preparedEntries.map(entry => {
    const soldItems = soldByDate[entry.date] || {};
    const items = menu.map(m => {
      const prepared = Number(entry.items?.[m.id]) || 0;
      const sold = Number(soldItems[m.id]) || 0;
      const wasted = Math.max(prepared - sold, 0);
      return {
        id: m.id,
        name: m.name,
        prepared,
        sold,
        wasted
      };
    });
    return { date: entry.date, items };
  });

  report.sort((a, b) => (a.date < b.date ? 1 : -1));
  return report;
}

function buildMonthlyWasteReport(menu, orders, preparedEntries) {
  const soldByDate = {};
  orders.forEach(order => {
    const dayKey = order.time ? order.time.slice(0, 10) : "Unknown";
    if (!soldByDate[dayKey]) soldByDate[dayKey] = {};
    (order.items || []).forEach(item => {
      const id = item.id;
      soldByDate[dayKey][id] = (soldByDate[dayKey][id] || 0) + (item.qty || 0);
    });
  });

  const monthly = {};
  preparedEntries.forEach(entry => {
    const monthKey = entry.date ? entry.date.slice(0, 7) : "Unknown";
    if (!monthly[monthKey]) {
      monthly[monthKey] = { month: monthKey, prepared: 0, sold: 0, wasted: 0 };
    }
    const soldItems = soldByDate[entry.date] || {};
    menu.forEach(m => {
      const prepared = Number(entry.items?.[m.id]) || 0;
      const sold = Number(soldItems[m.id]) || 0;
      const wasted = Math.max(prepared - sold, 0);
      monthly[monthKey].prepared += prepared;
      monthly[monthKey].sold += sold;
      monthly[monthKey].wasted += wasted;
    });
  });

  return Object.values(monthly).sort((a, b) => (a.month < b.month ? 1 : -1));
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/["\n,]/.test(str)) return `"${str.replace(/"/g, "\"\"")}"`;
  return str;
}

function buildCsv(headers, rows) {
  const headerLine = headers.join(",");
  const dataLines = rows.map(row =>
    headers.map(h => csvEscape(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

// ---------------- ROUTES ----------------
app.get("/", (req, res) => {
  res.send("✅ Backend running on http://localhost:5001");
});

// Owner login
app.post("/owner/login", (req, res) => {
  const { username, password } = req.body;
  if (username === OWNER.username && password === OWNER.password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Get menu
app.get("/menu", async (req, res) => {
  const menu = await getMenu();
  res.json(menu);
});

// Add menu item (Owner)
app.post("/menu", async (req, res) => {
  const { name, price, type, description, imageUrl } = req.body;
  const [result] = await pool.query(
    "INSERT INTO menu (name, price, type, description, imageUrl) VALUES (?, ?, ?, ?, ?)",
    [name || "New Item", Number(price) || 0, type || "veg", description || "", imageUrl || ""]
  );
  const [rows] = await pool.query("SELECT * FROM menu WHERE id = ?", [
    result.insertId
  ]);
  res.json({ success: true, item: rows[0] });
});

// Update menu item (Owner)
app.put("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, type, description, imageUrl } = req.body;
  const [result] = await pool.query(
    "UPDATE menu SET name = ?, price = ?, type = ?, description = ?, imageUrl = ? WHERE id = ?",
    [name, Number(price), type, description, imageUrl, id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const [rows] = await pool.query("SELECT * FROM menu WHERE id = ?", [id]);
  res.json({ success: true, item: rows[0] });
});

// Delete menu item (Owner)
app.delete("/menu/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM menu WHERE id = ?", [id]);
  res.json({ success: true });
});

// Place order
app.post("/order", async (req, res) => {
  const { items, customer } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ message: "No items" });

  const orderId = Date.now();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO orders (id, customer_name, customer_phone, status, time) VALUES (?, ?, ?, ?, ?)",
      [
        orderId,
        customer?.name || "",
        customer?.phone || "",
        "Pending",
        new Date()
      ]
    );

    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, item_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
        [orderId, item.id, item.name, item.price, item.qty]
      );
    }
    await conn.commit();
    res.json({ message: "Order saved successfully" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Failed to save order" });
  } finally {
    conn.release();
  }
});

// Save prepared quantity
app.post("/prepared", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const entryDate = req.body.date || today;
  const entryItems = req.body.items || req.body;

  await pool.query(
    "INSERT INTO prepared_entries (date, items) VALUES (?, ?) ON DUPLICATE KEY UPDATE items = VALUES(items)",
    [entryDate, JSON.stringify(entryItems)]
  );
  res.json({ message: "Prepared quantities saved", date: entryDate });
});

// Save reservation (Customer)
app.post("/reservation", async (req, res) => {
  const { name, phone, date, time, people } = req.body;
  const newReservation = {
    id: Date.now(),
    name,
    phone,
    date,
    time,
    people,
    status: "Pending",
    createdAt: new Date()
  };

  await pool.query(
    "INSERT INTO reservations (id, name, phone, date, time, people, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      newReservation.id,
      newReservation.name,
      newReservation.phone,
      newReservation.date,
      newReservation.time,
      newReservation.people,
      newReservation.status,
      newReservation.createdAt
    ]
  );
  res.json({ success: true });
});

// Get reservations (Owner)
app.get("/reservations", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM reservations ORDER BY date DESC, time DESC"
  );
  res.json(
    rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      date: r.date.toISOString().slice(0, 10),
      time: r.time,
      people: r.people,
      status: r.status,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null
    }))
  );
});

// Update reservation status (Owner)
app.post("/reservation/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || (status !== "Accepted" && status !== "Rejected")) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }
  const [result] = await pool.query(
    "UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?",
    [status, new Date(), id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  res.json({ success: true });
});

// Get orders (Owner)
app.get("/orders", async (req, res) => {
  const orders = await getOrders();
  res.json(orders);
});

// Update order status (Owner)
app.post("/order/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ["Pending", "Preparing", "Ready", "Completed"];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }
  const [result] = await pool.query(
    "UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?",
    [status, new Date(), id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  res.json({ success: true });
});

// Daily sales report
app.get("/report/daily-sales", async (req, res) => {
  const orders = await getOrders();
  res.json(buildDailySalesReport(orders));
});

// Monthly revenue report
app.get("/report/monthly-revenue", async (req, res) => {
  const orders = await getOrders();
  res.json(buildMonthlyRevenueReport(orders));
});

// Day-wise waste report (per item)
app.get("/report/daily-waste", async (req, res) => {
  const menu = await getMenu();
  const orders = await getOrders();
  const preparedEntries = await getPreparedEntries();
  res.json(buildDailyWasteReport(menu, orders, preparedEntries));
});

// Monthly waste report
app.get("/report/monthly-waste", async (req, res) => {
  const menu = await getMenu();
  const orders = await getOrders();
  const preparedEntries = await getPreparedEntries();
  res.json(buildMonthlyWasteReport(menu, orders, preparedEntries));
});

// Export reports as CSV
app.get("/report/export", async (req, res) => {
  const type = String(req.query.type || "").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  let headers = [];
  let rows = [];
  let filename = `report-${stamp}.csv`;

  if (type === "daily") {
    const report = buildDailySalesReport(await getOrders());
    headers = ["date", "orders", "revenue"];
    rows = report;
    filename = `daily-sales-${stamp}.csv`;
  } else if (type === "monthly") {
    const report = buildMonthlyRevenueReport(await getOrders());
    headers = ["month", "orders", "revenue"];
    rows = report;
    filename = `monthly-revenue-${stamp}.csv`;
  } else if (type === "waste") {
    const report = buildDailyWasteReport(
      await getMenu(),
      await getOrders(),
      await getPreparedEntries()
    );
    headers = ["date", "item", "prepared", "sold", "wasted"];
    rows = report.flatMap(day =>
      day.items.map(item => ({
        date: day.date,
        item: item.name,
        prepared: item.prepared,
        sold: item.sold,
        wasted: item.wasted
      }))
    );
    filename = `waste-report-${stamp}.csv`;
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid export type. Use daily, monthly, or waste."
    });
  }

  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

// Today prep summary
app.get("/report/today-prep", async (req, res) => {
  const menu = await getMenu();
  const orders = await getOrders();
  const preparedEntries = await getPreparedEntries();
  const todayKey = new Date().toISOString().slice(0, 10);

  const preparedEntry = preparedEntries.find(e => e.date === todayKey);
  const preparedItems = preparedEntry?.items || {};

  const soldItems = {};
  orders.forEach(order => {
    const dayKey = order.time ? order.time.slice(0, 10) : "Unknown";
    if (dayKey !== todayKey) return;
    (order.items || []).forEach(item => {
      soldItems[item.id] = (soldItems[item.id] || 0) + (item.qty || 0);
    });
  });

  const report = menu.map(item => {
    const prepared = Number(preparedItems[item.id]) || 0;
    const sold = Number(soldItems[item.id]) || 0;
    const remaining = Math.max(prepared - sold, 0);
    return {
      id: item.id,
      name: item.name,
      prepared,
      sold,
      remaining
    };
  });

  res.json({ date: todayKey, items: report });
});

// Top-selling items
app.get("/report/top-items", async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const menu = await getMenu();
  const orders = await getOrders();
  const counts = {};

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      counts[item.id] = (counts[item.id] || 0) + (item.qty || 0);
    });
  });

  const report = menu
    .map(m => ({
      id: m.id,
      name: m.name,
      sold: counts[m.id] || 0
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);

  res.json(report);
});

// Customer insights
app.get("/report/customer-insights", async (req, res) => {
  const orders = await getOrders();
  const customers = {};

  orders.forEach(order => {
    const phone = order.customer?.phone || "Unknown";
    const name = order.customer?.name || "Unknown";
    if (!customers[phone]) {
      customers[phone] = { phone, name, orders: 0 };
    }
    customers[phone].orders += 1;
  });

  const list = Object.values(customers).sort((a, b) => b.orders - a.orders);
  const repeat = list.filter(c => c.phone !== "Unknown" && c.orders > 1);

  res.json({
    totalOrders: orders.length,
    uniqueCustomers: list.filter(c => c.phone !== "Unknown").length,
    repeatCustomers: repeat
  });
});

// ---------------- START SERVER ----------------
initDb()
  .then(() => {
    const port = Number(process.env.PORT || 5001);
    app.listen(port, () => {
      console.log(`🚀 Backend running on port ${port}`);
    });
  })
  .catch(err => {
    console.error("❌ Failed to init DB:", err.message);
    process.exit(1);
  });
