import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './ResumeImprover.css';

const ResumeImprover = ({ resume, jobDescription: initialJobDescription, onClose }) => {
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [improvements, setImprovements] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(initialJobDescription ? 'analyzing' : 'input'); // 'input', 'analyzing', 'results'
  const [selectedImprovements, setSelectedImprovements] = useState([]);

  const selectAll = () => {
    if (improvements && improvements.length > 0) {
      if (selectedImprovements.length === improvements.length) {
        setSelectedImprovements([]);
      } else {
        setSelectedImprovements(improvements.map((_, index) => index));
      }
    }
  };

  const selectNone = () => {
    setSelectedImprovements([]);
  };

  const handleImprovementToggle = (index) => {
    setSelectedImprovements(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  // Check if this is an uploaded file (temporary resume)
  const isUploadedFile = resume.id && resume.id.toString().startsWith('temp_');

  // Auto-start analysis if job description is provided
  useEffect(() => {
    if (initialJobDescription && initialJobDescription.trim() && resume) {
      analyzeResume();
    }
  }, []);

  const analyzeResume = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setError('');
    setAnalyzing(true);
    setStep('analyzing');

    try {
      const token = localStorage.getItem('token');
      
      // Use different endpoints for uploaded vs saved resumes
      let endpoint, requestData;
      
      if (isUploadedFile) {
        endpoint = '/api/ai/improve-uploaded-resume';
        requestData = {
          resumeText: resume.content,
          jobDescription: jobDescription,
          resumeTitle: resume.title
        };
      } else {
        endpoint = '/api/ai/improve-resume';
        requestData = {
          resumeId: resume.id,
          jobDescription: jobDescription
        };
      }

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setCurrentAnalysis(response.data.current_analysis);
        setImprovements(response.data.improvements);
        setStep('results');
      } else {
        setError('Failed to analyze resume for improvements');
      }
    } catch (err) {
      console.error('Error analyzing resume:', err);
      setError(err.response?.data?.message || 'Failed to analyze resume');
    } finally {
      setAnalyzing(false);
    }
  };

  const renderInputStep = () => (
    <div className="resume-improver-step">
      <h3>🎯 AI Resume Improvement</h3>
      <p className="step-description">
        Enter the job description you're applying for. Our AI will analyze your resume and suggest specific improvements to increase your ATS score and job match.
      </p>
      
      <div className="job-description-input">
        <label>Job Description *</label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the complete job description here..."
          rows={8}
          className="job-description-textarea"
        />
        <div className="character-count">
          {jobDescription.length} characters
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="step-actions">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={analyzeResume} disabled={!jobDescription.trim()} className="btn-primary">
          🔍 Analyze & Get Suggestions
        </button>
      </div>
    </div>
  );

  const renderAnalyzingStep = () => (
    <div className="resume-improver-step analyzing">
      <div className="analyzing-animation">
        <div className="spinner"></div>
        <h3>🧠 AI Analysis in Progress</h3>
        <p>🚀 <strong>Optimized Analysis</strong> - Analyzing your resume against job requirements...</p>
        <div className="analyzing-steps">
          <div className="analyzing-step active">✓ Reading resume content</div>
          <div className="analyzing-step active">✓ Parsing job description</div>
          <div className="analyzing-step active">⏳ Combined AI analysis (ATS + Improvements)</div>
          <div className="analyzing-step">⏳ Generating specific recommendations</div>
        </div>
        <div className="optimization-note">
          <small>⚡ Enhanced performance: Single AI call instead of multiple requests</small>
        </div>
      </div>
    </div>
  );

  const renderResultsStep = () => {
    const specificImprovements = improvements?.specific_improvements || [];
    const skillAdditions = improvements?.skill_additions || [];
    const atsAnalysis = improvements?.ats_analysis || {};

    return (
      <div className="resume-improver-step results">
        <div className="results-header">
          <h3>🎯 AI Improvement Recommendations</h3>
          <div className="ats-improvement-preview">
            {/* <div className="score-comparison">
              <div className="score-item">
                <span className="score-label">Current ATS Score</span>
                <span className="score-value current">{atsAnalysis.current_score || 0}/100</span>
              </div>
              <div className="score-arrow">→</div>
              <div className="score-item">
                <span className="score-label">Expected After</span>
                <span className="score-value expected">{atsAnalysis.expected_score_after_improvements || 0}/100</span>
              </div>
              <div className="score-improvement">
                +{atsAnalysis.improvement_potential || 0} points
              </div>
            </div> */}
          </div>
        </div>

        <div className="improvements-content">
          <div className="improvements-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-number">{specificImprovements.length}</span>
                <span className="stat-label">Specific Improvements</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{skillAdditions.length}</span>
                <span className="stat-label">New Skills</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{selectedImprovements.length}</span>
                <span className="stat-label">Selected</span>
              </div>
            </div>

            <div className="selection-controls">
              <button onClick={selectAll} className="btn-link">Select All</button>
              <button onClick={selectNone} className="btn-link">Select None</button>
            </div>
          </div>

          <div className="improvements-list">
            {specificImprovements.map((improvement, index) => (
              <div key={index} className={`improvement-item ${selectedImprovements.includes(index) ? 'selected' : ''}`}>
                <div className="improvement-header">
                  <label className="improvement-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedImprovements.includes(index)}
                      onChange={() => handleImprovementToggle(index)}
                    />
                    <span className="section-tag">{improvement.section}</span>
                    <span className="category-tag">{improvement.category}</span>
                    <span className="impact-score">Impact: {improvement.impact_score}/10</span>
                  </label>
                </div>
                
                <div className="improvement-content">
                  <div className="text-comparison">
                    <div className="original-text">
                      <span className="label">❌ Original:</span>
                      <p>"{improvement.original_text}"</p>
                    </div>
                    <div className="improved-text">
                      <span className="label">✅ Improved:</span>
                      <p>"{improvement.improved_text}"</p>
                    </div>
                  </div>
                  
                  <div className="improvement-details">
                    <div className="reason">
                      <strong>Why this helps:</strong> {improvement.reason}
                    </div>
                    {improvement.keywords_added && improvement.keywords_added.length > 0 && (
                      <div className="keywords-added">
                        <strong>Keywords added:</strong>
                        {improvement.keywords_added.map((keyword, i) => (
                          <span key={i} className="keyword-tag">{keyword}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {skillAdditions.length > 0 && (
            <div className="skills-section">
              <h4>🔧 Skills to Add</h4>
              <div className="skills-list">
                {skillAdditions.map((skillItem, index) => (
                  <div key={index} className="skill-item">
                    <span className="skill-name">{skillItem.skill}</span>
                    <span className="skill-reason">{skillItem.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="step-actions">
          <button onClick={() => setStep('input')} className="btn-secondary">Analyze Again</button>
          <button onClick={onClose} className="btn-primary">
            � Apply Manually & Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="resume-improver-modal">
      <div className="resume-improver-content">
        <div className="modal-header">
          <h2>AI Resume Improvement Analysis</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="progress-indicator">
          <div className={`progress-step ${step === 'input' ? 'active' : step !== 'input' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Job Description</span>
          </div>
          <div className={`progress-step ${step === 'analyzing' || step === 'results' ? 'active' : ''} ${step === 'results' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">AI Analysis</span>
          </div>
          <div className={`progress-step ${step === 'results' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Improvement Suggestions</span>
          </div>
        </div>

        <div className="modal-body">
          {step === 'input' && renderInputStep()}
          {step === 'analyzing' && renderAnalyzingStep()}
          {step === 'results' && renderResultsStep()}
        </div>
      </div>
    </div>
  );
};

export default ResumeImprover;
