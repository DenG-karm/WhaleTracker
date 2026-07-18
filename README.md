<div align="center">
  <img src="https://via.placeholder.com/150/050810/00E676?text=WT" alt="WhaleTracker Logo" width="120" />

  # WHALETRACKER
  **An Open-Source Institutional-Grade Quant Terminal for Retail Traders.**
  
  > *Stop being the liquidity. Start hunting the whales.*

  [![Status: Active](https://img.shields.io/badge/Status-Active-00E676?style=for-the-badge)](#)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#)
  [![AI Engine: Integrated](https://img.shields.io/badge/AI_Engine-Neural_Quant-blueviolet?style=for-the-badge)](#)
</div>

---

## 🌟 About The Project

Originally conceived as a closed-source startup, **WhaleTracker** is now open-source! It is a completely autonomous, AI-driven command center designed to give retail traders the intelligence previously reserved for multi-billion dollar hedge funds. 

This repository contains the complete microservice architecture including the **FastAPI Backend**, **React Frontend**, and **React Native Mobile App**.

### 🧠 Core Features

1. **Live Whale & Order Block Intelligence**
   - Real-time monitoring of institutional money flow, massive wallet transfers, and hidden liquidity grabs.
   - Smart Alerts notifying you before major market shifts occur.
2. **The Command Terminal & Algorithmic Analysis**
   - Zero-Latency Execution Environment with a sleek, dark-pool inspired UI.
   - Identifies Fair Value Gaps (FVGs), order blocks, and liquidity sweeps automatically.
3. **Neural AI Quant Coach**
   - Integrated LLM-based intelligence that acts as your personal quantitative analyst.
   - Dynamic trade journaling and actionable risk management directives.
4. **Global Macro & Sentiment Engine**
   - AI sentiment interpretation to gauge the market impact of global news.

---

## 🛠 Tech Stack & Architecture

WhaleTracker is built with a robust, scalable, and modern microservice architecture.

- **Frontend:** React 19, Tailwind CSS, Framer Motion, GSAP, Lightweight Charts
- **Mobile:** React Native (Expo)
- **Backend:** Python (FastAPI), Celery for background tasks, SQLAlchemy
- **Database / Cache:** PostgreSQL, Redis (via Docker)
- **Infrastructure:** Docker & Docker Compose, NGINX

---

## 🚀 Quick Start (Docker)

The easiest way to run the entire WhaleTracker stack locally is via Docker.

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/whaletracker.git
cd whaletracker
```

### 2. Environment Variables
Copy the example environment files and fill them in (you can leave most as default for local testing):
```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### 3. Start the Platform
```bash
docker-compose up --build
```

- **Frontend Terminal:** `http://localhost:3000`
- **Backend API Docs:** `http://localhost:8000/docs`

---

## 💻 Local Development

If you prefer to run the services directly on your host machine without Docker:

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <br>
  <i>"In the markets, you are either the hunter or the prey. Choose."</i><br><br>
  <b>© 2026 WhaleTracker.</b>
</div>
