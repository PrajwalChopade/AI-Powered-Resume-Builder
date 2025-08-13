import React, { useState } from 'react';
import axios from '../utils/axios';
import './ResumeImprover.css';

const ResumeImprover = ({ resume, jobDescription: initialJobDescription, onClose, onImproved }) => {
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [improvements, setImprovements] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [selectedImprovements, setSelectedImprovements] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input', 'analyzing', 'results', 'implementing', 'completed'

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
      const response = await axios.post('/api/ai/improve-resume', {
        resumeId: resume.id,
        jobDescription: jobDescription
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setCurrentAnalysis(response.data.current_analysis);
        setImprovements(response.data.improvements);
        
        // Pre-select all improvements by default
        const totalImprovements = response.data.improvements?.specific_improvements?.length || 0;
        setSelectedImprovements(Array.from({ length: totalImprovements }, (_, i) => i));
        
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

  const handleImprovementToggle = (index) => {
    setSelectedImprovements(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const selectAll = () => {
    const totalImprovements = improvements?.specific_improvements?.length || 0;
    setSelectedImprovements(Array.from({ length: totalImprovements }, (_, i) => i));
  };

  const selectNone = () => {
    setSelectedImprovements([]);
  };

  const implementSelectedImprovements = async () => {
    if (selectedImprovements.length === 0) {
      setError('Please select at least one improvement to implement');
      return;
    }

    setError('');
    setImplementing(true);
    setStep('implementing');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/implement-improvements', {
        resumeId: resume.id,
        selectedImprovements: selectedImprovements,
        improvementsData: improvements
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setStep('completed');
        // Call the onImproved callback to refresh the parent component
        if (onImproved) {
          onImproved(response.data.new_resume);
        }
      } else {
        setError('Failed to implement improvements');
        setStep('results');
      }
    } catch (err) {
      console.error('Error implementing improvements:', err);
      setError(err.response?.data?.message || 'Failed to implement improvements');
      setStep('results');
    } finally {
      setImplementing(false);
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
        <p>Analyzing your resume against job requirements...</p>
        <div className="analyzing-steps">
          <div className="analyzing-step active">✓ Reading resume content</div>
          <div className="analyzing-step active">✓ Parsing job description</div>
          <div className="analyzing-step active">⏳ Generating specific improvements</div>
          <div className="analyzing-step">⏳ Calculating ATS impact</div>
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
            <div className="score-comparison">
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
            </div>
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
          <button onClick={() => setStep('input')} className="btn-secondary">Back to Edit</button>
          <button 
            onClick={implementSelectedImprovements}
            disabled={selectedImprovements.length === 0}
            className="btn-primary implement-btn"
          >
            🚀 Implement Selected Improvements ({selectedImprovements.length})
          </button>
        </div>
      </div>
    );
  };

  const renderImplementingStep = () => (
    <div className="resume-improver-step implementing">
      <div className="implementing-animation">
        <div className="spinner"></div>
        <h3>⚡ Implementing Improvements</h3>
        <p>Applying {selectedImprovements.length} selected improvements to your resume...</p>
        <div className="implementing-progress">
          <div className="progress-step active">✓ Processing text improvements</div>
          <div className="progress-step active">⏳ Adding new skills</div>
          <div className="progress-step">⏳ Creating improved resume</div>
          <div className="progress-step">⏳ Saving to database</div>
        </div>
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="resume-improver-step completed">
      <div className="completion-message">
        <div className="success-icon">🎉</div>
        <h3>Resume Successfully Improved!</h3>
        <p>Your resume has been enhanced with AI-powered improvements.</p>
        
        <div className="completion-stats">
          <div className="stat">
            <span className="stat-number">{selectedImprovements.length}</span>
            <span className="stat-label">Improvements Applied</span>
          </div>
          <div className="stat">
            <span className="stat-number">{improvements?.skill_additions?.length || 0}</span>
            <span className="stat-label">Skills Added</span>
          </div>
          <div className="stat">
            <span className="stat-number">+{improvements?.ats_analysis?.improvement_potential || 0}</span>
            <span className="stat-label">Expected ATS Points</span>
          </div>
        </div>

        <div className="next-steps">
          <p>✅ Your improved resume is now available in "My Resumes"</p>
          <p>✅ Download the PDF to use for job applications</p>
          <p>✅ Continue editing or make further improvements anytime</p>
        </div>
      </div>

      <div className="step-actions">
        <button onClick={onClose} className="btn-primary">Done</button>
      </div>
    </div>
  );

  return (
    <div className="resume-improver-modal">
      <div className="resume-improver-content">
        <div className="modal-header">
          <h2>AI Resume Improvement</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="progress-indicator">
          <div className={`progress-step ${step === 'input' ? 'active' : step !== 'input' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Job Description</span>
          </div>
          <div className={`progress-step ${step === 'analyzing' || step === 'results' || step === 'implementing' || step === 'completed' ? 'active' : ''} ${step === 'results' || step === 'implementing' || step === 'completed' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">AI Analysis</span>
          </div>
          <div className={`progress-step ${step === 'results' || step === 'implementing' || step === 'completed' ? 'active' : ''} ${step === 'implementing' || step === 'completed' ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review Suggestions</span>
          </div>
          <div className={`progress-step ${step === 'implementing' || step === 'completed' ? 'active' : ''} ${step === 'completed' ? 'completed' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Implementation</span>
          </div>
        </div>

        <div className="modal-body">
          {step === 'input' && renderInputStep()}
          {step === 'analyzing' && renderAnalyzingStep()}
          {step === 'results' && renderResultsStep()}
          {step === 'implementing' && renderImplementingStep()}
          {step === 'completed' && renderCompletedStep()}
        </div>
      </div>
    </div>
  );
};

export default ResumeImprover;
