import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h2 className="card-title mb-4">My Profile</h2>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="card bg-light border-0">
                    <div className="card-body text-center">
                      <i className="bi bi-person-circle display-4 text-primary mb-3"></i>
                      <h5 className="card-title">Account Information</h5>
                      <p className="text-muted">Manage your account details</p>
                      <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6 mb-4">
                  <div className="card bg-light border-0">
                    <div className="card-body text-center">
                      <i className="bi bi-file-earmark-text display-4 text-success mb-3"></i>
                      <h5 className="card-title">My Resumes</h5>
                      <p className="text-muted">View and manage your resumes</p>
                      <Link to="/resumes" className="btn btn-success">
                        <i className="bi bi-eye me-2"></i>View My Resumes
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="card bg-light border-0">
                    <div className="card-body text-center">
                      <i className="bi bi-tools display-4 text-info mb-3"></i>
                      <h5 className="card-title">Resume Builder</h5>
                      <p className="text-muted">Create a new resume</p>
                      <Link to="/builder" className="btn btn-info">
                        <i className="bi bi-plus-circle me-2"></i>Build Resume
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6 mb-4">
                  <div className="card bg-light border-0">
                    <div className="card-body text-center">
                      <i className="bi bi-check-circle display-4 text-warning mb-3"></i>
                      <h5 className="card-title">ATS Checker</h5>
                      <p className="text-muted">Check your resume's ATS compatibility</p>
                      <Link to="/ats" className="btn btn-warning">
                        <i className="bi bi-search me-2"></i>Check ATS Score
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;