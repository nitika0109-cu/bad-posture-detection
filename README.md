🧍‍♀️ Bad Posture Detection App
A web application for detecting bad posture using a simple, rule-based AI system. Built with React (Vite) for the frontend and FastAPI for the backend.

🚀 Live Demo
👉 View the live site

📹 Demo Video
👉 Watch the demo video

📂 Project Structure
bash
Copy
Edit
bad-posture-detection/
├── frontend/   # React + Vite frontend
└── backend/    # FastAPI backend
⚙️ Tech Stack Used
Frontend: React, Vite, JavaScript, CSS

Backend: FastAPI, Python

Deployment: Vercel (Frontend), Render/Heroku/other (Backend — update based on what you used)

🛠️ Setup Instructions (Run Locally)
1️⃣ Clone the repository

bash
Copy
Edit
git clone https://github.com/nitika0109-cu/bad-posture-detection.git
cd bad-posture-detection
2️⃣ Run the Frontend

bash
Copy
Edit
cd frontend
npm install
npm run dev
3️⃣ Run the Backend

bash
Copy
Edit
cd backend

# (Recommended) Create & activate a virtual environment
# For Windows:
python -m venv venv
venv\Scripts\activate

# For Mac/Linux:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload
✅ Deliverables
📂 GitHub Repo: Includes /frontend and /backend folders

🌐 Public Deployment: Live App Link

📹 Demo Video: Demo Video Link

