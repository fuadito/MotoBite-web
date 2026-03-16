# 🍗 KFC Narok Delivery Platform

A modern **food delivery web application** built to simulate the operations of a **KFC Narok branch**, allowing customers to place orders, kitchen staff to manage food preparation, and riders to deliver orders efficiently.

This project demonstrates a **multi-role food delivery workflow** built with **HTML, CSS, and JavaScript**, integrated with authentication and backend APIs.

---

## 🚀 Live Demo

h

---

## 📂 GitHub Repository

https://github.com/fuadito/kfc-narok-frontend

---

# 📌 Features

## 👤 Customer

* Browse the KFC menu
* Add food items to cart
* Place orders
* Track order status
* View order history

## 👨‍🍳 Kitchen Staff

* Receive incoming orders
* Manage food preparation
* Update order status to **Ready**

## 🛵 Rider

* Accept delivery orders
* View delivery queue
* Track completed deliveries

## 🌐 Platform Features

* Multi-role login system
* Real-time order workflow simulation
* Clean and responsive user interface
* Toast notifications for actions
* KFC-themed UI design

---

# 🛠️ Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript (Vanilla JS)

### Backend Integration

* Supabase Authentication
* REST API

### Deployment

* GitHub
* Netlify

---

# 📁 Project Structure

```
kfc-narok-frontend
│
├── index.html      # Main application interface
├── style.css       # Styling and UI design
├── app.js          # Application logic
└── README.md       # Project documentation
```

---

# ⚙️ Installation & Setup

### 1. Clone the repository

```
git clone https://github.com/fuadito/kfc-narok-frontend.git
```

### 2. Navigate into the project folder

```
cd kfc-narok-frontend
```

### 3. Open the project

You can simply open **index.html** in your browser or run it using **Live Server** in VS Code.

---

# 🔌 API Configuration

The application automatically detects whether it is running locally or in production.

```
const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://kfc-narok-backend-production.up.railway.app';
```

Authentication and database operations are handled using **Supabase**.

---

# 📱 Application Screens

The platform includes:

* Landing page
* Customer ordering interface
* Kitchen dashboard
* Rider dashboard
* Order tracking system

---

# 🚧 Future Improvements

* M-Pesa payment integration
* Real-time order updates with WebSockets
* Google Maps delivery tracking
* Admin analytics dashboard
* Push notifications

---

# 👨‍💻 Author

**Fuady Kimori**

Frontend Developer passionate about building modern web applications and solving real-world problems.

GitHub:
https://github.com/fuadito

---

# 📄 License

This project is created for **educational and portfolio purposes**.
