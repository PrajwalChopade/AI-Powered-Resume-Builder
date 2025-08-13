import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function RoleGenerator() {
  const [industry, setIndustry] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [skills, setSkills] = useState('');
  const [generatedRole, setGeneratedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please login to use this feature.');
      return;
    }
    
    if (!industry || !jobTitle) {
      setError('Please provide both industry and job title.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Simulating API call - in a real app, you would have an endpoint for this
      setTimeout(() => {
        const result = generateJobDescription(industry, jobTitle, experienceLevel, skills);
        setGeneratedRole(result);
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      setError('Error generating role description. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };
  
  // Simplified job description generator (for demo purposes)
  const generateJobDescription = (industry, title, level, skills) => {
    const levelMap = {
      'entry': 'Entry-level',
      'mid': 'Mid-level',
      'senior': 'Senior',
      'executive': 'Executive'
    };
    
    const levelText = levelMap[level] || 'Mid-level';
    const skillsList = skills ? skills.split(',').map(s => s.trim()) : [];
    
    let description = `# ${levelText} ${title} - ${industry}\n\n`;
    description += `## About the Role\n`;
    description += `We're looking for a ${levelText} ${title} to join our growing ${industry} team. `;
    description += `The ideal candidate will have strong problem-solving abilities and excellent communication skills.\n\n`;
    
    description += `## Responsibilities\n`;
    description += `- Design and implement solutions for ${industry}-related challenges\n`;
    description += `- Collaborate with cross-functional teams to deliver high-quality products\n`;
    description += `- Stay current with industry trends and best practices\n`;
    description += `- Participate in code reviews and technical discussions\n\n`;
    
    if (skillsList.length > 0) {
      description += `## Required Skills\n`;
      skillsList.forEach(skill => {
        description += `- ${skill}\n`;
      });
      description += '\n';
    }
    
    description += `## Qualifications\n`;
    if (level === 'entry') {
      description += `- Bachelor's degree in relevant field or equivalent experience\n`;
      description += `- 0-2 years of experience in ${industry}\n`;
    } else if (level === 'mid') {
      description += `- Bachelor's degree in relevant field or equivalent experience\n`;
      description += `- 2-5 years of experience in ${industry}\n`;
    } else if (level === 'senior') {
      description += `- Bachelor's degree in relevant field or equivalent experience\n`;
      description += `- 5+ years of experience in ${industry}\n`;
      description += `- Experience leading small to medium-sized teams\n`;
    } else if (level === 'executive') {
      description += `- Bachelor's/Master's degree in relevant field or equivalent experience\n`;
      description += `- 10+ years of experience in ${industry}\n`;
      description += `- Proven track record of leadership and strategy development\n`;
    }
    
    return description;
  };

  return (
    <div className="container">
      <h2 className="mb-4">Role Description Generator</h2>
      <p className="mb-4">Generate custom job descriptions to better understand what employers are looking for.</p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="row">
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h5>Job Details</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="industry" className="form-label">Industry</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="industry" 
                    placeholder="e.g. Technology, Healthcare, Finance"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="jobTitle" className="form-label">Job Title</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="jobTitle" 
                    placeholder="e.g. Software Engineer, Project Manager"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="experienceLevel" className="form-label">Experience Level</label>
                  <select 
                    className="form-select" 
                    id="experienceLevel"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="executive">Executive Level</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="skills" className="form-label">Key Skills (comma separated)</label>
                  <textarea 
                    className="form-control" 
                    id="skills" 
                    rows="3"
                    placeholder="e.g. JavaScript, React, Node.js"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading || !isAuthenticated}
                >
                  {loading ? 'Generating...' : 'Generate Role Description'}
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-7">
          <div className="card">
            <div className="card-header">
              <h5>Generated Role Description</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Generating role description...</p>
                </div>
              ) : generatedRole ? (
                <div className="generated-content">
                  {generatedRole.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) {
                      return <h3 key={i}>{line.substring(2)}</h3>;
                    } else if (line.startsWith('## ')) {
                      return <h5 key={i} className="mt-3">{line.substring(3)}</h5>;
                    } else if (line.startsWith('- ')) {
                      return <p key={i} className="mb-1">• {line.substring(2)}</p>;
                    } else {
                      return <p key={i}>{line}</p>;
                    }
                  })}
                </div>
              ) : (
                <p className="text-muted text-center my-5">
                  Fill out the form and click "Generate Role Description" to create a custom job description.
                </p>
              )}
            </div>
            {generatedRole && (
              <div className="card-footer text-end">
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedRole);
                    alert('Role description copied to clipboard!');
                  }}
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleGenerator;