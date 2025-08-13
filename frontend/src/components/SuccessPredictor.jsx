import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function SuccessPredictor() {
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!resumeContent || !jobDescription) {
      setError('Please provide both resume content and job description');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Simulated API response - in a real app, you would call your backend
      setTimeout(() => {
        const score = calculateMatchScore(resumeContent, jobDescription);
        const recommendations = generateRecommendations(score, resumeContent, jobDescription);
        
        setResult({
          score,
          recommendations,
          matchStrength: getMatchStrength(score),
          keyFactors: [
            { name: 'Keyword Match', score: Math.floor(Math.random() * 40) + 60 },
            { name: 'Experience Level', score: Math.floor(Math.random() * 30) + 70 },
            { name: 'Skills Coverage', score: Math.floor(Math.random() * 25) + 75 },
            { name: 'Education Match', score: Math.floor(Math.random() * 20) + 80 }
          ]
        });
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      setError('Error analyzing success probability. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };
  
  // Simple scoring function based on keyword matching (for demo purposes)
  const calculateMatchScore = (resume, job) => {
    if (!resume || !job) return 0;
    
    const resumeWords = resume.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const jobWords = job.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    const uniqueJobWords = [...new Set(jobWords)];
    let matchCount = 0;
    
    uniqueJobWords.forEach(word => {
      if (resumeWords.includes(word)) {
        matchCount++;
      }
    });
    
    // Calculate percentage match and add some randomness
    const baseScore = (matchCount / uniqueJobWords.length) * 100;
    const randomFactor = Math.random() * 15 - 7.5; // Random factor between -7.5 and +7.5
    
    return Math.min(Math.max(Math.round(baseScore + randomFactor), 20), 98); // Between 20 and 98
  };
  
  const getMatchStrength = (score) => {
    if (score >= 80) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Moderate Match';
    return 'Weak Match';
  };
  
  const generateRecommendations = (score, resume, job) => {
    const recommendations = [];
    
    if (score < 60) {
      recommendations.push('Add more specific keywords from the job description to your resume.');
      recommendations.push('Highlight relevant experiences that align with the job requirements.');
    }
    
    if (score < 80) {
      recommendations.push('Tailor your professional summary to better match the role.');
      recommendations.push('Quantify your achievements with specific metrics when possible.');
    }
    
    // Add some standard recommendations
    recommendations.push('Ensure your resume clearly demonstrates your most relevant skills.');
    recommendations.push('Format your resume to be ATS-friendly with standard headings.');
    
    return recommendations;
  };

  return (
    <div className="container">
      <h2 className="mb-4">Success Predictor</h2>
      <p className="mb-4">
        Analyze how well your resume matches a specific job posting and get insights on your chances of success.
      </p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h5>Paste Your Resume</h5>
              </div>
              <div className="card-body">
                <textarea 
                  className="form-control" 
                  rows="12"
                  placeholder="Paste the content of your resume here..."
                  value={resumeContent}
                  onChange={(e) => setResumeContent(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h5>Paste Job Description</h5>
              </div>
              <div className="card-body">
                <textarea 
                  className="form-control" 
                  rows="12"
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center my-4">
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            disabled={loading || !isAuthenticated}
          >
            {loading ? 'Analyzing...' : 'Predict Success Rate'}
          </button>
        </div>
      </form>
      
      {result && (
        <div className="card mt-4">
          <div className="card-header">
            <h3>Success Prediction Results</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4 text-center">
                <h4>Overall Match</h4>
                <div className="success-score">
                  <div className="progress-circle mx-auto" style={{
                    background: `conic-gradient(
                      #28a745 0% ${result.score}%,
                      #e9ecef ${result.score}% 100%
                    )`
                  }}>
                    <span className="score-text">{result.score}%</span>
                  </div>
                  <p className="match-strength mt-3">{result.matchStrength}</p>
                </div>
              </div>
              
              <div className="col-md-8">
                <h5 className="mb-3">Key Factors</h5>
                {result.keyFactors.map((factor, index) => (
                  <div key={index} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>{factor.name}</span>
                      <span>{factor.score}%</span>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: `${factor.score}%` }}
                        aria-valuenow={factor.score}
                        aria-valuemin="0" 
                        aria-valuemax="100">
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-5">
              <h4>Recommendations</h4>
              <ul className="list-group">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="list-group-item">
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="alert alert-info mt-4">
              <i className="bi bi-info-circle me-2"></i>
              This prediction is based on keyword matching, formatting, and content analysis. Results are meant as a guideline and don't guarantee interview success.
            </div>
          </div>
        </div>
      )}
      
      <style jsx="true">{`
        .progress-circle {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .score-text {
          font-size: 2rem;
          font-weight: bold;
        }
        .match-strength {
          font-weight: 500;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}

export default SuccessPredictor;