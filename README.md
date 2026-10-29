# Voice Ledger AI 🎙️💼

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mofetuyi/voice-ledger-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](manifest.json)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%203%20Flash-blueviolet.svg)](https://ai.google.dev/)
[![Brand](https://img.shields.io/badge/Created%20by-TuyiTek%20Digital%20Solutions-orange.svg)](https://tuyitek.com)

**Voice Ledger AI** is an intelligent, voice-first financial ledger, accounting assistant, and business advisory progressive web application (PWA) built specifically for African small businesses, merchants, and entrepreneurs. Developed by **TuyiTek Digital Solutions**.

---

## 🌟 Key Features

- **🎙️ Multilingual Voice Recognition**: Speak to record income, sales, or expenses naturally.
- **🇳🇬 Native Language Support**: Complete end-to-end interface and AI advisory in:
  - **Yorùbá** (100% pure standard Yorùbá with no English words)
  - **Nigerian Pidgin (Naija)**
  - **Asụsụ Igbo**
  - **Harshen Hausa**
  - **Ẹ̀dó (Benin)**
  - **English**
- **⚡ Google Gemini AI Integration**: Connected to Google's ultra-fast Gemini model for strategic financial insights, cash flow forecasts, and 1-click transaction confirmations directly from chat.
- **📊 Smart Ledger & Profit/Loss**: Real-time revenue tracking, expense categorization, profit margin analysis, and interactive visual charts.
- **📦 Inventory Management**: Track stock levels, low-stock notifications, automated cost-to-retail valuations, and out-of-stock alerts.
- **🤝 Debt Manager & Tracker**: Track receivables (who owes you) and payables (who you owe) with due date reminders and SMS/WhatsApp follow-up templates.
- **🧾 Professional Invoice Generator**: Create, customize, print, and share professional PDF-ready invoices with auto-calculated VAT and discounts.
- **❤️ Business Health Score**: Algorithmic financial health assessment (0–100) analyzing profit margins, debt ratios, and cash buffers.
- **🔔 Smart Proactive Alerts**: Automatic warnings for overdue debts, expense spikes, and inventory restocking needs.
- **📱 PWA & Offline-First Resiliency**: Installable as a native desktop or mobile app on Android, iOS, Windows, and Mac. Fully usable offline with seamless synchronization.

---

## 🚀 Instant Deployment on Render

This repository is pre-configured with `render.yaml` for 1-click static site deployment on **Render**:

1. Click the button below:

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mofetuyi/voice-ledger-ai)

2. Sign in to your [Render Dashboard](https://dashboard.render.com).
3. Connect your GitHub account and click **Apply Blueprint**.
4. Render will instantly deploy your application globally with free automated SSL, CDN distribution, and continuous deployment on every git push!

---

## 💻 Local Development

Clone and run locally in VS Code:

```bash
# Clone the repository
git clone https://github.com/mofetuyi/voice-ledger-ai.git

# Navigate into the project folder
cd voice-ledger-ai

# Open in VS Code
code .
```

You can serve it with any static server:
```bash
# Using Python
python -m http.server 8080

# Using Node.js npx
npx serve .
```

Open `http://localhost:8080` in your web browser.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Modern Glassmorphism & Responsive Design), Modern Vanilla JavaScript (ES6+)
- **Charts**: Chart.js 4.4
- **AI / LLM**: Google Gemini REST API (`gemini-3-flash-preview` & `gemma-4-26b-a4b-it`)
- **PWA**: Web App Manifest & Service Worker Cache
- **Storage**: Browser LocalStorage with automatic schema management

---

## 📄 License

This project is licensed under the MIT License.

---

*Designed and engineered with pride by **TuyiTek Digital Solutions**.*
