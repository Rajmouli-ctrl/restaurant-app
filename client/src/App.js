import { useEffect, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001";

function App() {

  /* =========================================================
     STATE
  ========================================================= */

  const [showLanding, setShowLanding] = useState(true);
  const [loginError, setLoginError] = useState(false);

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState({ name: "", phone: "" });
  const [menuDrafts, setMenuDrafts] = useState({});
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    price: "",
    type: "veg",
    description: "",
    imageUrl: ""
  });

  const [isOwner, setIsOwner] = useState(
    localStorage.getItem("isOwner") === "true"
  );
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [activeOwnerTab, setActiveOwnerTab] = useState("prepared");

  const [login, setLogin] = useState({ username: "", password: "" });

  const [prepared, setPrepared] = useState({});
  const [preparedDate, setPreparedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dailyWaste, setDailyWaste] = useState([]);
  const [monthlyWaste, setMonthlyWaste] = useState([]);
  const [todayPrep, setTodayPrep] = useState(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [topItems, setTopItems] = useState([]);
  const [customerInsights, setCustomerInsights] = useState({
    totalOrders: 0,
    uniqueCustomers: 0,
    repeatCustomers: []
  });
  const [todayStats, setTodayStats] = useState({
    date: new Date().toISOString().slice(0, 10),
    orders: 0,
    revenue: 0,
    reservations: 0,
    wasted: 0
  });

  /* ================= TABLE RESERVATION ================= */

  const [showReservation, setShowReservation] = useState(false);

  const [reservation, setReservation] = useState({
    name: "",
    phone: "",
    date: "",
    time: "",
    people: ""
  });

  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [dailySales, setDailySales] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedResDate, setSelectedResDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  /* =========================================================
     LOAD MENU
  ========================================================= */

  const loadMenu = () => {
    fetch(`${API_BASE}/menu`)
      .then(res => res.json())
      .then(setMenu)
      .catch(() => alert("Backend not running"));
  };

  useEffect(() => {
    loadMenu();
  }, []);
  // 🔒 Close reservation popup when leaving landing page
useEffect(() => {
  if (!showLanding) {
    setShowReservation(false);
  }
}, [showLanding]);


  /* =========================================================
     CART HELPERS
  ========================================================= */

  const getMenuQty = (id) => {
    const found = cart.find(c => c.id === id);
    return found ? found.qty : 0;
  };

  const addToCart = (item) => {
    setCart(prev => {
      const found = prev.find(i => i.id === item.id);
      if (found) {
        return prev.map(i =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const increaseQty = (id) => {
    setCart(prev =>
      prev.map(i =>
        i.id === id ? { ...i, qty: i.qty + 1 } : i
      )
    );
  };

  const decreaseQty = (id) => {
    setCart(prev =>
      prev
        .map(i =>
          i.id === id ? { ...i, qty: i.qty - 1 } : i
        )
        .filter(i => i.qty > 0)
    );
  };

  const totalAmount = cart.reduce(
    (sum, i) => sum + i.price * i.qty,
    0
  );

  /* =========================================================
     PLACE ORDER
  ========================================================= */

  const placeOrder = () => {
    if (cart.length === 0) return;
    if (!orderCustomer.name || !orderCustomer.phone) {
      alert("Please enter name and phone");
      return;
    }

    fetch(`${API_BASE}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, customer: orderCustomer })
    })
      .then(() => {
        alert("✅ Order placed successfully!");
        setCart([]);
        setShowCart(false);
        setOrderCustomer({ name: "", phone: "" });
      })
      .catch(() => alert("❌ Failed to place order"));
  };

  /* =========================================================
     OWNER LOGIN / LOGOUT
  ========================================================= */

  const loginOwner = async () => {
    const res = await fetch(`${API_BASE}/owner/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login)
    });

    if (!res.ok) {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 600);
      return;
    }

    setIsOwner(true);
    setShowOwnerLogin(false);
    localStorage.setItem("isOwner", "true");
  };

  const logoutOwner = () => {
    setIsOwner(false);
    localStorage.removeItem("isOwner");
    setShowLogoutConfirm(false);
  };

  /* =========================================================
     OWNER DATA
  ========================================================= */

  const savePrepared = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!preparedDate || preparedDate < todayStr) {
      alert("Prepared date must be today or a future date");
      return;
    }
    fetch(`${API_BASE}/prepared`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: preparedDate, items: prepared })
    });
    alert("Prepared saved");
  };

  const loadDailyWaste = () => {
    fetch(`${API_BASE}/report/daily-waste`)
      .then(res => res.json())
      .then(setDailyWaste);
  };

  const loadMonthlyWaste = () => {
    fetch(`${API_BASE}/report/monthly-waste`)
      .then(res => res.json())
      .then(setMonthlyWaste);
  };

  const loadTodayPrep = () => {
    fetch(`${API_BASE}/report/today-prep`)
      .then(res => res.json())
      .then(setTodayPrep);
  };

  const loadTopItems = () => {
    fetch(`${API_BASE}/report/top-items?limit=8`)
      .then(res => res.json())
      .then(setTopItems);
  };

  const loadCustomerInsights = () => {
    fetch(`${API_BASE}/report/customer-insights`)
      .then(res => res.json())
      .then(setCustomerInsights);
  };

  const loadTodayDashboard = () => {
    const todayKey = new Date().toISOString().slice(0, 10);

    Promise.all([
      fetch(`${API_BASE}/orders`).then(res => res.json()),
      fetch(`${API_BASE}/reservations`).then(res => res.json()),
      fetch(`${API_BASE}/report/daily-waste`).then(res => res.json())
    ])
      .then(([ordersData, reservationsData, wasteData]) => {
        const orders = (ordersData || []).filter(o => (o.time || "").startsWith(todayKey));
        const reservations = (reservationsData || []).filter(r => r.date === todayKey);
        const revenue = orders.reduce(
          (sum, o) =>
            sum +
            (o.items || []).reduce(
              (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
              0
            ),
          0
        );
        const todayWaste = (wasteData || []).find(w => w.date === todayKey);
        const wasted = todayWaste
          ? todayWaste.items.reduce((s, it) => s + (Number(it.wasted) || 0), 0)
          : 0;

        setTodayStats({
          date: todayKey,
          orders: orders.length,
          revenue,
          reservations: reservations.length,
          wasted
        });
      })
      .catch(() => {
        setTodayStats({
          date: todayKey,
          orders: 0,
          revenue: 0,
          reservations: 0,
          wasted: 0
        });
      });
  };

  const loadReservations = () => {
    fetch(`${API_BASE}/reservations`)
      .then(res => res.json())
      .then(setReservations);
  };

  const loadOrders = () => {
    fetch(`${API_BASE}/orders`)
      .then(res => res.json())
      .then(setOrders);
  };

  const updateMenuItem = (id, updates) => {
    fetch(`${API_BASE}/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(() => {
        loadMenu();
        setMenuDrafts(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      })
      .catch(() => alert("❌ Failed to update menu item"));
  };

  const deleteMenuItem = (id) => {
    fetch(`${API_BASE}/menu/${id}`, { method: "DELETE" })
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(() => loadMenu())
      .catch(() => alert("❌ Failed to delete menu item"));
  };

  const addMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      alert("Please enter name and price");
      return;
    }
    fetch(`${API_BASE}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMenuItem)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(() => {
        loadMenu();
        setNewMenuItem({
          name: "",
          price: "",
          type: "veg",
          description: "",
          imageUrl: ""
        });
      })
      .catch(() => alert("❌ Failed to add menu item"));
  };

  const loadDailySales = () => {
    fetch(`${API_BASE}/report/daily-sales`)
      .then(res => res.json())
      .then(setDailySales);
  };

  const loadMonthlyRevenue = () => {
    fetch(`${API_BASE}/report/monthly-revenue`)
      .then(res => res.json())
      .then(setMonthlyRevenue);
  };

  const downloadReportCsv = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/report/export?type=${encodeURIComponent(type)}`);
      if (!res.ok) throw new Error("Failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fallback = `${type}-report.csv`;

      a.href = url;
      a.download = match?.[1] || fallback;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("❌ Failed to download CSV");
    }
  };

  const updateOrderStatus = (id, status) => {
    fetch(`${API_BASE}/order/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(() => loadOrders())
      .catch(() => alert("❌ Failed to update order"));
  };

  const orderSteps = ["Pending", "Preparing", "Ready", "Completed"];

  const updateReservationStatus = (id, status) => {
    fetch(`${API_BASE}/reservation/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to update");
        }
        return res.json();
      })
      .then(() => loadReservations())
      .catch(() => alert("❌ Failed to update reservation"));
  };

  useEffect(() => {
    if (isOwner && activeOwnerTab === "waste") {
      loadDailyWaste();
    }
  }, [activeOwnerTab, isOwner]);

  // Prefetch waste report after owner login for instant tab switch
  useEffect(() => {
    if (isOwner) {
      loadDailyWaste();
    }
  }, [isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "orders") {
      loadOrders();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "daily") {
      loadDailySales();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "monthly") {
      loadMonthlyRevenue();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "calendar") {
      loadReservations();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "monthly-waste") {
      loadMonthlyWaste();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "today-prep") {
      loadTodayPrep();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "low-stock") {
      loadTodayPrep();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "top-items") {
      loadTopItems();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "insights") {
      loadCustomerInsights();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "dashboard") {
      loadTodayDashboard();
      loadDailySales();
    }
  }, [activeOwnerTab, isOwner]);

  useEffect(() => {
    if (isOwner && activeOwnerTab === "menu") {
      loadMenu();
    }
  }, [activeOwnerTab, isOwner]);

  // Auto-refresh daily/monthly reports every 60s when their tabs are active
  useEffect(() => {
    if (!isOwner) return;
    if (activeOwnerTab !== "daily" && activeOwnerTab !== "monthly") return;

    const id = setInterval(() => {
      if (activeOwnerTab === "daily") loadDailySales();
      if (activeOwnerTab === "monthly") loadMonthlyRevenue();
    }, 60000);

    return () => clearInterval(id);
  }, [activeOwnerTab, isOwner]);

  // Ensure daily data is available for monthly breakdown view
  useEffect(() => {
    if (isOwner && activeOwnerTab === "monthly") {
      loadDailySales();
    }
  }, [activeOwnerTab, isOwner]);

  /* =========================================================
     RESERVATION SUBMIT
  ========================================================= */

  const submitReservation = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!reservation.date || reservation.date < todayStr) {
      alert("Please select today or a future date");
      return;
    }
    if (!reservation.time) {
      alert("Please select a time");
      return;
    }
    const [hh, mm] = reservation.time.split(":").map(Number);
    const minutes = hh * 60 + mm;
    const openMinutes = 11 * 60; // 11:00 AM
    const closeMinutes = 1 * 60; // 1:00 AM (next day)
    const timeAllowed = minutes >= openMinutes || minutes <= closeMinutes;
    if (!timeAllowed) {
      alert("Please select a time between 11:00 AM and 1:00 AM");
      return;
    }

    fetch(`${API_BASE}/reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservation)
    })
      .then(() => {
        alert("✅ Reservation submitted");
        setShowReservation(false);
        setReservation({
          name: "",
          phone: "",
          date: "",
          time: "",
          people: ""
        });
      });
  };

  /* =========================================================
     UI
  ========================================================= */

  const avgOrderValue = todayStats.orders
    ? Math.round(todayStats.revenue / todayStats.orders)
    : 0;
  const ordersPace =
    todayStats.orders >= 20 ? "High" : todayStats.orders >= 8 ? "Medium" : "Low";
  const tableDemand =
    todayStats.reservations >= 12 ? "High" : todayStats.reservations >= 5 ? "Medium" : "Low";
  const wasteLevel =
    todayStats.wasted >= 25 ? "High" : todayStats.wasted >= 10 ? "Medium" : "Low";
  const dashboardTrend = [...dailySales]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(-7);
  const trendMaxRevenue = Math.max(
    1,
    ...dashboardTrend.map(d => Number(d.revenue) || 0)
  );

  return (
    <div className="app">
    {/* ===== TABLE RESERVATION (LANDING ONLY) ===== */}
{showLanding && showReservation && (
  <div
    className="reservation-overlay"
    onClick={() => setShowReservation(false)}
  >
    <div
      className="reservation-sheet"
      onClick={e => e.stopPropagation()}
    >
      <div className="reservation-handle"></div>

      <h2 className="reservation-title">Reserve Your Table</h2>
      <p className="reservation-sub">
        Experience NOIRZA in elegance
      </p>

      <input
        placeholder="Full Name"
        value={reservation.name}
        onChange={e =>
          setReservation({ ...reservation, name: e.target.value })
        }
      />

      <input
        placeholder="Phone Number"
        value={reservation.phone}
        onChange={e =>
          setReservation({ ...reservation, phone: e.target.value })
        }
      />

      <div className="reservation-row">
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={reservation.date}
          onChange={e =>
            setReservation({ ...reservation, date: e.target.value })
          }
        />
        <input
          type="time"
          value={reservation.time}
          onChange={e =>
            setReservation({ ...reservation, time: e.target.value })
          }
        />
      </div>
      <div className="reservation-note">
        Available time: 11:00 AM – 1:00 AM
      </div>

      <input
        type="number"
        placeholder="Number of Guests"
        value={reservation.people}
        onChange={e =>
          setReservation({ ...reservation, people: e.target.value })
        }
      />

      <button
        className="reservation-btn"
        onClick={submitReservation}
      >
        Confirm Reservation
      </button>
    </div>
  </div>
)}




      {/* ================= LANDING ================= */}

      {showLanding && (
        <div className="hero" style={{ backgroundImage: "url('/Restarent frontpage image.jpg')" }}>
          <div className="hero-overlay">

            <div className="hero-center">
              <h1 className="hero-title">NOIRZA</h1>
              <p className="hero-tagline">
                One table. Many cultures. One mood — NOIRZA.
              </p>

              <div className="hero-actions">
                <button className="hero-btn primary" onClick={() => setShowLanding(false)}>
                  See Menu
                </button>

                <button className="hero-btn secondary" onClick={() => setShowReservation(true)}>
                  Table Reservation
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= MAIN APP ================= */}

          {!showLanding && (
        <>

          {/* HEADER */}
          <header className="header">
            <h1 className="brand-link" onClick={() => { setShowLanding(true); setShowCart(false); }}>
              🍽 NOIRZA
            </h1>
            <div className="header-topbar">
              <span>OPENING HOURS: 11AM – 1PM</span>
              <span>CONTACT: 7013519301</span>
              <span>WE’RE HIRING — RAJMOULI517@GMAIL.COM</span>
            </div>

            <div
              className="owner-icon"
              onClick={() =>
                isOwner
                  ? setShowLogoutConfirm(true)
                  : setShowOwnerLogin(true)
              }
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#e23744" strokeWidth="2" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#e23744" strokeWidth="2" />
              </svg>
            </div>
          </header>

          {/* OWNER LOGIN MODAL */}
          {showOwnerLogin && !isOwner && (
            <div className="modal" onClick={() => setShowOwnerLogin(false)}>
              <div className={`top-login ${loginError ? "shake" : ""}`} onClick={e => e.stopPropagation()}>
                <h3>Owner Login</h3>
                <input placeholder="Username" value={login.username}
                  onChange={e => setLogin({ ...login, username: e.target.value })} />
                <input type="password" placeholder="Password" value={login.password}
                  onChange={e => setLogin({ ...login, password: e.target.value })} />
                <button onClick={loginOwner}>Login</button>
              </div>
            </div>
          )}

          {/* LOGOUT CONFIRM */}
          {showLogoutConfirm && (
            <div className="modal">
              <div className="modal-box logout-modal">
                <h3>Confirm Logout?</h3>
                <div className="logout-actions">
                  <button className="logout-yes" onClick={logoutOwner}>Yes</button>
                  <button className="logout-cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* ================= CUSTOMER VIEW ================= */}

          {!isOwner && (
            <>
              <div className="menu-grid">
                {menu.map(item => (
                  <div className="food-card" key={item.id}>
                    {item.imageUrl && (
                      <div className="food-image">
                        <img src={item.imageUrl} alt={item.name} />
                      </div>
                    )}
                    <div className="food-header">
                      <div className="food-title">
                        <h3>{item.name}</h3>
                        {item.description && (
                          <p className="food-desc">{item.description}</p>
                        )}
                      </div>
                      <span className={`dot ${item.type}`} />
                    </div>
                    <div className="food-footer">
                      <span className="price">₹{item.price}</span>
                      {getMenuQty(item.id) === 0 ? (
                        <button className="add-btn" onClick={() => addToCart(item)}>ADD</button>
                      ) : (
                        <div className="menu-qty-pill">
                          <button onClick={() => decreaseQty(item.id)}>−</button>
                          <span>{getMenuQty(item.id)}</span>
                          <button onClick={() => increaseQty(item.id)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && !showCart && (
                <div className="view-cart-bar" onClick={() => setShowCart(true)}>
                  <span>View Cart</span>
                  <span>₹{totalAmount}</span>
                </div>
              )}

              {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)} />}

              <div className={`cart-panel ${showCart ? "open" : ""}`}>
                <h3>🛒 Cart</h3>
                <div className="order-customer">
                  <input
                    placeholder="Customer name"
                    value={orderCustomer.name}
                    onChange={e => setOrderCustomer({ ...orderCustomer, name: e.target.value })}
                  />
                  <input
                    placeholder="Phone number"
                    value={orderCustomer.phone}
                    onChange={e => setOrderCustomer({ ...orderCustomer, phone: e.target.value })}
                  />
                </div>
                {cart.map(i => (
                  <div className="cart-row" key={i.id}>
                    <span className="cart-name">{i.name}</span>
                    <div className="cart-right">
                      <span className="cart-price">₹{i.price * i.qty}</span>
                      <div className="qty-control">
                        <button onClick={() => decreaseQty(i.id)}>−</button>
                        <span>{i.qty}</span>
                        <button onClick={() => increaseQty(i.id)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
                <h4>Total: ₹{totalAmount}</h4>
                <button className="place-btn" onClick={placeOrder}>Place Order</button>
              </div>
            </>
          )}

          {/* ================= OWNER PANEL ================= */}

          {isOwner && (
            <div className="owner-panel">
              <div className="owner-panel-header">
                <div className="owner-panel-title">
                  <div className="owner-badge">Owner</div>
                  <h2>Control Center</h2>
                  <p>Manage prep, waste, and reservations</p>
                </div>
                <button className="owner-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
                  Logout
                </button>
              </div>

              <div className="owner-tabs">
                <div className="owner-tab-group">
                  <div className="owner-tab-label">Operations</div>
                  <button
                    className={activeOwnerTab === "dashboard" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("dashboard");
                      loadTodayDashboard();
                    }}
                  >
                    Dashboard
                  </button>
                  <button
                    className={activeOwnerTab === "orders" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("orders");
                      loadOrders();
                    }}
                  >
                    Orders
                  </button>
                  <button
                    className={activeOwnerTab === "reservations" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("reservations");
                      loadReservations();
                    }}
                  >
                    Reservations
                  </button>
                  <button
                    className={activeOwnerTab === "calendar" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("calendar");
                      loadReservations();
                    }}
                  >
                    Calendar
                  </button>
                  <button
                    className={activeOwnerTab === "menu" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("menu");
                      loadMenu();
                    }}
                  >
                    Menu
                  </button>
                </div>

                <div className="owner-tab-group">
                  <div className="owner-tab-label">Kitchen</div>
                  <button
                    className={activeOwnerTab === "prepared" ? "active" : ""}
                    onClick={() => setActiveOwnerTab("prepared")}
                  >
                    Prepared
                  </button>
                  <button
                    className={activeOwnerTab === "today-prep" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("today-prep");
                      loadTodayPrep();
                    }}
                  >
                    Today Prep
                  </button>
                  <button
                    className={activeOwnerTab === "low-stock" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("low-stock");
                      loadTodayPrep();
                    }}
                  >
                    Low Stock
                  </button>
                  <button
                    className={activeOwnerTab === "waste" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("waste");
                      loadDailyWaste();
                    }}
                  >
                    Waste
                  </button>
                  <button
                    className={activeOwnerTab === "monthly-waste" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("monthly-waste");
                      loadMonthlyWaste();
                    }}
                  >
                    Monthly Waste
                  </button>
                </div>

                <div className="owner-tab-group">
                  <div className="owner-tab-label">Reports</div>
                  <button
                    className={activeOwnerTab === "daily" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("daily");
                      loadDailySales();
                    }}
                  >
                    Daily Sales
                  </button>
                  <button
                    className={activeOwnerTab === "monthly" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("monthly");
                      loadMonthlyRevenue();
                    }}
                  >
                    Monthly Revenue
                  </button>
                  <button
                    className={activeOwnerTab === "top-items" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("top-items");
                      loadTopItems();
                    }}
                  >
                    Top Items
                  </button>
                  <button
                    className={activeOwnerTab === "insights" ? "active" : ""}
                    onClick={() => {
                      setActiveOwnerTab("insights");
                      loadCustomerInsights();
                    }}
                  >
                    Insights
                  </button>
                </div>
              </div>

              {activeOwnerTab === "prepared" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Prepared Quantity</span>
                      <div className="prep-actions">
                        <input
                          className="prep-date"
                          type="date"
                          value={preparedDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setPreparedDate(e.target.value)}
                        />
                        <button className="owner-primary-btn" onClick={savePrepared}>Save Prep</button>
                      </div>
                    </div>
                    <div className="prep-grid">
                      {menu.map(item => (
                        <div key={item.id} className="prep-card">
                          <div className="prep-card-title">{item.name}</div>
                          <div className="prep-card-meta">
                            <span className={`dot ${item.type}`} />
                            <span>{item.type === "veg" ? "Veg" : "Non‑Veg"}</span>
                          </div>
                          <input
                            className="prep-input"
                            type="number"
                            min="0"
                            placeholder="Qty"
                            onChange={e => setPrepared({ ...prepared, [item.id]: Number(e.target.value) })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "waste" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Waste Report (Day‑Wise)</span>
                      <div className="order-controls">
                        <button className="owner-ghost-btn" onClick={loadDailyWaste}>Refresh</button>
                        <button className="owner-ghost-btn" onClick={() => downloadReportCsv("waste")}>
                          Download CSV
                        </button>
                      </div>
                    </div>
                    <div className="waste-day-list">
                      {dailyWaste.map(day => (
                        <div key={day.date} className="waste-day-card">
                          <div className="waste-day-header">
                            <strong>{day.date}</strong>
                          </div>
                          <div className="waste-day-items">
                            {day.items.map(item => (
                              <div key={item.id} className="waste-day-row">
                                <span>{item.name}</span>
                                <span>P:{item.prepared}</span>
                                <span>S:{item.sold}</span>
                                <span>W:{item.wasted}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "reservations" && (
                <>
                  <h2>📅 Reservations</h2>
                  {reservations.map(r => (
                    <div key={r.id} className="reservation-row-owner">
                      <div className="reservation-info">
                        <div>
                          <strong>{r.name}</strong> | {r.phone}
                        </div>
                        <div>
                          {r.date} {r.time} | {r.people} people
                        </div>
                        <div className={`reservation-status ${String(r.status || "Pending").toLowerCase()}`}>
                          Status: {r.status || "Pending"}
                        </div>
                      </div>
                      {(r.status === "Pending" || !r.status) && (
                        <div className="reservation-actions">
                          <button onClick={() => updateReservationStatus(r.id, "Accepted")}>
                            Accept
                          </button>
                          <button onClick={() => updateReservationStatus(r.id, "Rejected")}>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {activeOwnerTab === "calendar" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Reservation Calendar</span>
                      <div className="calendar-controls">
                        <button
                          className="owner-ghost-btn"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                            )
                          }
                        >
                          Prev
                        </button>
                        <button
                          className="owner-ghost-btn"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                            )
                          }
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

                      const counts = {};
                      reservations.forEach(r => {
                        if (!r.date) return;
                        if (!counts[r.date]) counts[r.date] = 0;
                        counts[r.date] += 1;
                      });

                      const cells = [];
                      for (let i = 0; i < firstDay; i++) cells.push(null);
                      for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                      return (
                        <>
                          <div className="calendar-title">
                            {calendarMonth.toLocaleString("default", { month: "long" })} {year}
                          </div>
                          <div className="calendar-grid">
                            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => (
                              <div key={day} className="calendar-head">{day}</div>
                            ))}
                            {cells.map((d, idx) => {
                              if (!d) return <div key={`e-${idx}`} className="calendar-cell empty" />;
                              const dateKey = `${monthKey}-${String(d).padStart(2, "0")}`;
                              const count = counts[dateKey] || 0;
                              const isSelected = selectedResDate === dateKey;
                              return (
                                <button
                                  key={dateKey}
                                  className={`calendar-cell ${isSelected ? "selected" : ""}`}
                                  onClick={() => setSelectedResDate(dateKey)}
                                >
                                  <span className="calendar-day">{d}</span>
                                  {count > 0 && <span className="calendar-badge">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                          <div className="calendar-list">
                            <div className="calendar-list-title">
                              Reservations on {selectedResDate}
                            </div>
                            {(reservations.filter(r => r.date === selectedResDate)).map(r => (
                              <div key={r.id} className="calendar-res">
                                <span>{r.time}</span>
                                <span>{r.name}</span>
                                <span>{r.phone}</span>
                                <span>{r.people} people</span>
                              </div>
                            ))}
                            {(reservations.filter(r => r.date === selectedResDate).length === 0) && (
                              <div className="calendar-empty">No reservations for this day</div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}

              {activeOwnerTab === "orders" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Placed Orders</span>
                      <div className="order-controls">
                        <button
                          className={`owner-ghost-btn ${showPendingOnly ? "active" : ""}`}
                          onClick={() => setShowPendingOnly(prev => !prev)}
                        >
                          {showPendingOnly ? "Show All" : "Pending Only"}
                        </button>
                        <button className="owner-ghost-btn" onClick={loadOrders}>Refresh</button>
                      </div>
                    </div>
                    <div className="orders-list">
                      {(showPendingOnly
                        ? orders.filter(o => (o.status || "Pending") === "Pending")
                        : orders
                      ).map(o => (
                        <div key={o.id || o.time} className="order-card">
                          <div className="order-head">
                            <div>
                              <strong>{o.customer?.name || "Unknown"}</strong>
                              <span className="order-phone"> {o.customer?.phone || ""}</span>
                            </div>
                            <span className="order-time">
                              {o.time ? new Date(o.time).toLocaleString() : ""}
                            </span>
                          </div>
                          <div className={`order-status ${String(o.status || "Pending").toLowerCase()}`}>
                            Status: {o.status || "Pending"}
                          </div>
                          <div className="order-timeline">
                            {orderSteps.map(step => (
                              <div
                                key={step}
                                className={`order-step ${step === (o.status || "Pending") ? "active" : ""}`}
                              >
                                <span className="order-step-dot" />
                                <span className="order-step-label">{step}</span>
                              </div>
                            ))}
                          </div>
                          <div className="order-items">
                            {(o.items || []).map((it, idx) => (
                              <div key={`${it.id}-${idx}`} className="order-item">
                                <span>{it.name}</span>
                                <span>×{it.qty}</span>
                              </div>
                            ))}
                          </div>
                          <div className="order-actions">
                            {orderSteps.map(step => (
                              <button
                                key={step}
                                onClick={() => updateOrderStatus(o.id, step)}
                                disabled={!o.id || step === (o.status || "Pending")}
                              >
                                {step}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "daily" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Day‑Wise Sales</span>
                      <div className="order-controls">
                        <button className="owner-ghost-btn" onClick={loadDailySales}>Refresh</button>
                        <button className="owner-ghost-btn" onClick={() => downloadReportCsv("daily")}>
                          Download CSV
                        </button>
                      </div>
                    </div>
                    <div className="report-summary">
                      {(() => {
                        const todayKey = new Date().toISOString().slice(0, 10);
                        const today = dailySales.find(d => d.date === todayKey);
                        return (
                          <>
                            <span>Today Orders: {today ? today.orders : 0}</span>
                            <span>Today Revenue: ₹{today ? today.revenue : 0}</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="sales-graph">
                      {(() => {
                        const maxRevenue = Math.max(
                          1,
                          ...dailySales.map(d => Number(d.revenue) || 0)
                        );
                        return dailySales.map(d => {
                          const pct = Math.round(((Number(d.revenue) || 0) / maxRevenue) * 100);
                          return (
                            <div key={`graph-${d.date}`} className="sales-bar-row">
                              <div className="sales-bar-label">{d.date}</div>
                              <div className="sales-bar-track">
                                <div
                                  className="sales-bar-fill"
                                  style={{ width: `${pct}%` }}
                                  title={`₹${d.revenue}`}
                                />
                              </div>
                              <div className="sales-bar-value">₹{d.revenue}</div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="report-grid">
                      {dailySales.map(d => (
                        <div key={d.date} className="report-card">
                          <div className="report-title">{d.date}</div>
                          <div className="report-metrics">
                            <span>Orders: {d.orders}</span>
                            <span>Revenue: ₹{d.revenue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "monthly" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Monthly Revenue</span>
                      <div className="order-controls">
                        <button className="owner-ghost-btn" onClick={loadMonthlyRevenue}>Refresh</button>
                        <button className="owner-ghost-btn" onClick={() => downloadReportCsv("monthly")}>
                          Download CSV
                        </button>
                      </div>
                    </div>
                    <div className="sales-graph">
                      {(() => {
                        const maxRevenue = Math.max(
                          1,
                          ...monthlyRevenue.map(m => Number(m.revenue) || 0)
                        );
                        return monthlyRevenue.map(m => {
                          const pct = Math.round(((Number(m.revenue) || 0) / maxRevenue) * 100);
                          return (
                            <div key={`mgraph-${m.month}`} className="sales-bar-row">
                              <div className="sales-bar-label">{m.month}</div>
                              <div className="sales-bar-track">
                                <div
                                  className="sales-bar-fill"
                                  style={{ width: `${pct}%` }}
                                  title={`₹${m.revenue}`}
                                />
                              </div>
                              <div className="sales-bar-value">₹{m.revenue}</div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="report-grid">
                      {monthlyRevenue.map(m => (
                        <div key={m.month} className="report-card">
                          <div className="report-title">{m.month}</div>
                          <div className="report-metrics">
                            <span>Orders: {m.orders}</span>
                            <span>Revenue: ₹{m.revenue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="monthly-breakdown">
                      <div className="monthly-breakdown-title">
                        Day Revenue ({monthlyRevenue[0]?.month || "—"})
                      </div>
                      <div className="monthly-breakdown-list">
                        {(() => {
                          const monthKey = monthlyRevenue[0]?.month;
                          const rows = monthKey
                            ? dailySales.filter(d => d.date.startsWith(monthKey))
                            : [];
                          if (rows.length === 0) {
                            return <div className="monthly-breakdown-empty">No daily data yet</div>;
                          }
                          return rows.map(d => (
                            <div key={d.date} className="monthly-breakdown-row">
                              <span>{d.date}</span>
                              <span>₹{d.revenue}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "monthly-waste" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Monthly Waste</span>
                      <button className="owner-ghost-btn" onClick={loadMonthlyWaste}>Refresh</button>
                    </div>
                    <div className="sales-graph">
                      {(() => {
                        const maxWaste = Math.max(
                          1,
                          ...monthlyWaste.map(m => Number(m.wasted) || 0)
                        );
                        return monthlyWaste.map(m => {
                          const pct = Math.round(((Number(m.wasted) || 0) / maxWaste) * 100);
                          return (
                            <div key={`mw-${m.month}`} className="sales-bar-row">
                              <div className="sales-bar-label">{m.month}</div>
                              <div className="sales-bar-track">
                                <div
                                  className="sales-bar-fill"
                                  style={{ width: `${pct}%` }}
                                  title={`${m.wasted} wasted`}
                                />
                              </div>
                              <div className="sales-bar-value">{m.wasted}</div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="report-grid">
                      {monthlyWaste.map(m => (
                        <div key={m.month} className="report-card">
                          <div className="report-title">{m.month}</div>
                          <div className="report-metrics">
                            <span>Prepared: {m.prepared}</span>
                            <span>Sold: {m.sold}</span>
                            <span>Wasted: {m.wasted}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "today-prep" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Today Prep Summary</span>
                      <button className="owner-ghost-btn" onClick={loadTodayPrep}>Refresh</button>
                    </div>
                    <div className="report-summary">
                      <span>Date: {todayPrep?.date || "—"}</span>
                    </div>
                    <div className="report-grid">
                      {(todayPrep?.items || []).map(item => (
                        <div key={item.id} className="report-card">
                          <div className="report-title">{item.name}</div>
                          <div className="report-metrics">
                            <span>Prep: {item.prepared}</span>
                            <span>Sold: {item.sold}</span>
                            <span>Left: {item.remaining}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "low-stock" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Low Stock Alerts</span>
                      <div className="low-stock-controls">
                        <label>
                          Threshold
                          <input
                            type="number"
                            min="0"
                            value={lowStockThreshold}
                            onChange={e => setLowStockThreshold(Number(e.target.value))}
                          />
                        </label>
                        <button className="owner-ghost-btn" onClick={loadTodayPrep}>Refresh</button>
                      </div>
                    </div>
                    <div className="report-summary">
                      <span>Date: {todayPrep?.date || "—"}</span>
                      <span>Showing ≤ {lowStockThreshold}</span>
                    </div>
                    <div className="report-grid">
                      {(todayPrep?.items || [])
                        .filter(item => (item.remaining || 0) <= lowStockThreshold)
                        .map(item => (
                          <div key={item.id} className="report-card low-stock-card">
                            <div className="report-title">{item.name}</div>
                            <div className="report-metrics">
                              <span>Left: {item.remaining}</span>
                              <span>Prep: {item.prepared}</span>
                              <span>Sold: {item.sold}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "top-items" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Top‑Selling Items</span>
                      <button className="owner-ghost-btn" onClick={loadTopItems}>Refresh</button>
                    </div>
                    <div className="report-grid">
                      {topItems.map(item => (
                        <div key={item.id} className="report-card">
                          <div className="report-title">{item.name}</div>
                          <div className="report-metrics">
                            <span>Sold: {item.sold}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "insights" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Customer Insights</span>
                      <button className="owner-ghost-btn" onClick={loadCustomerInsights}>Refresh</button>
                    </div>
                    <div className="report-summary">
                      <span>Total Orders: {customerInsights.totalOrders}</span>
                      <span>Unique Customers: {customerInsights.uniqueCustomers}</span>
                    </div>
                    <div className="insights-list">
                      {customerInsights.repeatCustomers.map(c => (
                        <div key={c.phone} className="insight-card">
                          <div className="report-title">{c.name}</div>
                          <div className="report-metrics">
                            <span>Phone: {c.phone}</span>
                            <span>Orders: {c.orders}</span>
                          </div>
                        </div>
                      ))}
                      {customerInsights.repeatCustomers.length === 0 && (
                        <div className="insights-empty">No repeat customers yet</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeOwnerTab === "dashboard" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Today’s Dashboard</span>
                      <button className="owner-ghost-btn" onClick={loadTodayDashboard}>Refresh</button>
                    </div>
                    <div className="dashboard-grid">
                      <div className="dashboard-card">
                        <div className="dashboard-label">Date</div>
                        <div className="dashboard-value">{todayStats.date}</div>
                      </div>
                      <div className="dashboard-card">
                        <div className="dashboard-label">Orders</div>
                        <div className="dashboard-value">{todayStats.orders}</div>
                      </div>
                      <div className="dashboard-card">
                        <div className="dashboard-label">Revenue</div>
                        <div className="dashboard-value">
                          ₹{Number(todayStats.revenue || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="dashboard-card">
                        <div className="dashboard-label">Reservations</div>
                        <div className="dashboard-value">{todayStats.reservations}</div>
                      </div>
                      <div className="dashboard-card">
                        <div className="dashboard-label">Waste</div>
                        <div className="dashboard-value">{todayStats.wasted}</div>
                      </div>
                    </div>
                    <div className="dashboard-row">
                      <div className="dashboard-card dashboard-wide">
                        <div className="dashboard-label">Quick Health</div>
                        <div className="dashboard-chips">
                          <span className={`dashboard-chip ${ordersPace.toLowerCase()}`}>
                            Orders Pace: {ordersPace}
                          </span>
                          <span className={`dashboard-chip ${tableDemand.toLowerCase()}`}>
                            Table Demand: {tableDemand}
                          </span>
                          <span className={`dashboard-chip ${wasteLevel.toLowerCase()}`}>
                            Waste Level: {wasteLevel}
                          </span>
                        </div>
                      </div>
                      <div className="dashboard-card dashboard-wide">
                        <div className="dashboard-label">Average Order Value</div>
                        <div className="dashboard-value">₹{avgOrderValue.toLocaleString("en-IN")}</div>
                        <div className="dashboard-hint">Total Revenue / Total Orders</div>
                      </div>
                    </div>
                    <div className="dashboard-actions">
                      <button className="owner-ghost-btn" onClick={() => setActiveOwnerTab("orders")}>
                        Open Orders
                      </button>
                      <button
                        className="owner-ghost-btn"
                        onClick={() => {
                          setActiveOwnerTab("reservation");
                          loadReservations();
                        }}
                      >
                        Open Reservations
                      </button>
                      <button className="owner-ghost-btn" onClick={() => setActiveOwnerTab("waste")}>
                        Open Waste Report
                      </button>
                    </div>
                    <div className="dashboard-trend">
                      <div className="dashboard-label">Last 7 Days Revenue Trend</div>
                      {dashboardTrend.length === 0 && (
                        <div className="dashboard-hint">No daily sales data yet</div>
                      )}
                      {dashboardTrend.map(d => {
                        const pct = Math.round(((Number(d.revenue) || 0) / trendMaxRevenue) * 100);
                        return (
                          <div key={`dboard-trend-${d.date}`} className="dashboard-trend-row">
                            <div className="dashboard-trend-date">{d.date}</div>
                            <div className="dashboard-trend-track">
                              <div className="dashboard-trend-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="dashboard-trend-value">₹{d.revenue}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {activeOwnerTab === "menu" && (
                <>
                  <div className="owner-section">
                    <div className="owner-section-title">
                      <span>Menu Editor</span>
                      <button className="owner-ghost-btn" onClick={loadMenu}>Refresh</button>
                    </div>

                    <div className="menu-editor-new">
                      <input
                        placeholder="Name"
                        value={newMenuItem.name}
                        onChange={e => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={newMenuItem.price}
                        onChange={e => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                      />
                      <select
                        value={newMenuItem.type}
                        onChange={e => setNewMenuItem({ ...newMenuItem, type: e.target.value })}
                      >
                        <option value="veg">Veg</option>
                        <option value="nonveg">Non‑Veg</option>
                      </select>
                      <input
                        placeholder="Image URL"
                        value={newMenuItem.imageUrl}
                        onChange={e => setNewMenuItem({ ...newMenuItem, imageUrl: e.target.value })}
                      />
                      <input
                        placeholder="Description"
                        value={newMenuItem.description}
                        onChange={e => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                      />
                      <button className="owner-primary-btn" onClick={addMenuItem}>Add Item</button>
                    </div>

                    <div className="menu-editor-list">
                      {menu.map(item => {
                        const draft = menuDrafts[item.id] || item;
                        return (
                          <div key={item.id} className="menu-editor-card">
                            <div className="menu-editor-row">
                              <input
                                value={draft.name}
                                onChange={e =>
                                  setMenuDrafts(prev => ({
                                    ...prev,
                                    [item.id]: { ...draft, name: e.target.value }
                                  }))
                                }
                              />
                              <input
                                type="number"
                                value={draft.price}
                                onChange={e =>
                                  setMenuDrafts(prev => ({
                                    ...prev,
                                    [item.id]: { ...draft, price: e.target.value }
                                  }))
                                }
                              />
                              <select
                                value={draft.type}
                                onChange={e =>
                                  setMenuDrafts(prev => ({
                                    ...prev,
                                    [item.id]: { ...draft, type: e.target.value }
                                  }))
                                }
                              >
                                <option value="veg">Veg</option>
                                <option value="nonveg">Non‑Veg</option>
                              </select>
                            </div>
                            <div className="menu-editor-row">
                              <input
                                placeholder="Image URL"
                                value={draft.imageUrl || ""}
                                onChange={e =>
                                  setMenuDrafts(prev => ({
                                    ...prev,
                                    [item.id]: { ...draft, imageUrl: e.target.value }
                                  }))
                                }
                              />
                              <input
                                placeholder="Description"
                                value={draft.description || ""}
                                onChange={e =>
                                  setMenuDrafts(prev => ({
                                    ...prev,
                                    [item.id]: { ...draft, description: e.target.value }
                                  }))
                                }
                              />
                            </div>
                            <div className="menu-editor-actions">
                              <button
                                className="owner-primary-btn"
                                onClick={() => updateMenuItem(item.id, draft)}
                              >
                                Save
                              </button>
                              <button
                                className="owner-ghost-btn"
                                onClick={() => deleteMenuItem(item.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

        </>
      )}

      <SpeedInsights />
    </div>
  );
}

export default App;
