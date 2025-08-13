import express from 'express';
import auth from '../middleware/auth.js';
import Resume from '../models/Resume.js';
import puppeteer from 'puppeteer';

const router = express.Router();

// Create or update resume
router.post('/create', auth, async (req, res) => {
  try {
    const { title, content, keywords, atsScore, resumeId } = req.body;

    // Validate content is valid JSON
    let parsedContent;
    try {
      parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      // Ensure it's a valid resume object
      if (!parsedContent.name && !parsedContent.email) {
        throw new Error('Invalid resume data - missing required fields');
      }
    } catch (parseError) {
      return res.status(400).json({ msg: 'Invalid resume content format' });
    }

    // Convert back to string for storage
    const validContent = JSON.stringify(parsedContent);

    let resume;
    
    if (resumeId) {
      // Update existing resume
      resume = await Resume.findById(resumeId);
      
      if (!resume) {
        return res.status(404).json({ msg: 'Resume not found' });
      }
      
      // Check user ownership
      if (resume.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      // Update resume
      resume.title = title || resume.title;
      resume.content = validContent;
      resume.keywords = keywords || [];
      resume.atsScore = atsScore || 0;
      resume.updatedAt = Date.now();
      
      await resume.save();
    } else {
      // Create new resume
      resume = new Resume({
        user: req.user.id,
        title: title || `Resume - ${new Date().toLocaleDateString()}`,
        content: validContent,
        keywords: keywords || [],
        atsScore: atsScore || 0
      });

      await resume.save();
    }
    
    res.json(resume);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Analyze resume
router.post('/analyze', auth, async (req, res) => {
  try {
    const { content, jobDescription } = req.body;
    
    // Simple keyword extraction (could be replaced with AI-based analysis)
    const jobWords = jobDescription ? 
      jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3) : [];
    
    const resumeWords = content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    // Find matching keywords
    const keywords = [...new Set(resumeWords.filter(word => 
      jobWords.includes(word) || jobWords.some(jw => word.includes(jw))
    ))];
    
    // Calculate ATS score (simple algorithm)
    const uniqueJobWords = [...new Set(jobWords)];
    const matchCount = keywords.length;
    const atsScore = uniqueJobWords.length > 0 ? 
      Math.min(Math.round((matchCount / uniqueJobWords.length) * 100), 100) : 70;
    
    // Save the resume
    let resume = new Resume({
      user: req.user.id,
      content,
      keywords,
      atsScore
    });

    await resume.save();
    
    res.json({
      atsScore,
      keywords,
      recommendations: [
        'Ensure your resume uses keywords from the job description',
        'Use a clean, ATS-friendly format',
        'Include relevant skills and experiences'
      ]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all resumes for a user
router.get('/history', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id }).sort({ date: -1 });
    
    // Filter out corrupted resumes
    const validResumes = resumes.filter(resume => {
      try {
        JSON.parse(resume.content);
        return true;
      } catch (parseError) {
        console.error(`Corrupted resume found: ${resume._id}`, parseError);
        return false;
      }
    });
    
    res.json(validResumes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get single resume
router.get('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    // Check if resume exists
    if (!resume) {
      return res.status(404).json({ msg: 'Resume not found' });
    }
    
    // Check user
    if (resume.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(resume);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update resume
router.put('/:id', auth, async (req, res) => {
  try {
    let resume = await Resume.findById(req.params.id);
    
    // Check if resume exists
    if (!resume) {
      return res.status(404).json({ msg: 'Resume not found' });
    }
    
    // Check user
    if (resume.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    resume = await Resume.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body },
      { new: true }
    );
    
    res.json(resume);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete resume
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    // Check if resume exists
    if (!resume) {
      return res.status(404).json({ msg: 'Resume not found' });
    }
    
    // Check user
    if (resume.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    await Resume.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Resume deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Clean up corrupted resumes (user utility)
router.post('/cleanup', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id });
    let deletedCount = 0;
    
    for (const resume of resumes) {
      try {
        JSON.parse(resume.content);
      } catch (parseError) {
        console.log(`Deleting corrupted resume: ${resume._id}`);
        await Resume.findByIdAndDelete(resume._id);
        deletedCount++;
      }
    }
    
    res.json({ msg: `Cleaned up ${deletedCount} corrupted resumes` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Generate PDF
router.post('/generate-pdf', auth, async (req, res) => {
  try {
    const { resumeData } = req.body;
    
    if (!resumeData) {
      return res.status(400).json({ msg: 'Resume data is required' });
    }

    // Parse resume data
    const formData = typeof resumeData === 'string' ? JSON.parse(resumeData) : resumeData;
    const primaryColor = formData.layout?.color || '#0d6efd';
    
    // Template styles
    const templates = {
      modern: {
        sectionTitle: `border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px; margin-bottom: 16px; color: ${primaryColor}; font-weight: 600;`,
        name: `font-size: 2.5rem; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px;`,
        headerBg: 'transparent'
      },
      classic: {
        sectionTitle: 'border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 16px; font-family: serif; font-weight: 600;',
        name: 'font-size: 2.2rem; font-weight: 700; font-family: serif; margin-bottom: 8px;',
        headerBg: 'transparent'
      },
      minimal: {
        sectionTitle: `margin-bottom: 16px; color: ${primaryColor}; text-transform: uppercase; font-size: 1rem; letter-spacing: 2px; font-weight: 600;`,
        name: 'font-size: 2rem; font-weight: 300; color: #333; margin-bottom: 8px;',
        headerBg: 'transparent'
      },
      professional: {
        sectionTitle: `background-color: ${primaryColor}; color: white; padding: 6px 12px; margin-bottom: 16px; font-weight: 600;`,
        name: 'font-size: 2.2rem; font-weight: 600; color: #333; margin-bottom: 8px;',
        headerBg: primaryColor,
        headerTextColor: 'white',
        headerPadding: '20px'
      },
      executive: {
        sectionTitle: `border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px; margin-bottom: 16px; color: ${primaryColor}; font-weight: 600; letter-spacing: 0.5px;`,
        name: `font-size: 2.5rem; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px; letter-spacing: 1px;`,
        headerBg: 'transparent'
      }
    };
    
    const selectedTemplate = templates[formData.layout?.template] || templates.modern;
    
    // Generate HTML content that matches the preview exactly
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: ${formData.layout?.font || 'Inter'}, sans-serif;
                line-height: 1.4;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 50px;
                font-size: 14px;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                background: ${selectedTemplate.headerBg};
                color: ${selectedTemplate.headerTextColor || '#333'};
                padding: ${selectedTemplate.headerPadding || '0'};
            }
            .name {
                ${selectedTemplate.name}
            }
            .contact-info {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 20px;
                font-size: 13px;
                margin-top: 8px;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                ${selectedTemplate.sectionTitle}
            }
            .section-content {
                margin-top: 12px;
            }
            .experience-item, .education-item, .project-item, .activity-item {
                margin-bottom: 16px;
            }
            .item-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 4px;
            }
            .item-title {
                color: ${primaryColor};
                font-weight: 600;
                font-size: 15px;
            }
            .item-company {
                font-weight: 500;
                margin-bottom: 2px;
            }
            .item-date {
                color: #666;
                font-size: 12px;
            }
            .item-description {
                margin-top: 4px;
                line-height: 1.4;
            }
            .skills-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .skill-badge {
                background-color: ${primaryColor}20;
                color: ${primaryColor};
                padding: 4px 10px;
                border-radius: 4px;
                font-weight: 500;
                font-size: 12px;
            }
            .summary {
                text-align: justify;
                line-height: 1.5;
            }
            @page {
                margin: 0.5in;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="name">${formData.name || 'Your Name'}</h1>
            <div class="contact-info">
                ${formData.email ? `<span>${formData.email}</span>` : ''}
                ${formData.phone ? `<span>${formData.phone}</span>` : ''}
                ${formData.location ? `<span>${formData.location}</span>` : ''}
            </div>
        </div>
        
        ${formData.summary ? `
        <div class="section">
            <h4 class="section-title">Professional Summary</h4>
            <div class="section-content">
                <p class="summary">${formData.summary}</p>
            </div>
        </div>
        ` : ''}
        
        ${formData.experience && formData.experience.some(exp => exp.company) ? `
        <div class="section">
            <h4 class="section-title">Work Experience</h4>
            <div class="section-content">
                ${formData.experience.map(exp => exp.company ? `
                <div class="experience-item">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${exp.position}</div>
                            <div class="item-company">${exp.company}</div>
                        </div>
                        <div class="item-date">${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}</div>
                    </div>
                    ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}
                </div>
                ` : '').join('')}
            </div>
        </div>
        ` : ''}
        
        ${formData.education && formData.education.some(edu => edu.school) ? `
        <div class="section">
            <h4 class="section-title">Education</h4>
            <div class="section-content">
                ${formData.education.map(edu => edu.school ? `
                <div class="education-item">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</div>
                            <div class="item-company">${edu.school}</div>
                        </div>
                        <div class="item-date">${edu.startDate} - ${edu.endDate}</div>
                    </div>
                    ${edu.description ? `<div class="item-description">${edu.description}</div>` : ''}
                </div>
                ` : '').join('')}
            </div>
        </div>
        ` : ''}
        
        ${formData.skills && formData.skills.some(skill => skill) ? `
        <div class="section">
            <h4 class="section-title">Skills</h4>
            <div class="section-content">
                <div class="skills-container">
                    ${formData.skills.filter(skill => skill).map(skill => `
                    <span class="skill-badge">${skill}</span>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}
        
        ${formData.projects && formData.projects.some(proj => proj.title) ? `
        <div class="section">
            <h4 class="section-title">Projects</h4>
            <div class="section-content">
                ${formData.projects.map(proj => proj.title ? `
                <div class="project-item">
                    <div class="item-title">${proj.title}</div>
                    ${proj.technologies ? `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">Technologies: ${proj.technologies}</div>` : ''}
                    ${proj.description ? `<div class="item-description">${proj.description}</div>` : ''}
                    ${proj.link ? `<div style="margin-top: 4px;"><a href="${proj.link}" style="color: ${primaryColor}; text-decoration: none; font-size: 12px;">${proj.link}</a></div>` : ''}
                </div>
                ` : '').join('')}
            </div>
        </div>
        ` : ''}
        
        ${formData.activities && formData.activities.some(activity => activity.title) ? `
        <div class="section">
            <h4 class="section-title">Extra-Curricular Activities</h4>
            <div class="section-content">
                ${formData.activities.map(activity => activity.title ? `
                <div class="activity-item">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${activity.title}</div>
                            ${activity.organization ? `<div class="item-company">${activity.organization}</div>` : ''}
                        </div>
                        ${(activity.startDate || activity.endDate) ? `<div class="item-date">${activity.startDate} - ${activity.endDate}</div>` : ''}
                    </div>
                    ${activity.description ? `<div class="item-description">${activity.description}</div>` : ''}
                </div>
                ` : '').join('')}
            </div>
        </div>
        ` : ''}
        
    </body>
    </html>
    `;

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0' 
    });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });
    
    await browser.close();
    
    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(formData.name || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(pdf, 'binary');
    
  } catch (err) {
    console.error('PDF Generation Error:', err.message);
    res.status(500).json({ msg: 'Failed to generate PDF', error: err.message });
  }
});

export default router;