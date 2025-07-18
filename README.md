🧍‍♀️ Bad Posture Detection App

A web application for detecting bad posture using a simple, rule-based AI system. Built with React (Vite) for the frontend and FastAPI for the backend.

🚀 Live Demo
👉 [View the live site](https://bad-posture-detection-three.vercel.app/)
⚠️ **Note:**  
This project’s backend is hosted on Render’s free plan. The server goes to sleep if there is no activity for a while (about 15–30 minutes).  
When this happens, the first request can take 30–60 seconds to wake up.  

👉 Please wait for a few seconds if the site appears slow at first.

📹 Demo Video
👉 [Watch the demo video](https://drive.google.com/file/d/1LM8Lvgro4G2N5z_YYNZXxfcx0nyHOo2h/view?usp=sharing)

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

🌐 Public Deployment: 👉 (https://bad-posture-detection-three.vercel.app/)

📹 Demo Video: 👉 (https://drive.google.com/file/d/1LM8Lvgro4G2N5z_YYNZXxfcx0nyHOo2h/view?usp=sharing)

