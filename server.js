// server.js
import express from "express";
import session from "express-session";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// SESSION (for admin)
app.use(session({
  secret: "change_this_secret", // change this in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // secure:true requires HTTPS
}));

// ----- DATA -----
const DISHES = [
  { id: 1, name: "Biryani", price: 180 },
  { id: 2, name: "Butter Chicken", price: 150 },
  { id: 3, name: "Tandoori Chicken", price: 120 },
  { id: 4, name: "Rogan Josh", price: 100 },
  { id: 5, name: "Chicken Tikka Masala", price: 100 },
];

let ORDERS = []; // in-memory orders
// Order shape:
// { id: 'timestamp', name, phone, address, dishes: [{id,name,price}], total, status }
// status: 'pending' -> 'accepted' -> 'payment_pending' -> 'paid' or 'declined'

const ADMIN = { username: "admin", password: "1234" }; // change creds

// ----- HELPERS -----
function renderPage(title, bodyHtml) {
  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body{font-family:Arial,Helvetica,sans-serif;background:#fffaf0;margin:0;padding:20px}
      .container{max-width:760px;margin:20px auto;background:#fff;padding:18px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.06)}
      h1,h2{margin:0 0 12px}
      .dish-card{display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:#fff;margin:8px 0;box-shadow:0 2px 6px rgba(0,0,0,0.04)}
      button{cursor:pointer;border:none;border-radius:6px;padding:10px 16px}
      .btn-green{background:#28a745;color:#fff}
      .btn-orange{background:#ff6b00;color:#fff}
      .btn-blue{background:#007bff;color:#fff}
      .btn-red{background:#dc3545;color:#fff}
      input, textarea, select{padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;box-sizing:border-box}
      table{width:100%;border-collapse:collapse}
      td,th{padding:8px;border:1px solid #eee;text-align:left}
      .flex{display:flex;gap:8px;flex-wrap:wrap}
      a{color:#007bff;text-decoration:none}
    </style>
  </head>
  <body>
    <div class="container">
      ${bodyHtml}
    </div>
  </body>
  </html>`;
}

// ----- ROUTES -----
// Home
app.get("/", (req, res) => {
  res.send(renderPage("Welcome", `
    <h1>🍴 RFC Dinner Preorder</h1>
    <p>Delivery window: <b>8 PM – 11 PM</b>. Prepay required. No cancellations.</p>
    <div class="flex" style="margin-top:14px">
      <a href="/menu" class="btn-orange" style="padding:10px 20px">Start Order</a>
      <a href="/admin-login" class="btn-blue" style="padding:10px 20px">Admin Login</a>
    </div>
  `));
});

// Menu (multiple selection)
app.get("/menu", (req, res) => {
  let itemsHtml = DISHES.map(d => `
    <label class="dish-card">
      <div style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" name="dishIds" value="${d.id}">
        <div>
          <div style="font-weight:600">${d.name}</div>
          <div style="color:#666;font-size:13px">Fresh & hot</div>
        </div>
      </div>
      <div style="font-weight:600">₹${d.price}</div>
    </label>
  `).join("");

  res.send(renderPage("Menu", `
    <h2>🍽️ Select Your Dishes</h2>
    <form action="/order" method="post" id="orderForm">
      ${itemsHtml}
      <div style="margin-top:12px">
        <label>Delivery address</label><br>
        <textarea name="address" rows="3" required></textarea>
      </div>
      <div style="margin-top:12px">
        <label>Your name</label><br>
        <input name="name" required />
      </div>
      <div style="margin-top:12px">
        <label>Phone</label><br>
        <input name="phone" required />
      </div>
      <div style="margin-top:16px">
        <button type="submit" class="btn-green">Place Order</button>
        <a href="/" style="margin-left:10px">Cancel</a>
      </div>
    </form>
  `));
});

// Place order (POST)
app.post("/order", (req, res) => {
  // req.body.dishIds can be string or array depending on selection
  let dishIds = req.body.dishIds;
  if (!dishIds) return res.send(renderPage("Error", `<p>No dishes selected. <a href="/menu">Back</a></p>`));
  if (!Array.isArray(dishIds)) dishIds = [dishIds];
  const selected = DISHES.filter(d => dishIds.includes(String(d.id)));
  if (selected.length === 0) return res.send(renderPage("Error", `<p>No dishes selected. <a href="/menu">Back</a></p>`));

  const total = selected.reduce((s, d) => s + d.price, 0);
  const order = {
    id: Date.now().toString(),
    name: req.body.name || "Guest",
    phone: req.body.phone || "",
    address: req.body.address || "",
    dishes: selected,
    total,
    status: "pending",
    paid: false
  };
  ORDERS.push(order);

  // show order-received page that polls status
  res.send(renderPage("Order Received", `
    <h2>✅ Order Received</h2>
    <p>Order ID: <b>${order.id}</b></p>
    <p>Items:</p>
    <ul>${order.dishes.map(d => `<li>${d.name} — ₹${d.price}</li>`).join("")}</ul>
    <p><b>Total: ₹${order.total}</b></p>
    <p>Delivery address: ${order.address}</p>
    <p>Waiting for admin confirmation — you'll be redirected to payment when approved.</p>
    <p id="status" style="color:gray">Status: ${order.status}</p>
    <script>
      const orderId = "${order.id}";
      async function check() {
        try {
          const r = await fetch('/order-status/' + orderId);
          if (!r.ok) return;
          const j = await r.json();
          document.getElementById('status').textContent = 'Status: ' + j.status;
          if (j.status === 'accepted' || j.status === 'payment_pending') {
            // redirect to payment page
            window.location.href = '/pay/' + orderId;
          }
          if (j.status === 'declined') {
            document.getElementById('status').textContent = 'Status: declined — admin cannot deliver.';
            clearInterval(interval);
          }
        } catch(e) { console.error(e) }
      }
      const interval = setInterval(check, 4000);
      check();
    </script>
    <p><a href="/">Home</a></p>
  `));
});

// Order status API (polled by user's order page)
app.get("/order-status/:id", (req, res) => {
  const o = ORDERS.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: "not found" });
  res.json({ status: o.status });
});

// Admin login page (simple)
app.get("/admin-login", (req, res) => {
  res.send(renderPage("Admin Login", `
    <h2>🔐 Admin Login</h2>
    <form method="post" action="/admin-login">
      <div style="max-width:320px;margin:0 auto">
        <input name="username" placeholder="Username" required /><br><br>
        <input name="password" placeholder="Password" type="password" required /><br><br>
        <button type="submit" class="btn-blue">Login</button>
      </div>
    </form>
    <p style="margin-top:12px"><a href="/">Back Home</a></p>
  `));
});

// Admin login handler
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN.username && password === ADMIN.password) {
    req.session.isAdmin = true;
    res.redirect("/admin");
  } else {
    res.send(renderPage("Login Failed", `<p>Invalid credentials. <a href="/admin-login">Try again</a></p>`));
  }
});

// Admin logout
app.get("/admin-logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Admin dashboard (protected)
app.get("/admin", (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin-login");
  res.send(renderPage("Admin Panel", `
    <h2>Admin Panel</h2>
    <p><a href="/admin-logout">Logout</a></p>
    <div id="orders"></div>

    <script>
      const evtSource = new EventSource("/events");
      evtSource.onmessage = function(e) {
        const orders = JSON.parse(e.data);
        const container = document.getElementById('orders');
        if (orders.length === 0) {
          container.innerHTML = "<p>No orders yet</p>";
          return;
        }
        container.innerHTML = orders.map(o => \`
          <div style="border:1px solid #eee;padding:12px;margin:8px;border-radius:8px">
            <p><b>ID:</b> \${o.id} &nbsp; <b>Status:</b> \${o.status}\${o.paid ? ' (PAID)' : ''}</p>
            <p><b>Customer:</b> \${o.name} (\${o.phone})</p>
            <p><b>Address:</b> \${o.address}</p>
            <p><b>Items:</b> \${o.dishes.map(d => d.name + ' (₹'+d.price+')').join(', ')}</p>
            <p><b>Total:</b> ₹\${o.total}</p>
            <form method="post" action="/admin/decision" style="display:inline-block;margin-right:8px">
              <input type="hidden" name="orderId" value="\${o.id}" />
              <button name="decision" value="accept" class="btn-green">Accept</button>
              <button name="decision" value="decline" class="btn-red">Decline</button>
            </form>
            \${o.status === 'payment_pending' || o.status === 'accepted' ? \`
              <form method="post" action="/admin/mark-paid" style="display:inline-block;margin-left:8px">
                <input type="hidden" name="orderId" value="\${o.id}" />
                <button class="btn-blue">Mark Paid</button>
              </form>\` : ''}
          </div>
        \`).join('');
      };
    </script>
  `));
});


// Admin decision (accept/decline)
app.post("/admin/decision", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send("Forbidden");
  const { orderId, decision } = req.body;
  const idx = ORDERS.findIndex(o => o.id === orderId);
  if (idx === -1) return res.send("Order not found");

  const order = ORDERS[idx];
  if (decision === "accept") {
    order.status = "payment_pending"; // admin accepted and now waiting for payment
  } else {
    order.status = "declined";
  }
  res.redirect("/admin");
});

// Admin marks paid (after verifying payment in their UPI app)
app.post("/admin/mark-paid", (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send("Forbidden");
  const { orderId } = req.body;
  const order = ORDERS.find(o => o.id === orderId);
  if (!order) return res.send("Order not found");
  order.paid = true;
  order.status = "paid";
  res.redirect("/admin");
});

// Payment page (user sees QR and waits; cannot confirm)
app.get("/pay/:orderId", (req, res) => {
  const order = ORDERS.find(o => o.id === req.params.orderId);
  if (!order) return res.send(renderPage("Not Found", `<p>Order not found. <a href="/">Home</a></p>`));
  if (order.status === 'pending') {
    return res.send(renderPage("Wait", `<p>Admin has not accepted your order yet. <a href="/">Home</a></p>`));
  }
  if (order.status === 'declined') {
    return res.send(renderPage("Declined", `<p>Sorry — your order was declined by admin. <a href="/">Home</a></p>`));
  }

  // UPI link for QR (user scans and pays)
  const upiId = encodeURIComponent("disha041203@okicici"); // replace with your UPI id
  const upiLink = `upi://pay?pa=${upiId}&pn=RFC%20Dinner&am=${order.total}&cu=INR&tn=Order${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiLink)}&size=300x300`;

  res.send(renderPage("Payment", `
    <h2>Payment — Order ${order.id}</h2>
    <p><b>Amount:</b> ₹${order.total}</p>
    <img src="${qrUrl}" alt="UPI QR" style="display:block;margin:14px auto"/>
    <p>Scan with Google Pay / PhonePe / Paytm to pay.</p>
    <p><i>Important:</i> You cannot confirm payment here. Admin will verify and mark the order as paid after they see the payment in their app.</p>
<div id="confirmation" style="margin-top:20px; text-align:center; font-size:18px; color:gray;">
  Waiting for admin confirmation...
</div>

<script>
  const orderId = "${order.id}";
  async function checkPaid() {
    try {
      const r = await fetch('/api/order/' + orderId);
      if (!r.ok) return;
      const data = await r.json();
      if (data.status === 'paid' && data.paid === true) {
        document.getElementById('confirmation').innerHTML = 
          '<div style="display:inline-flex;align-items:center;gap:10px;color:#22c55e;font-weight:600;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle">' +
              '<circle cx="12" cy="12" r="10"/>' +
              '<path d="m9 12 2 2 4-4"/>' +
            '</svg>' +
            '<span>Order Confirmed</span>' +
          '</div>';
        clearInterval(interval);
      }
    } catch(e) {
      console.error(e);
    }
  }
  const interval = setInterval(checkPaid, 4000);
  checkPaid();
</script>

<p><a href="/">Home</a></p>
  `));
});

// auto referesh SSE endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendData = () => {
    res.write(`data: ${JSON.stringify(ORDERS)}\n\n`);
  };

  // Send initial data
  sendData();

  // Send updates every 3 seconds
  const interval = setInterval(sendData, 3000);

  req.on("close", () => clearInterval(interval));
});

// API to get order detail (for any client)
app.get("/api/order/:id", (req, res) => {
  const o = ORDERS.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: "not found" });
  res.json(o);
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
