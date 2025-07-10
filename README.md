# Bad Posture Detection App

A web application for detecting bad posture using a rule-based AI system.
Built with **React (Vite)** for the frontend and **FastAPI** for the backend.

---

## 🚀 Live Demo

👉 [Click here to view the live site](https://bad-posture-detection-three.vercel.app/)

---

## 📂 Project Structure

- `frontend/` — React + Vite frontend
- `backend/` — FastAPI backend

---

## ⚙️ How to run locally

```bash
# Clone the repo
git clone https://github.com/nitika0109-cu/bad-posture-detection.git

# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
# create a virtual environment & activate it
pip install -r requirements.txt
uvicorn main:app --reload
