import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function ResumeEditor() {
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchResumes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/resume/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setResumes(response.data);
        if (response.data.length > 0) {
          setSelectedResume(response.data[0]);
          setContent(response.data[0].content);
        }
      } catch (err) {
        setError('Failed to load resumes. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [isAuthenticated, navigate]);

  const handleResumeSelect = (resume) => {
    setSelectedResume(resume);
    setContent(resume.content);
    setEditMode(false);
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.put(`/api/resume/${selectedResume._id}`, {
        content: content
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setEditMode(false);
      
      // Refresh resumes after save
      const response = await axios.get('/api/resume/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setResumes(response.data);
      setSelectedResume(response.data.find(r => r._id === selectedResume._id));
      
      setError('');
    } catch (err) {
      setError('Failed to save resume. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    navigate('/ats');
  };

  const handleNew = () => {
    navigate('/builder');
  };

  if (loading && !selectedResume) {
    return (
      <div className="container text-center my-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading resumes...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="mb-4">Resume Editor</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {resumes.length === 0 ? (
        <div className="text-center my-5">
          <p>You haven't created any resumes yet.</p>
          <button className="btn btn-primary" onClick={handleNew}>Create Resume</button>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-3">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">My Resumes</h5>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {resumes.map((resume) => (
                    <button
                      key={resume._id}
                      className={`list-group-item list-group-item-action ${selectedResume && resume._id === selectedResume._id ? 'active' : ''}`}
                      onClick={() => handleResumeSelect(resume)}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">Resume {new Date(resume.createdAt).toLocaleDateString()}</h6>
                        <small>{resume.atsScore}%</small>
                      </div>
                      <small>{resume.keywords.slice(0, 3).join(', ')}...</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-sm btn-primary w-100" onClick={handleNew}>Create New</button>
              </div>
            </div>
          </div>
          
          <div className="col-md-9">
            {selectedResume ? (
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Resume Content</h5>
                  <div>
                    <button 
                      className={`btn btn-sm ${editMode ? 'btn-success' : 'btn-secondary'} me-2`}
                      onClick={editMode ? handleSave : handleEditToggle}
                    >
                      {editMode ? 'Save' : 'Edit'}
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={handleAnalyze}>
                      Analyze
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {editMode ? (
                    <textarea
                      className="form-control"
                      rows="20"
                      value={content}
                      onChange={handleContentChange}
                    ></textarea>
                  ) : (
                    <div className="resume-preview">
                      {content.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small>ATS Score: <span className="badge bg-primary">{selectedResume.atsScore}%</span></small>
                    </div>
                    <div>
                      <small>Last Updated: {new Date(selectedResume.updatedAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert alert-info">
                Select a resume from the list or create a new one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeEditor;