import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  FaFileAlt, FaRobot, FaSearch, FaChartPie, FaKeyboard, 
  FaLaptopCode, FaPuzzlePiece, FaUserTie, FaRocket, 
  FaTrophy, FaChartLine, FaShieldAlt, FaRegLightbulb
} from 'react-icons/fa';
import './Home.css';

function Home() {
  // Hero section animation variants
  const heroVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.8,
        when: "beforeChildren",
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Feature card ref for animations
  const [featureRef1, featureInView1] = useInView({ 
    triggerOnce: true,
    threshold: 0.2
  });
  
  const [featureRef2, featureInView2] = useInView({ 
    triggerOnce: true,
    threshold: 0.2
  });
  
  const [featureRef3, featureInView3] = useInView({ 
    triggerOnce: true,
    threshold: 0.2
  });

  return (
    <div className="home-container">
      {/* Hero Section */}
      {/* <motion.section 
        className="hero-section"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
      >
        <div className="container">
          <div className="row align-items-center">
            <motion.div className="col-lg-6 hero-content" variants={itemVariant}>
              <motion.span className="pre-title" variants={itemVariant}>AI-POWERED RESUME PLATFORM</motion.span>
              <motion.h1 className="hero-title" variants={itemVariant}>
                Land Your Dream Job with an <span className="text-highlight">ATS-Optimized</span> Resume
              </motion.h1>
              <motion.p className="hero-description" variants={itemVariant}>
                Our AI-powered tools analyze and enhance your resume to ensure it passes through 
                Applicant Tracking Systems and stands out to recruiters. Increase your interview chances by up to 70%.
              </motion.p>
              <motion.div className="hero-buttons" variants={itemVariant}>
                <Link to="/builder" className="btn btn-primary btn-lg me-3">
                  <FaFileAlt className="btn-icon" /> Build Resume
                </Link>
                <Link to="/ats" className="btn btn-outline-light btn-lg">
                  <FaSearch className="btn-icon" /> Check ATS Score
                </Link>
              </motion.div>
              <motion.div className="hero-stats" variants={itemVariant}>
                <div className="hero-stat">
                  <span className="stat-number">90%</span>
                  <span className="stat-text">Increase in Interviews</span>
                </div>
                <div className="hero-stat">
                  <span className="stat-number">10K+</span>
                  <span className="stat-text">Resumes Created</span>
                </div>
                <div className="hero-stat">
                  <span className="stat-number">99%</span>
                  <span className="stat-text">ATS Success Rate</span>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="col-lg-6 hero-image-container"
              variants={itemVariant}
            >
              <div className="hero-image">
                <div className="floating-resume">
                  <FaFileAlt className="resume-icon" />
                  <div className="resume-lines">
                    <div className="resume-line"></div>
                    <div className="resume-line"></div>
                    <div className="resume-line"></div>
                  </div>
                </div>
                <div className="ai-circle">
                  <FaRobot className="ai-icon" />
                </div>
                <div className="floating-keywords">
                  <div className="keyword">JavaScript</div>
                  <div className="keyword">Project Management</div>
                  <div className="keyword">Leadership</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="hero-shape-bottom">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fillOpacity="1" d="M0,128L80,144C160,160,320,192,480,186.7C640,181,800,139,960,144C1120,149,1280,203,1360,229.3L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
        </div>
      </motion.section> */}
      <motion.section
        className="hero-section-full-bleed"  // Changed class name
      initial="hidden"
      animate="visible"
      variants={heroVariants}
    >
      <div className="hero-background"></div> {/* New background div */}
  <div className="hero-content-wrapper">
    <div className="hero-inner-container">
      <div className="row align-items-center">
            <motion.div className="col-lg-6 hero-content py-8 md:py-12" variants={itemVariant}>
              <motion.span className="pre-title d-block mb-3 text-primary fw-bold" variants={itemVariant}>
                AI-POWERED RESUME PLATFORM
              </motion.span>
              <motion.h1 className="hero-title mb-4 display-4 fw-bold" variants={itemVariant}>
                Land Your Dream Job with an <span className="text-highlight">ATS-Optimized</span> Resume
              </motion.h1>
              <motion.p className="hero-description mb-4 lead" variants={itemVariant}>
                Our AI-powered tools analyze and enhance your resume to ensure it passes through
                Applicant Tracking Systems and stands out to recruiters. Increase your interview chances by up to 70%.
              </motion.p>
              <motion.div className="hero-buttons mb-5" variants={itemVariant}>
                <Link to="/builder" className="btn btn-primary btn-lg me-3 mb-3 mb-md-0">
                  <FaFileAlt className="btn-icon me-2" /> Build Resume
                </Link>
                <Link to="/ats" className="btn btn-outline-light btn-lg">
                  <FaSearch className="btn-icon me-2" /> Check ATS Score
                </Link>
              </motion.div>
              <motion.div className="hero-stats d-flex flex-wrap gap-4" variants={itemVariant}>
                <div className="hero-stat text-center">
                  <span className="stat-number d-block fw-bold fs-3">90%</span>
                  <span className="stat-text">Increase in Interviews</span>
                </div>
                <div className="hero-stat text-center">
                  <span className="stat-number d-block fw-bold fs-3">10K+</span>
                  <span className="stat-text">Resumes Created</span>
                </div>
                <div className="hero-stat text-center">
                  <span className="stat-number d-block fw-bold fs-3">99%</span>
                  <span className="stat-text">ATS Success Rate</span>
                </div>
              </motion.div>
            </motion.div>
            <motion.div
              className="col-lg-6 hero-image-container position-relative py-8"
              variants={itemVariant}
            >
              <div className="hero-image position-relative">
                <div className="floating-resume position-absolute shadow-lg">
                  <FaFileAlt className="resume-icon mb-3" />
                  <div className="resume-lines">
                    <div className="resume-line mb-2"></div>
                    <div className="resume-line mb-2"></div>
                    <div className="resume-line"></div>
                  </div>
                </div>
                <div className="ai-circle position-absolute rounded-circle shadow-lg d-flex align-items-center justify-content-center">
                  <FaRobot className="ai-icon" />
                </div>
                <div className="floating-keywords position-absolute">
                  <div className="keyword mb-2 py-1 px-3 rounded shadow-sm">JavaScript</div>
                  <div className="keyword mb-2 py-1 px-3 rounded shadow-sm">Project Management</div>
                  <div className="keyword py-1 px-3 rounded shadow-sm">Leadership</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="hero-shape-bottom w-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-100">
          <path fill="#ffffff" fillOpacity="1" d="M0,128L80,144C160,160,320,192,480,186.7C640,181,800,139,960,144C1120,149,1280,203,1360,229.3L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>
    </motion.section>
      {/* Services Section */}
      <section className="services-section" id="services">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">OUR SERVICES</span>
            <h2 className="section-title">AI-Powered Resume Tools</h2>
            <p className="section-description">
              Everything you need to create, analyze, and optimize your resume for success
            </p>
          </div>
          
          <div className="row g-4">
            <div className="col-lg-4 col-md-6" ref={featureRef1}>
              <motion.div 
                className="service-card"
                initial={{ opacity: 0, y: 20 }}
                animate={featureInView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="service-icon">
                  <FaChartPie />
                </div>
                <h3>ATS Optimization</h3>
                <p>
                  Ensure your resume passes through Applicant Tracking Systems with our advanced analysis tools.
                  Get detailed feedback and improvements.
                </p>
                <Link to="/ats" className="service-link">
                  Check ATS Score <span className="arrow">→</span>
                </Link>
              </motion.div>
            </div>
            
            <div className="col-lg-4 col-md-6" ref={featureRef2}>
              <motion.div 
                className="service-card"
                initial={{ opacity: 0, y: 20 }}
                animate={featureInView2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="service-icon">
                  <FaKeyboard />
                </div>
                <h3>Keyword Analysis</h3>
                <p>
                  Identify and optimize keywords in your resume to match job descriptions perfectly.
                  Increase your match rate with targeted positions.
                </p>
                <Link to="/keywords" className="service-link">
                  Analyze Keywords <span className="arrow">→</span>
                </Link>
              </motion.div>
            </div>
            
            <div className="col-lg-4 col-md-6" ref={featureRef3}>
              <motion.div 
                className="service-card"
                initial={{ opacity: 0, y: 20 }}
                animate={featureInView3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="service-icon">
                  <FaFileAlt />
                </div>
                <h3>Resume Builder</h3>
                <p>
                  Choose from professionally designed templates optimized for your industry.
                  Create beautiful, ATS-friendly resumes in minutes.
                </p>
                <Link to="/builder" className="service-link">
                  Build Resume <span className="arrow">→</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">SIMPLE PROCESS</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-description">
              Three simple steps to create an ATS-optimized resume that gets you noticed
            </p>
          </div>
          
          <div className="steps-container">
            <div className="step-line"></div>
            
            <div className="row">
              <div className="col-lg-4">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-icon">
                    <FaFileAlt />
                  </div>
                  <h3>Create or Upload</h3>
                  <p>Start from scratch or upload your existing resume to our platform</p>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-icon">
                    <FaRobot />
                  </div>
                  <h3>AI Analysis</h3>
                  <p>Our AI analyzes your resume against job descriptions and ATS algorithms</p>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-icon">
                    <FaRocket />
                  </div>
                  <h3>Optimize & Download</h3>
                  <p>Apply the suggested improvements and download your optimized resume</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">POWERFUL FEATURES</span>
            <h2 className="section-title">Why Choose Our Platform</h2>
            <p className="section-description">
              Advanced tools designed to give you an edge in the job market
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaRobot />
              </div>
              <h3>AI-Powered Analysis</h3>
              <p>Our artificial intelligence scans and identifies improvement opportunities</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaLaptopCode />
              </div>
              <h3>ATS Compatibility</h3>
              <p>Ensure your resume passes through any Applicant Tracking System</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaPuzzlePiece />
              </div>
              <h3>Industry Templates</h3>
              <p>Choose from templates optimized for specific industries and roles</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaUserTie />
              </div>
              <h3>Job-Specific Tips</h3>
              <p>Get personalized advice based on your target position</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3>Match Scoring</h3>
              <p>See how well your resume matches specific job descriptions</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3>Privacy Protection</h3>
              <p>Your data is secure and never shared with third parties</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" id="testimonials">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">SUCCESS STORIES</span>
            <h2 className="section-title">What Our Users Say</h2>
            <p className="section-description">
              Hear from professionals who landed their dream jobs using our platform
            </p>
          </div>
          
          <div className="row testimonial-cards">
            <div className="col-lg-4 col-md-6">
              <div className="testimonial-card">
                <div className="testimonial-rating">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="testimonial-text">
                  "After struggling with my resume for months, I used this tool and landed interviews at 3 top tech companies within weeks."
                </p>
                <div className="testimonial-author">
                  <div className="author-avatar">JD</div>
                  <div className="author-info">
                    <h5>Vinay Dubey</h5>
                    <span>Software Engineer at Google</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="testimonial-card">
                <div className="testimonial-rating">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="testimonial-text">
                  "The keyword analysis feature helped me understand what recruiters were looking for. My interview rate doubled immediately."
                </p>
                <div className="testimonial-author">
                  <div className="author-avatar">SJ</div>
                  <div className="author-info">
                    <h5>Sarah Johnson</h5>
                    <span>Marketing Manager at Netflix</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="testimonial-card">
                <div className="testimonial-rating">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="testimonial-text">
                  "As a career changer, I needed help showcasing transferable skills. This platform made it simple and effective."
                </p>
                <div className="testimonial-author">
                  <div className="author-avatar">RM</div>
                  <div className="author-info">
                    <h5>Robert Miller</h5>
                    <span>Project Manager at Amazon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <div className="row align-items-center">
              <div className="col-lg-8">
                <h2>Ready to Land Your Dream Job?</h2>
                <p>Create your ATS-optimized resume today and increase your chances of getting hired.</p>
              </div>
              <div className="col-lg-4 text-lg-end">
                <Link to="/register" className="btn btn-primary btn-lg">
                  <FaRegLightbulb className="btn-icon" /> Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;