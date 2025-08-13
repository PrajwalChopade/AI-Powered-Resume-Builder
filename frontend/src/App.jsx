import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import ResumeBuilder from './components/ResumeBuilder';
import MyResumes from './components/MyResumes';
import ATSChecker from './components/ATSChecker';
import KeywordAnalyzer from './components/KeywordAnalyzer';
import ResumeEditor from './components/ResumeEditor';
import HeatmapVisualizer from './components/HeatmapVisualizer';
import RoleGenerator from './components/RoleGenerator';
import PlagiarismChecker from './components/PlagiarismChecker';
import SuccessPredictor from './components/SuccessPredictor';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/builder" element={
              <PrivateRoute>
                <ResumeBuilder />
              </PrivateRoute>
            } />
            <Route path="/my-resumes" element={
              <PrivateRoute>
                <MyResumes />
              </PrivateRoute>
            } />
            <Route path="/ats" element={
              <PrivateRoute>
                <ATSChecker />
              </PrivateRoute>
            } />
            <Route path="/keywords" element={
              <PrivateRoute>
                <KeywordAnalyzer />
              </PrivateRoute>
            } />
            <Route path="/editor" element={
              <PrivateRoute>
                <ResumeEditor />
              </PrivateRoute>
            } />
            <Route path="/heatmap" element={
              <PrivateRoute>
                <HeatmapVisualizer />
              </PrivateRoute>
            } />
            <Route path="/role-generator" element={
              <PrivateRoute>
                <RoleGenerator />
              </PrivateRoute>
            } />
            <Route path="/plagiarism" element={
              <PrivateRoute>
                <PlagiarismChecker />
              </PrivateRoute>
            } />
            <Route path="/success-predictor" element={
              <PrivateRoute>
                <SuccessPredictor />
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;