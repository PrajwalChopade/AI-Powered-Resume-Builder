import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
// Import icons
import { BsPersonFill, BsBriefcaseFill, BsBookFill, BsTools, BsCodeSlash, BsLayoutTextSidebarReverse, BsTrophyFill } from 'react-icons/bs';

function ResumeBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editResumeId = searchParams.get('edit');
  
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Personal Info
    name: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    profileImage: '',

    // Education
    education: [{ school: '', degree: '', field: '', startDate: '', endDate: '', description: '' }],

    // Work Experience
    experience: [{ company: '', position: '', startDate: '', endDate: '', current: false, description: '' }],

    // Skills
    skills: [''],

    // Projects
    projects: [{ title: '', description: '', technologies: '', link: '' }],

    // Extra-Curricular Activities
    activities: [{ title: '', organization: '', startDate: '', endDate: '', description: '' }],

    // Layout Options
    layout: {
      template: 'modern',
      color: '#0d6efd',
      font: 'Inter'
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resumeId, setResumeId] = useState(null);
  const [resumeTitle, setResumeTitle] = useState('');

  // Calculate progress when formData changes
  React.useEffect(() => {
    let completedSections = 0;
    
    // Check personal info
    if (formData.name && formData.email) completedSections++;
    
    // Check education
    if (formData.education.some(edu => edu.school && edu.degree)) completedSections++;
    
    // Check experience
    if (formData.experience.some(exp => exp.company && exp.position)) completedSections++;
    
    // Check skills
    if (formData.skills.filter(s => s.trim()).length > 0) completedSections++;
    
    // Check projects
    if (formData.projects.some(proj => proj.title)) completedSections++;
    
    // Check activities (optional, doesn't affect progress)
    
    // Calculate percentage (5 sections total)
    setProgress((completedSections / 5) * 100);
  }, [formData]);

  // Load existing resume data if editing
  useEffect(() => {
    const loadResumeData = async () => {
      if (editResumeId) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`/api/resume/${editResumeId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const resume = response.data;
          const resumeData = JSON.parse(resume.content);
          
          setResumeId(editResumeId);
          setResumeTitle(resume.title);
          setFormData({
            ...resumeData,
            // Ensure activities array exists
            activities: resumeData.activities || [{ title: '', organization: '', startDate: '', endDate: '', description: '' }]
          });
          
          // If preview parameter is set, go directly to preview mode
          const previewParam = searchParams.get('preview');
          if (previewParam === 'true') {
            setPreviewMode(true);
          }
        } catch (err) {
          console.error('Error loading resume:', err);
          setError('Failed to load resume data');
        }
      }
    };
    
    loadResumeData();
  }, [editResumeId, searchParams]);

  const handleChange = (e, section = null, index = null, field = null) => {
    if (section && index !== null && field !== null) {
      // For arrays like education, experience, etc.
      const updatedSection = [...formData[section]];
      updatedSection[index][field] = e.target.value;
      
      setFormData({
        ...formData,
        [section]: updatedSection
      });
    } else if (section === 'layout') {
      // For nested layout object
      setFormData({
        ...formData,
        layout: {
          ...formData.layout,
          [e.target.name]: e.target.value
        }
      });
    } else if (section === 'skills' && index !== null) {
      // For simple skills array
      const updatedSkills = [...formData.skills];
      updatedSkills[index] = e.target.value;
      
      setFormData({
        ...formData,
        skills: updatedSkills
      });
    } else {
      // For regular fields
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const addItem = (section) => {
    let newItem;
    
    switch(section) {
      case 'education':
        newItem = { school: '', degree: '', field: '', startDate: '', endDate: '', description: '' };
        break;
      case 'experience':
        newItem = { company: '', position: '', startDate: '', endDate: '', current: false, description: '' };
        break;
      case 'skills':
        newItem = '';
        break;
      case 'projects':
        newItem = { title: '', description: '', technologies: '', link: '' };
        break;
      case 'activities':
        newItem = { title: '', organization: '', startDate: '', endDate: '', description: '' };
        break;
      default:
        return;
    }
    
    setFormData({
      ...formData,
      [section]: [...formData[section], newItem]
    });
  };

  const removeItem = (section, index) => {
    if (formData[section].length <= 1) return;
    
    const updatedItems = [...formData[section]];
    updatedItems.splice(index, 1);
    
    setFormData({
      ...formData,
      [section]: updatedItems
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Format the resume content for the API
      const resumeContent = JSON.stringify(formData);
      const title = resumeTitle || `${formData.name}'s Resume - ${new Date().toLocaleDateString()}`;
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/resume/create', {
        title,
        content: resumeContent,
        keywords: formData.skills.filter(skill => skill.trim() !== ''),
        atsScore: 0, // Will be calculated by backend if needed
        resumeId: resumeId // Include resume ID for updates
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setLoading(false);
      // Update resumeId if it's a new resume
      if (!resumeId) {
        setResumeId(response.data._id);
      }
      
      // Show success message
      navigate('/my-resumes', { state: { success: true, message: resumeId ? 'Resume updated successfully!' : 'Resume saved successfully!' } });
    } catch (err) {
      setError('Failed to save resume. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  const downloadPDF = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('/api/resume/generate-pdf', {
        resumeData: formData
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
      link.setAttribute('download', `${formData.name || 'Resume'}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setLoading(false);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
      setLoading(false);
    }
  };

  const renderPreview = () => {
    const primaryColor = formData.layout.color;
    
    // Template styles
    const templates = {
      modern: {
        sectionTitle: { 
          borderBottom: `2px solid ${primaryColor}`, 
          paddingBottom: '8px',
          marginBottom: '16px',
          color: primaryColor
        },
        name: { fontSize: '2.5rem', fontWeight: 700, color: primaryColor },
        headerBg: 'transparent'
      },
      classic: {
        sectionTitle: { 
          borderBottom: '1px solid #ccc', 
          paddingBottom: '8px',
          marginBottom: '16px',
          fontFamily: 'serif'
        },
        name: { fontSize: '2.2rem', fontWeight: 700, fontFamily: 'serif' },
        headerBg: 'transparent'
      },
      minimal: {
        sectionTitle: { 
          marginBottom: '16px',
          color: primaryColor,
          textTransform: 'uppercase',
          fontSize: '1rem',
          letterSpacing: '2px'
        },
        name: { fontSize: '2rem', fontWeight: 300, color: '#333' },
        headerBg: 'transparent'
      },
      professional: {
        sectionTitle: { 
          backgroundColor: primaryColor,
          color: 'white',
          padding: '6px 12px',
          marginBottom: '16px'
        },
        name: { fontSize: '2.2rem', fontWeight: 600, color: '#333' },
        headerBg: primaryColor,
        headerTextColor: 'white',
        headerPadding: '20px'
      }
    };
    
    const selectedTemplate = templates[formData.layout.template] || templates.modern;
    
    return (
      <div className="resume-preview p-4 shadow-sm" style={{ fontFamily: formData.layout.font, maxWidth: '850px', margin: '0 auto' }}>
        <div className="text-center mb-5" style={{ 
          background: selectedTemplate.headerBg, 
          color: selectedTemplate.headerTextColor,
          padding: selectedTemplate.headerPadding || '0'
        }}>
          <h1 style={selectedTemplate.name}>
            {formData.name || 'Your Name'}
          </h1>
          <div className="d-flex justify-content-center flex-wrap">
            {formData.email && <span className="me-3 mb-2"><i className="bi bi-envelope me-2"></i>{formData.email}</span>}
            {formData.phone && <span className="me-3 mb-2"><i className="bi bi-telephone me-2"></i>{formData.phone}</span>}
            {formData.location && <span className="mb-2"><i className="bi bi-geo-alt me-2"></i>{formData.location}</span>}
          </div>
        </div>
        
        {formData.summary && (
          <div className="mb-5">
            <h4 style={selectedTemplate.sectionTitle}>Professional Summary</h4>
            <p>{formData.summary}</p>
          </div>
        )}
        
        {formData.experience.some(exp => exp.company) && (
          <div className="mb-5">
            <h4 style={selectedTemplate.sectionTitle}>Work Experience</h4>
            {formData.experience.map((exp, i) => (
              exp.company && (
                <div key={i} className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 style={{color: primaryColor, fontWeight: 600}}>{exp.position}</h5>
                    <span className="text-muted">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <h6 className="mb-2">{exp.company}</h6>
                  <p>{exp.description}</p>
                </div>
              )
            ))}
          </div>
        )}
        
        {formData.education.some(edu => edu.school) && (
          <div className="mb-5">
            <h4 style={selectedTemplate.sectionTitle}>Education</h4>
            {formData.education.map((edu, i) => (
              edu.school && (
                <div key={i} className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 style={{color: primaryColor, fontWeight: 600}}>{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h5>
                    <span className="text-muted">{edu.startDate} - {edu.endDate}</span>
                  </div>
                  <h6 className="mb-2">{edu.school}</h6>
                  {edu.description && <p>{edu.description}</p>}
                </div>
              )
            ))}
          </div>
        )}
        
        {formData.skills.some(skill => skill) && (
          <div className="mb-5">
            <h4 style={selectedTemplate.sectionTitle}>Skills</h4>
            <div className="d-flex flex-wrap">
              {formData.skills
                .filter(skill => skill)
                .map((skill, i) => (
                  <span key={i} className="skill-badge" style={{
                    backgroundColor: `${primaryColor}20`, // 20% opacity
                    color: primaryColor,
                    padding: '6px 12px',
                    borderRadius: '4px',
                    margin: '0 8px 8px 0',
                    display: 'inline-block',
                    fontWeight: 500
                  }}>
                    {skill}
                  </span>
                ))}
            </div>
          </div>
        )}
        
        {formData.projects.some(proj => proj.title) && (
          <div className="mb-4">
            <h4 style={selectedTemplate.sectionTitle}>Projects</h4>
            {formData.projects.map((proj, i) => (
              proj.title && (
                <div key={i} className="mb-4">
                  <h5 style={{color: primaryColor, fontWeight: 600}}>{proj.title}</h5>
                  {proj.technologies && (
                    <p className="mb-2">
                      <small className="text-muted">Technologies: {proj.technologies}</small>
                    </p>
                  )}
                  <p>{proj.description}</p>
                  {proj.link && (
                    <a 
                      href={proj.link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-sm" 
                      style={{backgroundColor: primaryColor, color: 'white'}}
                    >
                      View Project <i className="bi bi-box-arrow-up-right ms-1"></i>
                    </a>
                  )}
                </div>
              )
            ))}
          </div>
        )}

        {formData.activities && formData.activities.some(activity => activity.title) && (
          <div className="mb-4">
            <h4 style={selectedTemplate.sectionTitle}>Extra-Curricular Activities</h4>
            {formData.activities.map((activity, i) => (
              activity.title && (
                <div key={i} className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 style={{color: primaryColor, fontWeight: 600}}>{activity.title}</h5>
                    {(activity.startDate || activity.endDate) && (
                      <span className="text-muted">{activity.startDate} - {activity.endDate}</span>
                    )}
                  </div>
                  {activity.organization && <h6 className="mb-2">{activity.organization}</h6>}
                  {activity.description && <p>{activity.description}</p>}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    );
  };

  if (previewMode) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0 fw-bold">
            <span className="text-primary">Resume</span> Preview
          </h2>
          <div>
            <button className="btn btn-outline-secondary me-2" onClick={togglePreview}>
              <i className="bi bi-pencil me-1"></i> Back to Edit
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-1"></i> Save Resume
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-danger mb-4 d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </div>
        )}
        
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-0">
            {renderPreview()}
          </div>
          <div className="card-footer bg-white text-end py-3">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={downloadPDF}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Generating...
                </>
              ) : (
                <>
                  <i className="bi bi-download me-1"></i> Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="container">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              <span className="text-primary">Resume</span> Builder
            </h2>
            <p className="text-muted mb-0">Create a professional resume in minutes</p>
          </div>
          <div className="mt-3 mt-md-0">
            <div className="d-flex align-items-center mb-2">
              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <span className="text-muted small">{Math.round(progress)}% complete</span>
            </div>
            <button className="btn btn-primary w-100" onClick={togglePreview}>
              <i className="bi bi-eye me-1"></i> Preview Resume
            </button>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-danger mb-4 d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
          </div>
        )}
        
        <div className="row">
          <div className="col-lg-3 mb-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: "1rem" }}>
              <div className="list-group list-group-flush rounded">
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'personal' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  <BsPersonFill className="me-3" /> Personal Info
                  {formData.name && formData.email && (
                    <span className="ms-auto">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'experience' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('experience')}
                >
                  <BsBriefcaseFill className="me-3" /> Experience
                  {formData.experience.some(exp => exp.company && exp.position) && (
                    <span className="ms-auto">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'education' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('education')}
                >
                  <BsBookFill className="me-3" /> Education
                  {formData.education.some(edu => edu.school && edu.degree) && (
                    <span className="ms-auto">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'skills' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('skills')}
                >
                  <BsTools className="me-3" /> Skills
                  {formData.skills.filter(s => s.trim()).length > 0 && (
                    <span className="ms-auto">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'projects' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('projects')}
                >
                  <BsCodeSlash className="me-3" /> Projects
                  {formData.projects.some(proj => proj.title) && (
                    <span className="ms-auto">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'activities' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('activities')}
                >
                  <BsTrophyFill className="me-3" /> Activities
                  {formData.activities && formData.activities.some(activity => activity.title) && (
                    <span className="ms-auto">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'layout' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('layout')}
                >
                  <BsLayoutTextSidebarReverse className="me-3" /> Layout
                </button>
              </div>
            </div>
          </div>
          
          <div className="col-lg-9">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <form>
                  {/* Personal Info Tab */}
                  {activeTab === 'personal' && (
                    <div>
                      <div className="d-sm-flex justify-content-between align-items-center mb-4">
                        <h4 className="card-title mb-sm-0">Personal Information</h4>
                        <span className="text-muted small">* Required fields</span>
                      </div>
                      
                      {/* <div className="mb-4">
                        <label htmlFor="profileImage" className="form-label">Profile Image (Optional)</label>
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle bg-light d-flex justify-content-center align-items-center me-3" 
                            style={{ width: '80px', height: '80px', overflow: 'hidden', border: formData.profileImage ? 'none' : '2px dashed #ccc' }}
                          >
                            {formData.profileImage ? 
                              <img src={formData.profileImage} alt="Profile" className="w-100 h-100 object-fit-cover" /> :
                              <i className="bi bi-person text-muted" style={{ fontSize: '2rem' }}></i>
                            }
                          </div>
                          <div>
                            <input
                              type="file"
                              className="form-control"
                              id="profileImage"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setFormData({
                                      ...formData,
                                      profileImage: event.target.result
                                    });
                                  };
                                  reader.readAsDataURL(e.target.files[0]);
                                }
                              }}
                            />
                            <div className="form-text">Maximum size: 1MB. Recommended: square image.</div>
                          </div>
                        </div>
                      </div> */}
                      
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label htmlFor="name" className="form-label">Full Name *</label>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Prajwal"
                            required
                          />
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label htmlFor="email" className="form-label">Email Address *</label>
                          <div className="input-group input-group-lg">
                            <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                            <input
                              type="email"
                              className="form-control"
                              id="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="prajwal@example.com"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label htmlFor="phone" className="form-label">Phone Number</label>
                          <div className="input-group input-group-lg">
                            <span className="input-group-text"><i className="bi bi-telephone"></i></span>
                            <input
                              type="tel"
                              className="form-control"
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="1234567890"
                            />
                          </div>
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label htmlFor="location" className="form-label">Location</label>
                          <div className="input-group input-group-lg">
                            <span className="input-group-text"><i className="bi bi-geo-alt"></i></span>
                            <input
                              type="text"
                              className="form-control"
                              id="location"
                              name="location"
                              placeholder="City, State"
                              value={formData.location}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="summary" className="form-label">Professional Summary</label>
                        <textarea
                          className="form-control"
                          id="summary"
                          name="summary"
                          rows="4"
                          value={formData.summary}
                          onChange={handleChange}
                          placeholder="Write a short summary of your professional background and career goals..."
                        ></textarea>
                        <div className="form-text">
                          Tip: Keep your summary concise (3-5 sentences) and highlight your most relevant qualifications.
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-end mt-4">
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('experience')}
                        >
                          Next: Work Experience <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Experience Tab */}
                  {activeTab === 'experience' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="card-title mb-0">Work Experience</h4>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={() => addItem('experience')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Add Experience
                        </button>
                      </div>
                      
                      {formData.experience.length === 0 && (
                        <div className="alert alert-info d-flex align-items-center" role="alert">
                          <i className="bi bi-info-circle-fill me-2"></i>
                          <div>Add your work experience to make your resume stand out.</div>
                        </div>
                      )}
                      
                      {formData.experience.map((exp, index) => (
                        <div key={index} className="card mb-4 border-0 shadow-sm">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                            <h5 className="card-title mb-0">
                              {exp.position || exp.company ? 
                                `${exp.position || 'Position'} at ${exp.company || 'Company'}` : 
                                `Experience #${index + 1}`}
                            </h5>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem('experience', index)}
                            >
                              <i className="bi bi-trash me-1"></i> Remove
                            </button>
                          </div>
                          
                          <div className="card-body p-4">
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Company Name *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Google, Microsoft, etc."
                                  value={exp.company}
                                  onChange={(e) => handleChange(e, 'experience', index, 'company')}
                                  required
                                />
                              </div>
                              
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Job Title *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Software Engineer, Project Manager, etc."
                                  value={exp.position}
                                  onChange={(e) => handleChange(e, 'experience', index, 'position')}
                                  required
                                />
                              </div>
                            </div>
                            
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Start Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY"
                                  value={exp.startDate}
                                  onChange={(e) => handleChange(e, 'experience', index, 'startDate')}
                                />
                              </div>
                              
                              <div className="col-md-6 mb-3">
                                <label className="form-label">End Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY or Present"
                                  value={exp.endDate}
                                  onChange={(e) => handleChange(e, 'experience', index, 'endDate')}
                                  disabled={exp.current}
                                />
                                <div className="form-check mt-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`currentPosition-${index}`}
                                    checked={exp.current}
                                    onChange={(e) => {
                                      const updatedExp = [...formData.experience];
                                      updatedExp[index].current = e.target.checked;
                                      updatedExp[index].endDate = e.target.checked ? 'Present' : '';
                                      setFormData({ ...formData, experience: updatedExp });
                                    }}
                                  />
                                  <label className="form-check-label" htmlFor={`currentPosition-${index}`}>
                                    I currently work here
                                  </label>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Description</label>
                              <textarea
                                className="form-control"
                                rows="4"
                                placeholder="Describe your responsibilities and achievements in this role..."
                                value={exp.description}
                                onChange={(e) => handleChange(e, 'experience', index, 'description')}
                              ></textarea>
                              <div className="form-text">
                                Tip: Use bullet points starting with strong action verbs and include measurable achievements.
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('personal')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('education')}
                        >
                          Next: Education <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Education Tab */}
                  {activeTab === 'education' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="card-title mb-0">Education</h4>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={() => addItem('education')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Add Education
                        </button>
                      </div>
                      
                      {formData.education.map((edu, index) => (
                        <div key={index} className="card mb-4 border-0 shadow-sm">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                            <h5 className="card-title mb-0">
                              {edu.school ? edu.school : `Education #${index + 1}`}
                            </h5>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem('education', index)}
                            >
                              <i className="bi bi-trash me-1"></i> Remove
                            </button>
                          </div>
                          
                          <div className="card-body p-4">
                            <div className="mb-3">
                              <label className="form-label">School/University *</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Harvard University, MIT, etc."
                                value={edu.school}
                                onChange={(e) => handleChange(e, 'education', index, 'school')}
                                required
                              />
                            </div>
                            
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Degree *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Bachelor's, Master's, Ph.D., etc."
                                  value={edu.degree}
                                  onChange={(e) => handleChange(e, 'education', index, 'degree')}
                                  required
                                />
                              </div>
                              
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Field of Study</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Computer Science, Business, etc."
                                  value={edu.field}
                                  onChange={(e) => handleChange(e, 'education', index, 'field')}
                                />
                              </div>
                            </div>
                            
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Start Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY"
                                  value={edu.startDate}
                                  onChange={(e) => handleChange(e, 'education', index, 'startDate')}
                                />
                              </div>
                              
                              <div className="col-md-6 mb-3">
                                <label className="form-label">End Date (or Expected)</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY"
                                  value={edu.endDate}
                                  onChange={(e) => handleChange(e, 'education', index, 'endDate')}
                                />
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Description (Optional)</label>
                              <textarea
                                className="form-control"
                                rows="3"
                                placeholder="Relevant coursework, achievements, activities, etc."
                                value={edu.description}
                                onChange={(e) => handleChange(e, 'education', index, 'description')}
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('experience')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('skills')}
                        >
                          Next: Skills <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Skills Tab */}
                  {activeTab === 'skills' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h4 className="card-title mb-1">Skills</h4>
                          <p className="text-muted mb-0">Add your professional skills and competencies</p>
                        </div>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={() => addItem('skills')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Add Skill
                        </button>
                      </div>
                      
                      <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          {formData.skills.map((skill, index) => (
                            <div key={index} className="input-group mb-3">
                              <span className="input-group-text"><i className="bi bi-check2-circle"></i></span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. JavaScript, Project Management, Customer Service"
                                value={skill}
                                onChange={(e) => handleChange(e, 'skills', index)}
                              />
                              <button 
                                className="btn btn-outline-danger" 
                                type="button"
                                onClick={() => removeItem('skills', index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          ))}
                          
                          <div className="alert alert-info mt-3 mb-0">
                            <i className="bi bi-lightbulb-fill me-2"></i>
                            <span>Include both technical skills (like programming languages) and soft skills (like communication) relevant to the job.</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('education')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('projects')}
                        >
                          Next: Projects <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Projects Tab */}
                  {activeTab === 'projects' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h4 className="card-title mb-1">Projects</h4>
                          <p className="text-muted mb-0">Add professional or personal projects that showcase your skills</p>
                        </div>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={() => addItem('projects')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Add Project
                        </button>
                      </div>
                      
                      {formData.projects.map((project, index) => (
                        <div key={index} className="card mb-4 border-0 shadow-sm">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                            <h5 className="card-title mb-0">{project.title || `Project #${index + 1}`}</h5>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem('projects', index)}
                            >
                              <i className="bi bi-trash me-1"></i> Remove
                            </button>
                          </div>
                          
                          <div className="card-body p-4">
                            <div className="mb-3">
                              <label className="form-label">Project Title *</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="E-commerce Website, Mobile App, etc."
                                value={project.title}
                                onChange={(e) => handleChange(e, 'projects', index, 'title')}
                                required
                              />
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Technologies Used</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. React, Node.js, MongoDB"
                                value={project.technologies}
                                onChange={(e) => handleChange(e, 'projects', index, 'technologies')}
                              />
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Description</label>
                              <textarea
                                className="form-control"
                                rows="4"
                                placeholder="Describe the project, your role, and the outcomes..."
                                value={project.description}
                                onChange={(e) => handleChange(e, 'projects', index, 'description')}
                              ></textarea>
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">
                                <div className="d-flex align-items-center">
                                  Project Link <span className="badge bg-light text-dark ms-2">Optional</span>
                                </div>
                              </label>
                              <div className="input-group">
                                <span className="input-group-text"><i className="bi bi-link-45deg"></i></span>
                                <input
                                  type="url"
                                  className="form-control"
                                  placeholder="https://..."
                                  value={project.link}
                                  onChange={(e) => handleChange(e, 'projects', index, 'link')}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('skills')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('activities')}
                        >
                          Next: Activities <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Activities Tab */}
                  {activeTab === 'activities' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h4 className="card-title mb-1">Extra-Curricular Activities</h4>
                          <p className="text-muted mb-0">Add leadership roles, volunteer work, clubs, and achievements</p>
                        </div>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={() => addItem('activities')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Add Activity
                        </button>
                      </div>
                      
                      {formData.activities && formData.activities.length === 0 && (
                        <div className="alert alert-info d-flex align-items-center" role="alert">
                          <i className="bi bi-info-circle-fill me-2"></i>
                          <div>Extra-curricular activities are optional but can help showcase your leadership and interests.</div>
                        </div>
                      )}
                      
                      {formData.activities && formData.activities.map((activity, index) => (
                        <div key={index} className="card mb-4 border-0 shadow-sm">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                            <h5 className="card-title mb-0">{activity.title || `Activity #${index + 1}`}</h5>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem('activities', index)}
                            >
                              <i className="bi bi-trash me-1"></i> Remove
                            </button>
                          </div>
                          
                          <div className="card-body p-4">
                            <div className="mb-3">
                              <label className="form-label">Activity Title *</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="President of Student Council, Volunteer at Local NGO, etc."
                                value={activity.title}
                                onChange={(e) => handleChange(e, 'activities', index, 'title')}
                                required
                              />
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Organization/Club</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Organization, club, or institution name"
                                value={activity.organization}
                                onChange={(e) => handleChange(e, 'activities', index, 'organization')}
                              />
                            </div>
                            
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Start Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY"
                                  value={activity.startDate}
                                  onChange={(e) => handleChange(e, 'activities', index, 'startDate')}
                                />
                              </div>
                              
                              <div className="col-md-6 mb-3">
                                <label className="form-label">End Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY or Present"
                                  value={activity.endDate}
                                  onChange={(e) => handleChange(e, 'activities', index, 'endDate')}
                                />
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Description</label>
                              <textarea
                                className="form-control"
                                rows="4"
                                placeholder="Describe your role, responsibilities, and achievements..."
                                value={activity.description}
                                onChange={(e) => handleChange(e, 'activities', index, 'description')}
                              ></textarea>
                              <div className="form-text">
                                Tip: Highlight leadership roles and measurable impact (e.g., "Led team of 20 volunteers", "Raised $5,000 for charity").
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('projects')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('layout')}
                        >
                          Next: Layout <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Activities Tab */}
                  {activeTab === 'activities' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h4 className="card-title mb-1">Extra-Curricular Activities</h4>
                          <p className="text-muted mb-0">Add activities, volunteer work, leadership roles, and achievements</p>
                        </div>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={() => addItem('activities')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Add Activity
                        </button>
                      </div>
                      
                      {formData.activities.map((activity, index) => (
                        <div key={index} className="card mb-4 border-0 shadow-sm">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                            <h5 className="card-title mb-0">{activity.title || `Activity #${index + 1}`}</h5>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeItem('activities', index)}
                            >
                              <i className="bi bi-trash me-1"></i> Remove
                            </button>
                          </div>
                          
                          <div className="card-body p-4">
                            <div className="mb-3">
                              <label className="form-label">Activity/Role Title *</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="President, Volunteer, Team Captain, etc."
                                value={activity.title}
                                onChange={(e) => handleChange(e, 'activities', index, 'title')}
                                required
                              />
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Organization/Club</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Student Council, Red Cross, Sports Club, etc."
                                value={activity.organization}
                                onChange={(e) => handleChange(e, 'activities', index, 'organization')}
                              />
                            </div>
                            
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Start Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY"
                                  value={activity.startDate}
                                  onChange={(e) => handleChange(e, 'activities', index, 'startDate')}
                                />
                              </div>
                              
                              <div className="col-md-6 mb-3">
                                <label className="form-label">End Date</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="MM/YYYY or Present"
                                  value={activity.endDate}
                                  onChange={(e) => handleChange(e, 'activities', index, 'endDate')}
                                />
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <label className="form-label">Description</label>
                              <textarea
                                className="form-control"
                                rows="4"
                                placeholder="Describe your role, responsibilities, and achievements..."
                                value={activity.description}
                                onChange={(e) => handleChange(e, 'activities', index, 'description')}
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('projects')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('layout')}
                        >
                          Next: Layout <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Layout Tab */}
                  {activeTab === 'layout' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h4 className="card-title mb-1">Layout & Design</h4>
                          <p className="text-muted mb-0">Choose a professional template that best represents your career style</p>
                        </div>
                      </div>
                      
                      <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          <div className="row">
                            <div className="col-12 mb-4">
                              <label className="form-label fw-semibold mb-3">Template Style</label>
                              <div className="row g-4">
                                {/* Executive Template */}
                                <div className="col-lg-6 col-md-12">
                                  <div 
                                    className={`card h-100 ${formData.layout.template === 'executive' ? 'border border-3 border-primary shadow-lg' : 'border shadow-sm'}`}
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        layout: {
                                          ...formData.layout,
                                          template: 'executive'
                                        }
                                      });
                                    }}
                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                  >
                                    <div className="card-body p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0 fw-bold text-dark">Executive</h6>
                                        {formData.layout.template === 'executive' && (
                                          <i className="bi bi-check-circle-fill text-primary fs-5"></i>
                                        )}
                                      </div>
                                      <div 
                                        className="template-preview border rounded p-3" 
                                        style={{ 
                                          height: '280px', 
                                          backgroundColor: '#ffffff',
                                          fontSize: '0.65rem',
                                          fontFamily: 'Georgia, serif',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {/* Executive Template Preview */}
                                        <div className="text-center mb-2 pb-2" style={{ borderBottom: '2px solid #1a365d' }}>
                                          <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#1a365d', letterSpacing: '1px' }}>JOHN ANDERSON</div>
                                          <div className="text-muted" style={{ fontSize: '0.55rem', marginTop: '2px' }}>SENIOR EXECUTIVE • NEW YORK, NY</div>
                                          <div className="text-muted" style={{ fontSize: '0.5rem' }}>john.anderson@email.com • (555) 123-4567</div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1" style={{ color: '#1a365d', fontSize: '0.6rem', letterSpacing: '0.5px' }}>EXECUTIVE SUMMARY</div>
                                          <div style={{ fontSize: '0.5rem', lineHeight: '1.2' }}>Strategic leader with 15+ years driving growth and operational excellence...</div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1" style={{ color: '#1a365d', fontSize: '0.6rem', letterSpacing: '0.5px' }}>PROFESSIONAL EXPERIENCE</div>
                                          <div className="mb-1">
                                            <div className="fw-semibold" style={{ fontSize: '0.55rem' }}>Chief Operating Officer</div>
                                            <div className="text-muted" style={{ fontSize: '0.5rem' }}>Fortune 500 Company • 2020 - Present</div>
                                            <div style={{ fontSize: '0.48rem', lineHeight: '1.1', marginTop: '1px' }}>• Led digital transformation initiatives resulting in 40% efficiency gains</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="fw-bold mb-1" style={{ color: '#1a365d', fontSize: '0.6rem', letterSpacing: '0.5px' }}>EDUCATION</div>
                                          <div style={{ fontSize: '0.5rem' }}>MBA, Harvard Business School</div>
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <small className="text-muted">Perfect for C-level executives and senior management roles</small>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Modern Professional Template */}
                                <div className="col-lg-6 col-md-12">
                                  <div 
                                    className={`card h-100 ${formData.layout.template === 'modern' ? 'border border-3 border-primary shadow-lg' : 'border shadow-sm'}`}
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        layout: {
                                          ...formData.layout,
                                          template: 'modern'
                                        }
                                      });
                                    }}
                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                  >
                                    <div className="card-body p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0 fw-bold text-dark">Modern Professional</h6>
                                        {formData.layout.template === 'modern' && (
                                          <i className="bi bi-check-circle-fill text-primary fs-5"></i>
                                        )}
                                      </div>
                                      <div 
                                        className="template-preview border rounded p-3" 
                                        style={{ 
                                          height: '280px', 
                                          backgroundColor: '#ffffff',
                                          fontSize: '0.65rem',
                                          fontFamily: 'Inter, sans-serif',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {/* Modern Template Preview */}
                                        <div className="row mb-2">
                                          <div className="col-8">
                                            <div className="fw-bold mb-1" style={{ fontSize: '0.85rem', color: '#2563eb' }}>Sarah Mitchell</div>
                                            <div className="text-muted" style={{ fontSize: '0.55rem' }}>Software Engineering Manager</div>
                                            <div className="text-muted" style={{ fontSize: '0.48rem' }}>San Francisco, CA • sarah.mitchell@email.com</div>
                                          </div>
                                          <div className="col-4 text-end">
                                            <div className="text-muted" style={{ fontSize: '0.48rem' }}>(555) 987-6543</div>
                                            <div className="text-muted" style={{ fontSize: '0.48rem' }}>linkedin.com/in/sarah</div>
                                          </div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1 pb-1" style={{ color: '#2563eb', fontSize: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>PROFESSIONAL SUMMARY</div>
                                          <div style={{ fontSize: '0.5rem', lineHeight: '1.2' }}>Innovative engineering leader with 8+ years building scalable systems...</div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1 pb-1" style={{ color: '#2563eb', fontSize: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>EXPERIENCE</div>
                                          <div className="mb-1">
                                            <div className="d-flex justify-content-between">
                                              <div className="fw-semibold" style={{ fontSize: '0.55rem' }}>Senior Software Engineer</div>
                                              <div className="text-muted" style={{ fontSize: '0.5rem' }}>2021-Present</div>
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.5rem' }}>Google Inc.</div>
                                            <div style={{ fontSize: '0.48rem', lineHeight: '1.1', marginTop: '1px' }}>• Built microservices handling 1M+ daily requests</div>
                                          </div>
                                        </div>
                                        <div className="row">
                                          <div className="col-6">
                                            <div className="fw-bold mb-1" style={{ color: '#2563eb', fontSize: '0.55rem' }}>SKILLS</div>
                                            <div style={{ fontSize: '0.48rem' }}>React, Node.js, Python</div>
                                          </div>
                                          <div className="col-6">
                                            <div className="fw-bold mb-1" style={{ color: '#2563eb', fontSize: '0.55rem' }}>EDUCATION</div>
                                            <div style={{ fontSize: '0.48rem' }}>BS Computer Science</div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <small className="text-muted">Ideal for tech professionals and modern industries</small>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Classic Template */}
                                <div className="col-lg-6 col-md-12">
                                  <div 
                                    className={`card h-100 ${formData.layout.template === 'classic' ? 'border border-3 border-primary shadow-lg' : 'border shadow-sm'}`}
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        layout: {
                                          ...formData.layout,
                                          template: 'classic'
                                        }
                                      });
                                    }}
                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                  >
                                    <div className="card-body p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0 fw-bold text-dark">Classic Professional</h6>
                                        {formData.layout.template === 'classic' && (
                                          <i className="bi bi-check-circle-fill text-primary fs-5"></i>
                                        )}
                                      </div>
                                      <div 
                                        className="template-preview border rounded p-3" 
                                        style={{ 
                                          height: '280px', 
                                          backgroundColor: '#ffffff',
                                          fontSize: '0.65rem',
                                          fontFamily: 'Times New Roman, serif',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {/* Classic Template Preview */}
                                        <div className="text-center mb-3 pb-2" style={{ borderBottom: '1px solid #333' }}>
                                          <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#333' }}>MICHAEL RODRIGUEZ</div>
                                          <div style={{ fontSize: '0.55rem', marginTop: '2px' }}>Attorney at Law</div>
                                          <div style={{ fontSize: '0.5rem', marginTop: '1px' }}>Chicago, IL • (555) 456-7890 • michael.rodriguez@lawfirm.com</div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1" style={{ color: '#333', fontSize: '0.65rem' }}>SUMMARY</div>
                                          <div style={{ fontSize: '0.5rem', lineHeight: '1.3', textAlign: 'justify' }}>
                                            Experienced litigation attorney with 12 years of practice in corporate law...
                                          </div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1" style={{ color: '#333', fontSize: '0.65rem' }}>EXPERIENCE</div>
                                          <div className="mb-1">
                                            <div className="fw-semibold" style={{ fontSize: '0.55rem' }}>Senior Associate</div>
                                            <div className="fst-italic" style={{ fontSize: '0.5rem' }}>Baker & Associates Law Firm</div>
                                            <div className="text-muted" style={{ fontSize: '0.5rem' }}>2018 - Present</div>
                                            <div style={{ fontSize: '0.48rem', lineHeight: '1.2', marginTop: '1px' }}>
                                              • Successfully represented 50+ corporate clients in litigation matters
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mb-2">
                                          <div className="fw-bold mb-1" style={{ color: '#333', fontSize: '0.65rem' }}>EDUCATION</div>
                                          <div style={{ fontSize: '0.5rem' }}>
                                            <div className="fw-semibold">Juris Doctor</div>
                                            <div className="fst-italic">Harvard Law School, Cambridge, MA</div>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="fw-bold mb-1" style={{ color: '#333', fontSize: '0.65rem' }}>BAR ADMISSIONS</div>
                                          <div style={{ fontSize: '0.5rem' }}>Illinois State Bar, Federal District Court</div>
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <small className="text-muted">Perfect for legal, academic, and traditional industries</small>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Minimal Clean Template */}
                                <div className="col-lg-6 col-md-12">
                                  <div 
                                    className={`card h-100 ${formData.layout.template === 'minimal' ? 'border border-3 border-primary shadow-lg' : 'border shadow-sm'}`}
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        layout: {
                                          ...formData.layout,
                                          template: 'minimal'
                                        }
                                      });
                                    }}
                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                  >
                                    <div className="card-body p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0 fw-bold text-dark">Minimal Clean</h6>
                                        {formData.layout.template === 'minimal' && (
                                          <i className="bi bi-check-circle-fill text-primary fs-5"></i>
                                        )}
                                      </div>
                                      <div 
                                        className="template-preview border rounded p-3" 
                                        style={{ 
                                          height: '280px', 
                                          backgroundColor: '#ffffff',
                                          fontSize: '0.65rem',
                                          fontFamily: 'Helvetica, Arial, sans-serif',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {/* Minimal Template Preview */}
                                        <div className="mb-3">
                                          <div className="fw-bold" style={{ fontSize: '1rem', color: '#111827', letterSpacing: '0.5px' }}>Emma Thompson</div>
                                          <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: '3px' }}>UX/UI Designer</div>
                                          <div className="text-muted" style={{ fontSize: '0.52rem', marginTop: '2px' }}>
                                            emma.thompson@design.com • +1 (555) 234-5678 • Seattle, WA
                                          </div>
                                        </div>
                                        
                                        <div className="mb-2">
                                          <div className="mb-1" style={{ color: '#374151', fontSize: '0.6rem', fontWeight: '600' }}>Experience</div>
                                          <div className="mb-1">
                                            <div className="d-flex justify-content-between align-items-start">
                                              <div>
                                                <div style={{ fontSize: '0.55rem', fontWeight: '500' }}>Senior UX Designer</div>
                                                <div className="text-muted" style={{ fontSize: '0.5rem' }}>Microsoft</div>
                                              </div>
                                              <div className="text-muted" style={{ fontSize: '0.48rem' }}>2020 - Present</div>
                                            </div>
                                            <div style={{ fontSize: '0.48rem', lineHeight: '1.2', marginTop: '2px', color: '#6b7280' }}>
                                              Led design system implementation across 15+ products
                                            </div>
                                          </div>
                                        </div>

                                        <div className="mb-2">
                                          <div className="mb-1" style={{ color: '#374151', fontSize: '0.6rem', fontWeight: '600' }}>Education</div>
                                          <div>
                                            <div style={{ fontSize: '0.52rem', fontWeight: '500' }}>Bachelor of Fine Arts</div>
                                            <div className="text-muted" style={{ fontSize: '0.5rem' }}>Rhode Island School of Design</div>
                                          </div>
                                        </div>

                                        <div>
                                          <div className="mb-1" style={{ color: '#374151', fontSize: '0.6rem', fontWeight: '600' }}>Skills</div>
                                          <div style={{ fontSize: '0.5rem', color: '#6b7280' }}>
                                            Figma • Sketch • Prototyping • User Research • Design Systems
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <small className="text-muted">Clean and modern for creative professionals</small>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="col-md-6 mb-4">
                              <label className="form-label fw-semibold">Professional Font</label>
                              <select
                                className="form-select form-select-lg mb-3"
                                name="font"
                                value={formData.layout.font}
                                onChange={(e) => handleChange(e, 'layout')}
                              >
                                <option value="Georgia">Georgia (Executive & Classic)</option>
                                <option value="Inter">Inter (Modern Professional)</option>
                                <option value="Helvetica">Helvetica (Minimal Clean)</option>
                                <option value="Times New Roman">Times New Roman (Traditional)</option>
                                <option value="Calibri">Calibri (Corporate)</option>
                              </select>
                              <div className="form-text">Font will automatically match your selected template for optimal readability</div>
                            </div>
                            
                            <div className="col-md-6 mb-4">
                              <label className="form-label fw-semibold">Accent Color</label>
                              <div className="d-flex align-items-center">
                                <input
                                  type="color"
                                  className="form-control form-control-lg form-control-color me-3"
                                  name="color"
                                  value={formData.layout.color}
                                  onChange={(e) => handleChange(e, 'layout')}
                                  title="Choose accent color"
                                />
                                <div>
                                  <div>
                                    <span className="badge fs-6" style={{ backgroundColor: formData.layout.color, color: 'white', padding: '8px 16px' }}>
                                      Professional
                                    </span>
                                  </div>
                                  <div className="form-text mt-1">
                                    Used for section headings and key highlights
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="alert alert-info border-0 mt-4" style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                              <div>
                                <div className="fw-semibold">Professional Templates</div>
                                <div>Each template is ATS-optimized and designed by career experts to maximize your interview potential.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-between mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setActiveTab('activities')}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Previous
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-lg px-4" 
                          onClick={togglePreview}
                        >
                          <i className="bi bi-eye me-2"></i> Preview My Resume
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumeBuilder;