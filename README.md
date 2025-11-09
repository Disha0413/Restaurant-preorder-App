# 🍴 RFC Restaurant Pre-Order App

## 📖 Overview
This project is a **pre-order system for a non-veg restaurant**, designed for my dad’s business plan.  
Customers can place pre-orders for dinner, which are **prepared and delivered between 8 PM – 11 PM**.  
The system has **separate interfaces for users and admin**:

- 🧑‍🍳 **Users:** Browse menu, place orders, and see real-time order confirmation.
- 🧑‍💼 **Admin:** View incoming orders, accept/decline, mark payments, and notify users dynamically.

---

## 💡 Key Features
- **Pre-Order System:** Customers place orders in advance to ensure fresh preparation.  
- **Real-Time User Notifications:** When admin marks payment as complete, users see a **green tick ✅ with “Order Confirmed”** instantly.  
- **Dynamic Admin Dashboard:** Admin panel auto-refreshes or updates live to show new orders without manual reload.  
- **Order Status Tracking:** Orders move through: `pending → accepted → payment_pending → paid/declined`.  
- **Responsive UI:** Works on mobile and desktop.  
- **Simple Authentication:** Admin login with session management.  

---

## 🧠 Tech Stack
| Category      | Technology |
|---------------|------------|
| Frontend      | HTML5, CSS3, JavaScript |
| Backend       | Node.js, Express.js |
| Database      | In-memory (for demo purposes) — can be replaced with MongoDB/Firebase |
| Hosting       | Netlify (frontend) + local Node server (backend) |
| Version Control | Git + GitHub |

