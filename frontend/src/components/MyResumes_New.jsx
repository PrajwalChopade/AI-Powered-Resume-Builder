import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function MyResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadResumes();
    
    // Check for success message from navigation state
    if (location.state && location.state.success) {
      setShowSuccess(true);
      setSuccessMessage(location.state.message || 'Operation completed successfully!');
      setTimeout(() => setShowSuccess(false), 5000);
      
      // Clear the state to prevent showing again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, currentPage, searchTerm]);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = {
        page: currentPage,
        limit: 10
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await axios.get('/api/resumes', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params
      });
      
      setResumes(response.data.resumes || []);
      setPagination(response.data.pagination || {});
      setLoading(false);
    } catch (err) {
      console.error('Error loading resumes:', err);
      setError('Failed to load resumes');
      setLoading(false);
    }
  };

  const deleteResume = async (resumeId, resumeTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${resumeTitle}"?`)) {
      return;
    }

    try {
      setDeletingId(resumeId);
      const token = localStorage.getItem('token');
      
      await axios.delete(`/api/resume/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Remove the resume from the list
      setResumes(resumes.filter(resume => resume.id !== resumeId));
      setSuccessMessage('Resume deleted successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error deleting resume:', err);
      setError('Failed to delete resume');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadResume = async (resumeId, resumeName) => {
    try {
      setDownloadingId(resumeId);
      const token = localStorage.getItem('token');
      
      // First get the resume data
      const resumeResponse = await axios.get(`/api/resume/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const resumeData = resumeResponse.data.structured_data;
      
      // Generate PDF
      const response = await axios.post('/api/resume/generate-pdf', {
        resumeData: resumeData
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${resumeName.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('Resume downloaded successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError('Failed to download resume. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const editResume = (resumeId) => {
    navigate(`/resume-builder?edit=${resumeId}`);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompletionBadge = (percentage) => {
    if (percentage >= 90) return { class: 'bg-success', text: 'Complete' };
    if (percentage >= 70) return { class: 'bg-warning', text: 'Good' };
    if (percentage >= 50) return { class: 'bg-info', text: 'Basic' };
    return { class: 'bg-secondary', text: 'Draft' };
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          {/* Success Alert */}
          {showSuccess && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              {successMessage}
              <button type="button" className="btn-close" onClick={() => setShowSuccess(false)}></button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">My Resumes</h2>
              <p className="text-muted mb-0">
                {pagination.total || 0} resume{(pagination.total || 0) !== 1 ? 's' : ''} found
              </p>
            </div>
            <Link to="/resume-builder" className="btn btn-primary">
              <i className="bi bi-plus-lg me-2"></i>Create New Resume
            </Link>
          </div>

          {/* Search Bar */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search resumes by title or keywords..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>

          {/* Resumes Grid */}
          {resumes.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '4rem' }}></i>
              <h4 className="mt-3 text-muted">No resumes found</h4>
              <p className="text-muted mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first resume!'}
              </p>
              <Link to="/resume-builder" className="btn btn-primary">
                <i className="bi bi-plus-lg me-2"></i>Create Your First Resume
              </Link>
            </div>
          ) : (
            <>
              <div className="row">
                {resumes.map((resume) => {
                  const completionBadge = getCompletionBadge(resume.metadata?.completion_percentage || 0);
                  
                  return (
                    <div key={resume.id} className="col-lg-6 col-xl-4 mb-4">
                      <div className="card h-100 shadow-sm hover-card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <div 
                              className="resume-color-indicator me-2"
                              style={{ 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                backgroundColor: resume.preview?.color || '#0d6efd' 
                              }}
                            ></div>
                            <small className="text-muted">
                              {resume.preview?.template || 'Modern'} Template
                            </small>
                          </div>
                          <span className={`badge ${completionBadge.class}`}>
                            {completionBadge.text}
                          </span>
                        </div>
                        
                        <div className="card-body">
                          <h5 className="card-title mb-3 text-truncate" title={resume.title}>
                            {resume.title}
                          </h5>
                          
                          <div className="resume-preview-info mb-3">
                            {resume.preview?.name && (
                              <p className="mb-1">
                                <i className="bi bi-person me-2"></i>
                                <strong>{resume.preview.name}</strong>
                              </p>
                            )}
                            {resume.preview?.email && (
                              <p className="mb-1 text-muted">
                                <i className="bi bi-envelope me-2"></i>
                                {resume.preview.email}
                              </p>
                            )}
                            {resume.preview?.summary && (
                              <p className="mb-2 text-muted small">
                                {resume.preview.summary}
                              </p>
                            )}
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <small className="text-muted">
                              <i className="bi bi-calendar3 me-1"></i>
                              Updated {formatDate(resume.updated_at)}
                            </small>
                            {resume.ats_score > 0 && (
                              <span className={`badge ${resume.ats_score >= 80 ? 'bg-success' : resume.ats_score >= 60 ? 'bg-warning' : 'bg-danger'}`}>
                                ATS: {resume.ats_score}%
                              </span>
                            )}
                          </div>
                          
                          {resume.keywords && resume.keywords.length > 0 && (
                            <div className="mb-3">
                              <div className="d-flex flex-wrap">
                                {resume.keywords.slice(0, 3).map((keyword, index) => (
                                  <span key={index} className="badge bg-light text-dark me-1 mb-1">
                                    {keyword}
                                  </span>
                                ))}
                                {resume.keywords.length > 3 && (
                                  <span className="badge bg-light text-muted">
                                    +{resume.keywords.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="card-footer bg-transparent">
                          <div className="btn-group w-100" role="group">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => editResume(resume.id)}
                              title="Edit Resume"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            
                            <button
                              className="btn btn-outline-success"
                              onClick={() => downloadResume(resume.id, resume.preview?.name || resume.title)}
                              disabled={downloadingId === resume.id}
                              title="Download PDF"
                            >
                              {downloadingId === resume.id ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              ) : (
                                <i className="bi bi-download"></i>
                              )}
                            </button>
                            
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => deleteResume(resume.id, resume.title)}
                              disabled={deletingId === resume.id}
                              title="Delete Resume"
                            >
                              {deletingId === resume.id ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <nav aria-label="Resume pagination">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {[...Array(pagination.pages)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <li key={page} className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .hover-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        }
        
        .resume-color-indicator {
          flex-shrink: 0;
        }
        
        .btn-group .btn {
          flex: 1;
        }
        
        .badge {
          font-size: 0.75em;
        }
        
        .card-title {
          line-height: 1.2;
        }
        
        .resume-preview-info {
          min-height: 80px;
        }
      `}</style>
    </div>
  );
}

export default MyResumes;
