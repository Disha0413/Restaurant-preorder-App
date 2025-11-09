async function loadMenu() {
  const res = await fetch("/api/menu");
  const dishes = await res.json();
  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML = "";
  dishes.forEach(d => {
    menuDiv.innerHTML += `
      <div class="flex justify-between items-center border-b pb-2">
        <div>
          <h3 class="font-semibold">${d.name}</h3>
          <p class="text-sm text-gray-600">₹${d.price}</p>
        </div>
        <input type="number" min="0" id="dish-${d.id}" class="border p-1 w-16 text-center" placeholder="0">
      </div>
    `;
  });
}

document.getElementById("placeOrder").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  if (!name || !phone) {
    alert("Enter name and phone!");
    return;
  }

  const res = await fetch("/api/menu");
  const dishes = await res.json();

  const items = [];
  let total = 0;
  dishes.forEach(d => {
    const qty = parseInt(document.getElementById(`dish-${d.id}`).value) || 0;
    if (qty > 0) {
      items.push({ name: d.name, qty, price: d.price });
      total += d.price * qty;
    }
  });

  if (items.length === 0) {
    alert("Select at least one dish!");
    return;
  }

  // Mock payment step (replace with Razorpay/Stripe in production)
  const confirmPay = confirm(`Total ₹${total}. Proceed to pay & preorder?`);
  if (!confirmPay) return;

  const response = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, items, totalAmount: total })
  });
  const data = await response.json();
  if (data.success) {
    document.getElementById("status").innerText =
      `✅ Order Confirmed! Delivery between 8 PM–11 PM.`;
  } else {
    document.getElementById("status").innerText = `❌ ${data.error}`;
  }
});

loadMenu();
