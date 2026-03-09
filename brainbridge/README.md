# 🧠 BrainBridge

AI-powered early screening for learning disabilities in Indian children.

## Quick Start

### 1. Frontend (React)
```bash
cd brainbridge
npm install
npm run dev
```
Open http://localhost:5173

### 2. ML API (Python)
```bash
cd brainbridge-ml
pip install -r requirements.txt
python generate_data.py
python train_models.py
python app.py
```
Runs on http://localhost:5001

### 3. Backend (Node.js)
```bash
cd brainbridge-backend
npm install
# Edit .env with your MongoDB URI
node server.js
```
Runs on http://localhost:4000

## Demo Flow
Landing Page → Mirror Game → Focus Catcher → AI Result

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Games: HTML5 Canvas
- ML: Python + scikit-learn + Flask
- Backend: Node.js + Express + MongoDB
- Deploy: Vercel + Railway + MongoDB Atlas
