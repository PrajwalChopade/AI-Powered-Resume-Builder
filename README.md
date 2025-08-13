<<<<<<< HEAD
# AI Resume Analyzer

A full-stack application for analyzing resumes using AI, built with React frontend and Python Flask backend.

## Features

- **ATS Resume Evaluation**: Upload resumes and get detailed ATS compatibility scores
- **AI-Powered Analysis**: Uses Google Gemini AI for intelligent resume analysis
- **User Authentication**: Secure user registration and login
- **Resume Management**: Save and manage multiple resumes
- **Modern UI**: Clean and responsive React frontend

## Tech Stack

### Frontend
- React 18
- Vite (build tool)
- React Router (navigation)
- Axios (API calls)
- CSS3 (styling)

### Backend
- Python 3.8+
- Flask (web framework)
- Google Gemini AI API
- MongoDB Atlas (database)
- JWT (authentication)
- PyPDF2 (PDF processing)
- PyMongo (MongoDB driver)

## Installation & Setup

### Prerequisites
- Node.js 16+ (for frontend)
- Python 3.8+ (for backend)
- Google Gemini API key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install Python dependencies**
   ```bash
   # On Windows
   .\install-python-deps.bat
   
   # Or manually
   cd backend
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Set up environment variables**
   Create a `.env` file in the backend directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   JWT_SECRET=your_jwt_secret_key_here
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   ```

5. **Start the application**
   ```bash
   # From project root
   npm start
   ```
   
   This will start both frontend (port 3000) and backend (port 5000) simultaneously.

## Project Structure

```
project/
├── frontend/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/          # React context
│   │   ├── styles/           # CSS files
│   │   └── utils/            # Utility functions
│   └── package.json
├── backend/                  # Python Flask backend
│   ├── app.py               # Main Flask application
│   ├── run_python_backend.py # Backend runner script
│   ├── requirements.txt     # Python dependencies
│   └── test_migration.py    # Migration test script
├── backup_js_backend/       # Backup of old Node.js backend
└── package.json            # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### ATS Analysis
- `POST /api/ats/evaluate` - Evaluate resume against job description

### AI Services
- `POST /api/ai/analyze-resume` - AI resume analysis (requires auth)
- `POST /api/ai/test-key` - Test API key (requires auth)

### Resume Management
- `GET /api/resumes` - Get user resumes (requires auth)
- `POST /api/resumes` - Save resume (requires auth)

## Development

### Running Frontend Only
```bash
cd frontend
npm start
```

### Running Backend Only
```bash
cd backend
python run_python_backend.py
```

### Running Both (Recommended)
```bash
# From project root
npm start
```

## Environment Variables

### Required
- `GEMINI_API_KEY` - Google Gemini AI API key
- `MONGODB_URI` - MongoDB connection string

### Optional
- `JWT_SECRET` - JWT secret key (defaults to 'your-secret-key')
- `PORT` - Backend port (defaults to 5000)

## Migration Notes

This project has been migrated from Node.js/Express backend to Python/Flask backend. The old Node.js backend is backed up in the `backup_js_backend/` directory and can be safely removed after confirming the Python backend works correctly.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
=======
# AI-Powered-Resume-Builder
AI-powered resume builder with ATS optimization, keyword suggestions, and job description matching built with React, Node.js, MongoDB, and GenAI. 
>>>>>>> caeced64bd1af2ca78d8b24665346e6178def100
