# Ticketing System - Frontend

This repository contains the frontend application for the enterprise Ticketing System.

## Architecture
- **React/Vite**: Fast development build
- **TypeScript**: Strictly typed frontend
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management

## Requirements
- Node.js >= 20

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:cristianjohnn/Ticketing-Frontend.git
   cd Ticketing-Frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env` and configure your API URL.
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL` points to your backend instance (default `http://localhost:5000`).

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Deployment
For production, the application is optimized to run as a static site (e.g., Vercel, Netlify).
```bash
npm run build
```
Upload the generated `dist/` directory to your static hosting provider.
