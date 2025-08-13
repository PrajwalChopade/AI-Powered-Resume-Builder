import React, { useState } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import ResumeImprover from './ResumeImprover';
import './ATSChecker.css';

function ATSChecker() {
  const [jobDesc, setJobDesc] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [result, setResult] = useState(null); // structured result
  const [resumeText, setResumeText] = useState(''); // Store resume text for improvement
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobTitle, setJobTitle] = useState(''); // New state for job title
  const [showImprover, setShowImprover] = useState(false);
  const [resumeForImprovement, setResumeForImprovement] = useState(null);
  
  const { token } = useAuth();

  const handleImproveResume = () => {
    // Create a resume object for the improvement process
    const resumeData = {
      id: `temp_${Date.now()}`, // Temporary ID for uploaded file
      title: resumeFile ? resumeFile.name.replace('.pdf', '') : 'Uploaded Resume',
      file: resumeFile,
      content: resumeText, // Use the stored resume text from ATS analysis
      atsScore: result?.atsScore || 0
    };
    
    setResumeForImprovement(resumeData);
    setShowImprover(true);
  };

  const handleImproverClose = () => {
    setShowImprover(false);
    setResumeForImprovement(null);
  };

  const handleResumeImproved = (improvedResume) => {
    // Handle the improved resume
    console.log('Resume improved:', improvedResume);
    setShowImprover(false);
    setResumeForImprovement(null);
    
    // Show success message with better details
    const message = `🎉 Resume improved successfully!\n\n` +
                   `✅ ${improvedResume.title} has been saved to your account\n` +
                   `📊 ${improvedResume.improvements_applied} improvements applied\n` +
                   `🎯 ${improvedResume.skills_added} skills added\n\n` +
                   `Visit "My Resumes" to view and download your improved resume.`;
    
    if (window.confirm(message + '\n\nWould you like to go to My Resumes now?')) {
      // Navigate to My Resumes with refresh flag
      window.location.href = '/my-resumes?refresh=' + Date.now();
    }
  };

const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent page reload
    
    if (!jobDesc || !resumeFile || !jobTitle) {
      setError('Please provide Job Title, Job Description, and a Resume (PDF).');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      // Append all the required fields
      formData.append('resume', resumeFile);
      formData.append('jobDescription', jobDesc);
      formData.append('jobTitle', jobTitle);
      // formData.append('companyName', companyName); // Optional

      const response = await axios.post('/api/ats/evaluate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Ensure the auth token is sent
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      console.log('✅ Response:', response.data);
      console.log('✅ Results:', response.data.results);
      setResult(response.data.results);
      setResumeText(response.data.resumeText || ''); // Store resume text

      // Auto-scroll to results section after getting results
      setTimeout(() => {
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);

    } catch (err) {
      console.error('❌ Error:', err.response ? err.response.data : err.message);
      const errorMsg = err.response?.data?.msg || 'Analysis failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError('');
    } else {
      setResumeFile(null);
      setError('Please upload a valid PDF file.');
    }
  };

  return (
    <div className="ats-checker-container">
      <h2>ATS Resume Analyzer</h2>

      <form onSubmit={handleSubmit} className="ats-form">
        <div className="form-group">
          <label htmlFor="jobTitle">Job Title:</label>
          <input 
            type="text"
            id="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Enter the job title..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobDesc">Job Description:</label>
          <textarea 
            id="jobDesc"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste the job description here..."
            rows="6"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="resume">Upload Resume (PDF only):</label>
          <input 
            type="file" 
            id="resume"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
          {resumeFile && (
            <p className="file-info">Selected: {resumeFile.name}</p>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </form>

      {result && (
        <div className="results-section">
          <div className="results-header">
            <h3>Analysis Results</h3>
            <div className="ats-score-display">
              <span className="score-label">📊 ATS Score:</span>
              <span className={`score-value ${result.atsScore >= 80 ? 'excellent' : result.atsScore >= 60 ? 'good' : 'needs-improvement'}`}>
                {result.atsScore || 0}/100
              </span>
            </div>
          </div>

          <div className="improvement-action">
            <button 
              onClick={handleImproveResume}
              className="btn-improve-ai"
              disabled={!result.atsScore}
            >
              🚀 Improve with AI
            </button>
            <p className="improve-description">
              Get specific suggestions to boost your ATS score using the job description above
            </p>
          </div>

          <div className="results-details">
            <div className="results-column">
              <h4>✅ Matched Skills ({result.matchedSkills?.length || 0})</h4>
              <ul className="skills-list matched">
                {result.matchedSkills?.length > 0 ? (
                  result.matchedSkills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))
                ) : (
                  <li>No matched skills found</li>
                )}
              </ul>
            </div>

            <div className="results-column">
              <h4>❌ Missing Skills ({result.missingSkills?.length || 0})</h4>
              <ul className="skills-list missing">
                {result.missingSkills?.length > 0 ? (
                  result.missingSkills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))
                ) : (
                  <li>No missing skills identified</li>
                )}
              </ul>
            </div>
          </div>

          <div className="gap-analysis-section">
            <h4>📌 Gap Analysis & Recommendations</h4>
            <ul className="gap-analysis-list">
              {result.gapAnalysis?.length > 0 ? (
                result.gapAnalysis.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))
              ) : (
                <li>No recommendations available</li>
              )}
            </ul>
          </div>

          <div className="metrics-section">
            <h4>📈 Detailed Metrics</h4>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Keyword Density</span>
                <span className="metric-value">{result.keywordDensity || 0}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Skills Match</span>
                <span className="metric-value">{result.skillsMatch || 0}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Experience Match</span>
                <span className="metric-value">{result.experienceMatch || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Resume Improvement Modal */}
      {showImprover && resumeForImprovement && (
        <ResumeImprover
          resume={resumeForImprovement}
          jobDescription={jobDesc} // Use the job description from ATS analysis
          onClose={handleImproverClose}
        />
      )}
    </div>
  );
}

export default ATSChecker;
