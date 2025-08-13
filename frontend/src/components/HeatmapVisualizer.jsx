import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function HeatmapVisualizer() {
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // This would be replaced with actual analysis logic that could
  // determine which parts of the resume match the job description
  const generateHeatmap = () => {
    setLoading(true);
    
    // Simulate a delay to represent processing time
    setTimeout(() => {
      setHeatmapVisible(true);
      setLoading(false);
    }, 1500);
  };

  const highlightKeywords = (text, keywords) => {
    if (!text || !keywords || keywords.length === 0) return text;
    
    // Simple keyword highlighting (in a real app, this would be more sophisticated)
    let highlightedText = text;
    keywords.forEach(keyword => {
      // Basic regex to find the keyword with word boundaries
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<span class="text-success fw-bold">$&</span>`);
    });
    
    return highlightedText;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    generateHeatmap();
  };

  // Extract "keywords" from job description (simplified)
  const extractKeywords = (text) => {
    if (!text) return [];
    
    // Split by spaces and punctuation, filter out common words and short words
    const commonWords = ['and', 'the', 'or', 'to', 'a', 'in', 'for', 'of', 'with', 'on', 'at'];
    return text
      .toLowerCase()
      .split(/[\s,.;:!?()\[\]{}""'']+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
  };

  const jobKeywords = extractKeywords(jobDescription);
  const highlightedResume = highlightKeywords(resumeContent, jobKeywords);

  return (
    <div className="container">
      <h2 className="mb-4">Resume Heatmap Visualizer</h2>
      <p className="mb-4">
        See how your resume matches the job description with our visual heatmap tool.
        Areas that match keywords will be highlighted.
      </p>
      
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
            disabled={loading || !isAuthenticated || !resumeContent || !jobDescription}
          >
            {loading ? 'Generating Heatmap...' : 'Generate Heatmap'}
          </button>
        </div>
      </form>
      
      {heatmapVisible && (
        <div className="card mt-4">
          <div className="card-header">
            <h3>Heatmap Visualization</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-12">
                <div className="heatmap">
                  <div className="resume-preview" 
                       dangerouslySetInnerHTML={{ __html: highlightedResume.split('\n').join('<br>') }}>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row mt-4">
              <div className="col-md-6">
                <h4>Match Score</h4>
                <div className="progress">
                  <div 
                    className="progress-bar bg-success" 
                    role="progressbar" 
                    style={{ 
                      width: `${Math.min(jobKeywords.filter(k => resumeContent.toLowerCase().includes(k)).length / jobKeywords.length * 100, 100)}%` 
                    }} 
                    aria-valuenow="60" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                  </div>
                </div>
                <p className="mt-2">Green highlights indicate keywords from the job description found in your resume.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeatmapVisualizer;