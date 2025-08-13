import express from 'express';
import auth from '../middleware/auth.js';
import Resume from '../models/Resume.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Create or update resume
router.post('/save', auth, async (req, res) => {
  try {
    const { content, keywords, atsScore, title } = req.body;

    // Check if user already has a resume
    let resume = await Resume.findOne({ user: req.user.id });

    if (resume) {
      // Update existing resume
      resume.content = content;
      resume.keywords = keywords || [];
      resume.atsScore = atsScore || 0;
      resume.title = title || 'My Resume';
      resume.updatedAt = new Date();
      await resume.save();
    } else {
      // Create new resume
      resume = new Resume({
        user: req.user.id,
        content,
        keywords: keywords || [],
        atsScore: atsScore || 0,
        title: title || 'My Resume'
      });
      await resume.save();
    }

    res.json({
      success: true,
      message: 'Resume saved successfully!',
      resume: {
        id: resume._id,
        title: resume.title,
        content: resume.content,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Get user's resume
router.get('/my-resume', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({ user: req.user.id });
    
    if (!resume) {
      return res.json({ resume: null });
    }
    
    res.json({ 
      resume: {
        id: resume._id,
        content: resume.content,
        title: resume.title,
        keywords: resume.keywords,
        atsScore: resume.atsScore,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Download resume as PDF
router.post('/download-pdf', auth, async (req, res) => {
  try {
    const { resumeData } = req.body;
    const formData = JSON.parse(resumeData);
    const template = formData.layout.template || 'modern';
    const primaryColor = formData.layout.color || '#0d6efd';
    
    // Create PDF document with proper margins
    const doc = new PDFDocument({ 
      margin: 72, // 1 inch margins
      size: 'A4'
    });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${formData.name || 'resume'}.pdf"`);
    
    // Pipe the PDF to the response
    doc.pipe(res);

    // Helper function to convert hex to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : {r: 13, g: 110, b: 253};
    };

    // Single-page constraint helpers
    const PAGE_HEIGHT = 792; // US Letter height in points
    const MAX_CONTENT_HEIGHT = PAGE_HEIGHT - 144; // Leave margins top/bottom
    
    function calculateContentHeight(formData) {
      let estimatedHeight = 0;
      
      // Header (name + contact)
      estimatedHeight += 100;
      
      // Summary
      if (formData.summary) {
        const summaryLines = Math.ceil(formData.summary.length / 90); // ~90 chars per line
        estimatedHeight += 40 + (summaryLines * 14); // Title + content
      }
      
      // Experience
      if (formData.experience?.length > 0) {
        estimatedHeight += 40; // Section title
        formData.experience.forEach(exp => {
          estimatedHeight += 35; // Title + company line
          if (exp.description) {
            const descLines = Math.ceil(exp.description.length / 80);
            estimatedHeight += Math.min(descLines * 12, 48); // Max 4 lines per job
          }
          estimatedHeight += 15; // Spacing
        });
      }
      
      // Education
      if (formData.education?.length > 0) {
        estimatedHeight += 40; // Section title
        estimatedHeight += formData.education.length * 30; // Compact education entries
      }
      
      // Skills
      if (formData.skills?.length > 0) {
        estimatedHeight += 40; // Section title
        const skillLines = Math.ceil(formData.skills.length / 8); // ~8 skills per line
        estimatedHeight += skillLines * 25;
      }
      
      // Projects
      if (formData.projects?.length > 0) {
        estimatedHeight += 40; // Section title
        formData.projects.forEach(proj => {
          estimatedHeight += 25; // Title line
          if (proj.description) {
            const projLines = Math.ceil(proj.description.length / 80);
            estimatedHeight += Math.min(projLines * 12, 36); // Max 3 lines per project
          }
          estimatedHeight += 10; // Spacing
        });
      }
      
      // Extracurricular
      if (formData.extracurricular?.length > 0) {
        estimatedHeight += 40; // Section title
        formData.extracurricular.forEach(activity => {
          estimatedHeight += 25; // Title line
          if (activity.description) {
            const actLines = Math.ceil(activity.description.length / 80);
            estimatedHeight += Math.min(actLines * 12, 24); // Max 2 lines per activity
          }
          estimatedHeight += 8; // Spacing
        });
      }
      
      return estimatedHeight;
    }
    
    function truncateText(text, maxLength) {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    }
    
    function getOptimizedSections(formData, availableHeight) {
      const sections = [];
      let usedHeight = 100; // Header space
      
      // Always include summary if exists
      if (formData.summary) {
        sections.push('summary');
        usedHeight += 60;
      }
      
      // Prioritize experience
      if (formData.experience?.length > 0) {
        sections.push('experience');
        usedHeight += 60 + (Math.min(formData.experience.length, 3) * 50); // Max 3 jobs
      }
      
      // Add education
      if (formData.education?.length > 0 && usedHeight < availableHeight - 80) {
        sections.push('education');
        usedHeight += 60;
      }
      
      // Add skills
      if (formData.skills?.length > 0 && usedHeight < availableHeight - 60) {
        sections.push('skills');
        usedHeight += 50;
      }
      
      // Add projects if space allows
      if (formData.projects?.length > 0 && usedHeight < availableHeight - 80) {
        sections.push('projects');
        usedHeight += Math.min(formData.projects.length, 2) * 40; // Max 2 projects
      }
      
      // Add extracurricular if space allows
      if (formData.extracurricular?.length > 0 && usedHeight < availableHeight - 60) {
        sections.push('extracurricular');
      }
      
      return sections;
    }

    const color = hexToRgb(primaryColor);

    // Template-specific styling
    const generateExecutiveTemplate = () => {
      // Single-page optimized Executive template
      let currentY = margin;
      const maxY = PAGE_HEIGHT - margin;
      const sectionsToInclude = getOptimizedSections(formData, MAX_CONTENT_HEIGHT);

      // Executive header - distinguished but compact
      doc.fontSize(24)
         .fillColor('#1a365d')
         .font('Times-Bold')
         .text(formData.name || 'Your Name', 72, currentY, { 
           align: 'center', 
           characterSpacing: 1 
         });
      
      currentY += 35;
      
      // Professional line under name
      doc.moveTo(72, currentY)
         .lineTo(doc.page.width - 72, currentY)
         .lineWidth(2)
         .strokeColor('#1a365d')
         .stroke();

      currentY += 20;

      // Contact info
      const contactInfo = [];
      if (formData.email) contactInfo.push(formData.email);
      if (formData.phone) contactInfo.push(formData.phone);
      if (formData.location) contactInfo.push(formData.location);
      
      if (contactInfo.length > 0) {
        doc.fontSize(10)
           .fillColor('#666666')
           .font('Times-Roman')
           .text(contactInfo.join(' • '), 72, currentY, { 
             align: 'center',
             width: doc.page.width - 144
           });
        currentY += 25;
      }

      // Executive Summary
      if (sectionsToInclude.includes('summary') && formData.summary) {
        doc.fontSize(13)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('EXECUTIVE SUMMARY', 72, currentY, { 
             characterSpacing: 0.5 
           });
        currentY += 18;
        
        const maxSummaryLength = 280;
        const summaryText = truncateText(formData.summary, maxSummaryLength);
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(summaryText, 72, currentY, {
             width: doc.page.width - 144,
             align: 'justify',
             lineGap: 2
           });
        currentY = doc.y + 20;
      }

      // Professional Experience
      if (sectionsToInclude.includes('experience') && formData.experience?.length > 0) {
        doc.fontSize(13)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('PROFESSIONAL EXPERIENCE', 72, currentY, { 
             characterSpacing: 0.5 
           });
        currentY += 18;
        
        const experienceToShow = formData.experience.slice(0, 3);
        
        experienceToShow.forEach(exp => {
          if (exp.company && currentY < maxY - 35) {
            // Position and dates
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(exp.position || 'Position', 72, currentY);
            
            if (exp.startDate || exp.endDate) {
              const dateText = `${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`;
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(dateText, 72, currentY, { 
                   width: doc.page.width - 144, 
                   align: 'right' 
                 });
            }
            
            currentY += 14;
            
            // Company
            doc.fontSize(10)
               .fillColor('#1a365d')
               .font('Times-Bold')
               .text(exp.company, 72, currentY);
            currentY += 12;
            
            // Description
            if (exp.description && currentY < maxY - 20) {
              const maxDescLength = 110;
              const descText = truncateText(exp.description, maxDescLength);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${descText}`, 82, currentY, {
                   width: doc.page.width - 154,
                   lineGap: 1
                 });
              currentY = doc.y + 8;
            }
            
            currentY += 10;
          }
        });
      }

      // Education
      if (sectionsToInclude.includes('education') && formData.education?.length > 0 && currentY < maxY - 50) {
        doc.fontSize(13)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('EDUCATION', 72, currentY, { 
             characterSpacing: 0.5 
           });
        currentY += 18;
        
        formData.education.slice(0, 2).forEach(edu => {
          if (edu.school && currentY < maxY - 20) {
            const degreeText = `${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`;
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(degreeText, 72, currentY);
            
            if (edu.startDate || edu.endDate) {
              const dateText = `${edu.startDate || ''} - ${edu.endDate || ''}`;
              doc.fontSize(9)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(dateText, 72, currentY, { 
                   width: doc.page.width - 144, 
                   align: 'right' 
                 });
            }
            
            currentY += 12;
            
            doc.fontSize(9)
               .fillColor('#666666')
               .font('Times-Italic')
               .text(edu.school, 72, currentY);
            currentY += 15;
          }
        });
      }

      // Skills
      if (sectionsToInclude.includes('skills') && formData.skills?.length > 0 && currentY < maxY - 35) {
        doc.fontSize(13)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('CORE COMPETENCIES', 72, currentY, { 
             characterSpacing: 0.5 
           });
        currentY += 18;
        
        const skills = formData.skills.filter(skill => skill.trim()).slice(0, 8);
        const skillsText = skills.join('; ');
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(skillsText, 72, currentY, {
             width: doc.page.width - 144,
             lineGap: 2
           });
        currentY = doc.y + 15;
      }

      // Projects/Achievements
      if (sectionsToInclude.includes('projects') && formData.projects?.length > 0 && currentY < maxY - 40) {
        doc.fontSize(13)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('KEY ACHIEVEMENTS', 72, currentY, { 
             characterSpacing: 0.5 
           });
        currentY += 18;
        
        formData.projects.slice(0, 2).forEach(proj => {
          if (proj.title && currentY < maxY - 15) {
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(proj.title, 72, currentY);
            currentY += 10;
            
            if (proj.description && currentY < maxY - 10) {
              const maxProjDesc = 70;
              const projDesc = truncateText(proj.description, maxProjDesc);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${projDesc}`, 82, currentY, {
                   width: doc.page.width - 154
                 });
              currentY = doc.y + 8;
            }
          }
        });
      }
    };

      // Professional Summary
      if (formData.summary) {
        doc.fontSize(14)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('EXECUTIVE SUMMARY', 72, currentY, { characterSpacing: 1 });
        
        currentY += 20;
        doc.fontSize(11)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(formData.summary, 72, currentY, { 
             width: doc.page.width - 144,
             align: 'justify',
             lineGap: 3
           });
        currentY = doc.y + 20;
      }

      // Professional Experience
      if (formData.experience && formData.experience.some(exp => exp.company)) {
        // Check if we need a new page
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(14)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('PROFESSIONAL EXPERIENCE', 72, currentY, { characterSpacing: 1 });
        
        currentY += 20;
        
        formData.experience.forEach(exp => {
          if (exp.company || exp.position) {
            // Check if we need a new page for this experience entry
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = 72;
            }

            // Position and dates
            doc.fontSize(12)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(exp.position || 'Position', 72, currentY);
            
            if (exp.startDate || exp.endDate) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(`${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`, 
                       doc.page.width - 200, currentY, { align: 'right' });
            }
            
            currentY += 15;
            
            // Company
            if (exp.company) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(exp.company, 72, currentY);
              currentY += 15;
            }
            
            // Description
            if (exp.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${exp.description}`, 92, currentY, {
                   width: doc.page.width - 164,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 5;
          }
        });
        currentY += 10;
      }

      // Education
      if (formData.education && formData.education.some(edu => edu.school)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(14)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('EDUCATION', 72, currentY, { characterSpacing: 1 });
        
        currentY += 20;
        
        formData.education.forEach(edu => {
          if (edu.school || edu.degree) {
            doc.fontSize(12)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(`${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`, 72, currentY);
            
            currentY += 15;
            
            if (edu.school) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(edu.school, 72, currentY);
              currentY += 12;
            }
            
            if (edu.startDate || edu.endDate) {
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(`${edu.startDate || ''} - ${edu.endDate || ''}`, 72, currentY);
              currentY += 15;
            }

            if (edu.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(edu.description, 72, currentY, {
                   width: doc.page.width - 144,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 5;
          }
        });
        currentY += 10;
      }

      // Skills
      if (formData.skills && formData.skills.some(skill => skill.trim())) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(14)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('CORE COMPETENCIES', 72, currentY, { characterSpacing: 1 });
        
        currentY += 20;
        
        const skillsText = formData.skills
          .filter(skill => skill.trim())
          .join(' • ');
        
        doc.fontSize(11)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(skillsText, 72, currentY, {
             width: doc.page.width - 144,
             lineGap: 3
           });
        currentY = doc.y + 20;
      }

      // Projects
      if (formData.projects && formData.projects.some(proj => proj.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(14)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('KEY INITIATIVES & PROJECTS', 72, currentY, { characterSpacing: 1 });
        
        currentY += 20;
        
        formData.projects.forEach(proj => {
          if (proj.title) {
            // Check if we need a new page for this project entry
            if (currentY > doc.page.height - 80) {
              doc.addPage();
              currentY = 72;
            }

            doc.fontSize(12)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(proj.title, 72, currentY);
            
            currentY += 15;
            
            if (proj.technologies) {
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(`Technologies: ${proj.technologies}`, 72, currentY);
              currentY += 12;
            }
            
            if (proj.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${proj.description}`, 92, currentY, {
                   width: doc.page.width - 164,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }

            if (proj.link) {
              doc.fontSize(10)
                 .fillColor('#1a365d')
                 .font('Times-Roman')
                 .text(`Link: ${proj.link}`, 72, currentY);
              currentY += 12;
            }
            
            currentY += 8;
          }
        });
        currentY += 10;
      }

      // Extra-curricular Activities
      if (formData.extracurricular && formData.extracurricular.some(activity => activity.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(14)
           .fillColor('#1a365d')
           .font('Times-Bold')
           .text('LEADERSHIP & COMMUNITY INVOLVEMENT', 72, currentY, { characterSpacing: 1 });
        
        currentY += 20;
        
        formData.extracurricular.forEach(activity => {
          if (activity.title) {
            // Check if we need a new page for this activity entry
            if (currentY > doc.page.height - 80) {
              doc.addPage();
              currentY = 72;
            }

            // Activity title and dates
            doc.fontSize(12)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(activity.title, 72, currentY);
            
            if (activity.startDate || activity.endDate) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(`${activity.startDate || ''} - ${activity.current ? 'Present' : activity.endDate || ''}`, 
                       doc.page.width - 200, currentY, { align: 'right' });
            }
            
            currentY += 15;
            
            // Organization
            if (activity.organization) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(activity.organization, 72, currentY);
              currentY += 15;
            }
            
            // Description
            if (activity.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${activity.description}`, 92, currentY, {
                   width: doc.page.width - 164,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 8;
          }
        });
      }
    };

    const generateModernTemplate = () => {
      // Match preview's exact styling and measurements
      const pageWidth = 612;
      const margin = 72; 
      const contentWidth = pageWidth - (margin * 2);
      const primaryColor = formData.layout?.color || '#2563eb';
      
      let currentY = margin;

      // Header section - exactly matches preview "text-center mb-5"
      // Name - fontSize: '2.5rem', fontWeight: 700, color: primaryColor
      doc.fontSize(36) // 2.5rem * 14.4 (PDF point conversion)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text(formData.name || 'Your Name', margin, currentY, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      currentY += 50;

      // Contact info - matches "d-flex justify-content-center flex-wrap"
      const contactInfo = [];
      if (formData.email) contactInfo.push(`✉ ${formData.email}`);
      if (formData.phone) contactInfo.push(`☎ ${formData.phone}`);
      if (formData.location) contactInfo.push(`� ${formData.location}`);
      
      if (contactInfo.length > 0) {
        doc.fontSize(12)
           .fillColor('#666666')
           .font('Helvetica')
           .text(contactInfo.join('   •   '), margin, currentY, { 
             width: contentWidth, 
             align: 'center' 
           });
        currentY += 40; // mb-5 spacing
      }

      // Professional Summary section
      if (formData.summary) {
        // Remove page break - single page constraint
        // Section title - exactly matches selectedTemplate.sectionTitle
        // borderBottom: 2px solid primaryColor, paddingBottom: 8px, marginBottom: 16px, color: primaryColor
        doc.fontSize(18) // h4 equivalent
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Professional Summary', margin, currentY);
        
        // 2px border line exactly like preview
        doc.moveTo(margin, currentY + 25)
           .lineTo(margin + contentWidth, currentY + 25)
           .lineWidth(2)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 40; // paddingBottom + marginBottom
        
        // Summary paragraph - matches preview <p> styling
        // Truncate for single page constraint
        const maxSummaryLength = 350;
        const summaryText = truncateText(formData.summary, maxSummaryLength);
        
        doc.fontSize(12)
           .fillColor('#000000')
           .font('Helvetica')
           .text(summaryText, margin, currentY, { 
             width: contentWidth,
             align: 'justify',
             lineGap: 4
           });
        currentY = doc.y + 40; // mb-5 spacing
      }

      // Work Experience section
      if (formData.experience && formData.experience.some(exp => exp.company)) {
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = margin;
        }

        // Section title with exact styling
        doc.fontSize(18)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Work Experience', margin, currentY);
        
        doc.moveTo(margin, currentY + 25)
           .lineTo(margin + contentWidth, currentY + 25)
           .lineWidth(2)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 40;
        
        formData.experience.forEach(exp => {
          if (exp.company) {
            if (currentY > doc.page.height - 120) {
              doc.addPage();
              currentY = margin;
            }

            // Position title - matches h5 style (color: primaryColor, fontWeight: 600)
            doc.fontSize(14)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text(exp.position || 'Position', margin, currentY);
            
            // Date range - matches "text-muted" aligned right
            if (exp.startDate || exp.endDate) {
              const dateText = `${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`;
              doc.fontSize(12)
                 .fillColor('#666666')
                 .font('Helvetica')
                 .text(dateText, margin, currentY + 2, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 20; // Match preview spacing
            
            // Company name - matches h6 mb-2
            if (exp.company) {
              doc.fontSize(12)
                 .fillColor('#000000')
                 .font('Helvetica-Bold')
                 .text(exp.company, margin, currentY);
              currentY += 18; // mb-2 spacing
            }
            
            // Description paragraph
            if (exp.description) {
              doc.fontSize(12)
                 .fillColor('#000000')
                 .font('Helvetica')
                 .text(exp.description, margin, currentY, {
                   width: contentWidth,
                   lineGap: 4
                 });
              currentY = doc.y + 25; // mb-4 spacing
            }
            
            currentY += 15; // Additional spacing between entries
          }
        });
        currentY += 25; // mb-5 spacing
      }

      // Education section
      if (formData.education && formData.education.some(edu => edu.school)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(18)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Education', margin, currentY);
        
        doc.moveTo(margin, currentY + 25)
           .lineTo(margin + contentWidth, currentY + 25)
           .lineWidth(2)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 40;
        
        formData.education.forEach(edu => {
          if (edu.school) {
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = margin;
            }

            // Degree title
            doc.fontSize(14)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text(`${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`, margin, currentY);
            
            // Date range
            if (edu.startDate || edu.endDate) {
              const dateText = `${edu.startDate || ''} - ${edu.endDate || ''}`;
              doc.fontSize(12)
                 .fillColor('#666666')
                 .font('Helvetica')
                 .text(dateText, margin, currentY + 2, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 20;
            
            // School name
            doc.fontSize(12)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(edu.school, margin, currentY);
            currentY += 18;
            
            // Description
            if (edu.description) {
              doc.fontSize(12)
                 .fillColor('#000000')
                 .font('Helvetica')
                 .text(edu.description, margin, currentY, {
                   width: contentWidth,
                   lineGap: 4
                 });
              currentY = doc.y + 20;
            }
            
            currentY += 15;
          }
        });
        currentY += 25;
      }

      // Skills section - exactly matches preview skill badge layout
      if (formData.skills && formData.skills.some(skill => skill.trim())) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(18)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Skills', margin, currentY);
        
        doc.moveTo(margin, currentY + 25)
           .lineTo(margin + contentWidth, currentY + 25)
           .lineWidth(2)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 40;
        
        // Create skill badges - matches preview "d-flex flex-wrap"
        const skills = formData.skills.filter(skill => skill.trim());
        let currentX = margin;
        let lineHeight = 25;
        
        skills.forEach((skill, index) => {
          const skillWidth = doc.widthOfString(skill, 'Helvetica-Bold', 11) + 24; // padding
          
          // Check if skill fits on current line (flex-wrap behavior)
          if (currentX + skillWidth > margin + contentWidth) {
            currentY += lineHeight + 8; // margin bottom
            currentX = margin;
          }
          
          // Draw skill badge background - matches backgroundColor: primaryColor + '20'
          // Convert hex to RGB for opacity effect
          const rgbColor = hexToRgb(primaryColor);
          doc.rect(currentX, currentY - 3, skillWidth, 20)
             .fillColor(rgbColor.r, rgbColor.g, rgbColor.b, 0.2) // 20% opacity
             .fill();
          
          // Skill text - matches color: primaryColor, fontWeight: 500
          doc.fontSize(11)
             .fillColor(primaryColor)
             .font('Helvetica-Bold')
             .text(skill, currentX + 12, currentY, { width: skillWidth - 24 });
          
          currentX += skillWidth + 16; // margin right (0 8px 8px 0)
        });
        
        currentY += 40;
      }

      // Projects section
      if (formData.projects && formData.projects.some(proj => proj.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(18)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Projects', margin, currentY);
        
        doc.moveTo(margin, currentY + 25)
           .lineTo(margin + contentWidth, currentY + 25)
           .lineWidth(2)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 40;
        
        formData.projects.forEach(proj => {
          if (proj.title) {
            if (currentY > doc.page.height - 120) {
              doc.addPage();
              currentY = margin;
            }

            // Project title
            doc.fontSize(14)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text(proj.title, margin, currentY);
            
            currentY += 20;
            
            // Technologies - matches "small text-muted"
            if (proj.technologies) {
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Helvetica')
                 .text(`Technologies: ${proj.technologies}`, margin, currentY);
              currentY += 16;
            }
            
            // Description
            if (proj.description) {
              doc.fontSize(12)
                 .fillColor('#000000')
                 .font('Helvetica')
                 .text(proj.description, margin, currentY, {
                   width: contentWidth,
                   lineGap: 4
                 });
              currentY = doc.y + 15;
            }

            // Project link - matches button styling
            if (proj.link) {
              doc.fontSize(11)
                 .fillColor(primaryColor)
                 .font('Helvetica')
                 .text(`🔗 View Project: ${proj.link}`, margin, currentY);
              currentY += 15;
            }
            
            currentY += 20;
          }
        });
        currentY += 25;
      }

      // Extra-curricular Activities section
      if (formData.extracurricular && formData.extracurricular.some(activity => activity.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(18)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Extra-Curricular Activities', margin, currentY);
        
        doc.moveTo(margin, currentY + 25)
           .lineTo(margin + contentWidth, currentY + 25)
           .lineWidth(2)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 40;
        
        formData.extracurricular.forEach(activity => {
          if (activity.title) {
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = margin;
            }

            // Activity title
            doc.fontSize(14)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text(activity.title, margin, currentY);
            
            // Date range
            if (activity.startDate || activity.endDate) {
              const dateText = `${activity.startDate || ''} - ${activity.current ? 'Present' : activity.endDate || ''}`;
              doc.fontSize(12)
                 .fillColor('#666666')
                 .font('Helvetica')
                 .text(dateText, margin, currentY + 2, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 20;
            
            // Organization
            if (activity.organization) {
              doc.fontSize(12)
                 .fillColor('#000000')
                 .font('Helvetica-Bold')
                 .text(activity.organization, margin, currentY);
              currentY += 18;
            }
            
            // Description
            if (activity.description) {
              doc.fontSize(12)
                 .fillColor('#000000')
                 .font('Helvetica')
                 .text(activity.description, margin, currentY, {
                   width: contentWidth,
                   lineGap: 4
                 });
              currentY = doc.y + 20;
            }
            
            currentY += 15;
          }
        });
      }
    };

    const generateClassicTemplate = () => {
      // Single-page optimized Classic template
      const pageWidth = 612;
      const margin = 72; 
      const contentWidth = pageWidth - (margin * 2);
      const primaryColor = formData.layout?.color || '#2c3e50';
      
      let currentY = margin;
      const maxY = PAGE_HEIGHT - margin;
      
      // Determine sections to include
      const sectionsToInclude = getOptimizedSections(formData, MAX_CONTENT_HEIGHT);

      // Header - compact classic styling
      doc.fontSize(26) // Reduced for space efficiency
         .fillColor('#000000')
         .font('Times-Bold')
         .text(formData.name || 'Your Name', margin, currentY, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      currentY += 35;

      // Contact info - single line
      const contactInfo = [];
      if (formData.email) contactInfo.push(formData.email);
      if (formData.phone) contactInfo.push(formData.phone);
      if (formData.location) contactInfo.push(formData.location);
      
      if (contactInfo.length > 0) {
        doc.fontSize(11)
           .fillColor('#666666')
           .font('Times-Roman')
           .text(contactInfo.join(' | '), margin, currentY, { 
             width: contentWidth, 
             align: 'center' 
           });
        currentY += 25;
      }

      // Horizontal line separator
      doc.moveTo(margin, currentY)
         .lineTo(margin + contentWidth, currentY)
         .lineWidth(1)
         .strokeColor('#333333')
         .stroke();
      currentY += 20;

      // Professional Summary
      if (sectionsToInclude.includes('summary') && formData.summary) {
        doc.fontSize(14)
           .fillColor('#000000')
           .font('Times-Bold')
           .text('SUMMARY', margin, currentY);
        currentY += 20;
        
        const maxSummaryLength = 300;
        const summaryText = truncateText(formData.summary, maxSummaryLength);
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(summaryText, margin, currentY, { 
             width: contentWidth,
             align: 'justify',
             lineGap: 2
           });
        currentY = doc.y + 20;
      }

      // Experience
      if (sectionsToInclude.includes('experience') && formData.experience?.length > 0) {
        doc.fontSize(14)
           .fillColor('#000000')
           .font('Times-Bold')
           .text('EXPERIENCE', margin, currentY);
        currentY += 20;
        
        const experienceToShow = formData.experience.slice(0, 3);
        
        experienceToShow.forEach(exp => {
          if (exp.company && currentY < maxY - 40) {
            // Position and dates
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(exp.position || 'Position', margin, currentY);
            
            if (exp.startDate || exp.endDate) {
              const dateText = `${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`;
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(dateText, margin, currentY, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 14;
            
            // Company
            doc.fontSize(10)
               .fillColor('#666666')
               .font('Times-Italic')
               .text(exp.company, margin, currentY);
            currentY += 12;
            
            // Description
            if (exp.description && currentY < maxY - 25) {
              const maxDescLength = 100;
              const descText = truncateText(exp.description, maxDescLength);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${descText}`, margin + 10, currentY, {
                   width: contentWidth - 10,
                   lineGap: 1
                 });
              currentY = doc.y + 8;
            }
            
            currentY += 10;
          }
        });
      }

      // Education
      if (sectionsToInclude.includes('education') && formData.education?.length > 0 && currentY < maxY - 60) {
        doc.fontSize(14)
           .fillColor('#000000')
           .font('Times-Bold')
           .text('EDUCATION', margin, currentY);
        currentY += 20;
        
        formData.education.slice(0, 2).forEach(edu => {
          if (edu.school && currentY < maxY - 25) {
            const degreeText = `${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`;
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(degreeText, margin, currentY);
            
            if (edu.startDate || edu.endDate) {
              const dateText = `${edu.startDate || ''} - ${edu.endDate || ''}`;
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(dateText, margin, currentY, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 14;
            
            doc.fontSize(10)
               .fillColor('#666666')
               .font('Times-Italic')
               .text(edu.school, margin, currentY);
            currentY += 18;
          }
        });
      }

      // Skills
      if (sectionsToInclude.includes('skills') && formData.skills?.length > 0 && currentY < maxY - 40) {
        doc.fontSize(14)
           .fillColor('#000000')
           .font('Times-Bold')
           .text('SKILLS', margin, currentY);
        currentY += 20;
        
        const skills = formData.skills.filter(skill => skill.trim()).slice(0, 10);
        const skillsText = skills.join(' • ');
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(skillsText, margin, currentY, {
             width: contentWidth,
             lineGap: 2
           });
        currentY = doc.y + 15;
      }

      // Projects
      if (sectionsToInclude.includes('projects') && formData.projects?.length > 0 && currentY < maxY - 50) {
        doc.fontSize(14)
           .fillColor('#000000')
           .font('Times-Bold')
           .text('PROJECTS', margin, currentY);
        currentY += 20;
        
        formData.projects.slice(0, 2).forEach(proj => {
          if (proj.title && currentY < maxY - 20) {
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(proj.title, margin, currentY);
            currentY += 12;
            
            if (proj.technologies) {
              doc.fontSize(9)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(proj.technologies, margin, currentY);
              currentY += 10;
            }
            
            if (proj.description && currentY < maxY - 15) {
              const maxProjDesc = 80;
              const projDesc = truncateText(proj.description, maxProjDesc);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${projDesc}`, margin + 10, currentY, {
                   width: contentWidth - 10
                 });
              currentY = doc.y + 8;
            }
          }
        });
      }

      // Extracurricular
      if (sectionsToInclude.includes('extracurricular') && formData.extracurricular?.length > 0 && currentY < maxY - 30) {
        doc.fontSize(14)
           .fillColor('#000000')
           .font('Times-Bold')
           .text('ACTIVITIES', margin, currentY);
        currentY += 20;
        
        formData.extracurricular.slice(0, 2).forEach(activity => {
          if (activity.title && currentY < maxY - 15) {
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(`${activity.title}${activity.organization ? ` - ${activity.organization}` : ''}`, margin, currentY);
            currentY += 12;
            
            if (activity.description && currentY < maxY - 10) {
              const maxActDesc = 60;
              const actDesc = truncateText(activity.description, maxActDesc);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${actDesc}`, margin + 10, currentY, {
                   width: contentWidth - 10
                 });
              currentY = doc.y + 8;
            }
          }
        });
      }
    };
      
      if (contactInfo.length > 0) {
        doc.fontSize(11)
           .fillColor('#555555')
           .font('Times-Roman')
           .text(contactInfo.join(' | '), margin, currentY, { 
             width: contentWidth, 
             align: 'center' 
           });
        currentY += 40;
      }

      // Professional Summary
      if (formData.summary) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        // Section title - matches classic style (borderBottom: 1px solid #ccc)
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .font('Times-Bold')
           .text('Professional Summary', margin, currentY);
        
        // 1px border line (classic style)
        doc.moveTo(margin, currentY + 22)
           .lineTo(margin + contentWidth, currentY + 22)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();
        
        currentY += 35;
        
        doc.fontSize(11)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(formData.summary, margin, currentY, { 
             width: contentWidth,
             align: 'justify',
             lineGap: 3
           });
        currentY = doc.y + 35;
      }

      // Professional Experience
      if (formData.experience && formData.experience.some(exp => exp.company)) {
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(16)
           .fillColor('#2c3e50')
           .font('Times-Bold')
           .text('Professional Experience', margin, currentY);
        
        doc.moveTo(margin, currentY + 22)
           .lineTo(margin + contentWidth, currentY + 22)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();
        
        currentY += 35;
        
        formData.experience.forEach(exp => {
          if (exp.company) {
            if (currentY > doc.page.height - 120) {
              doc.addPage();
              currentY = margin;
            }

            // Position and Company on same line (classic style)
            doc.fontSize(13)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(`${exp.position || 'Position'}${exp.company ? ` at ${exp.company}` : ''}`, margin, currentY);
            
            // Dates on right
            if (exp.startDate || exp.endDate) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(`${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`, 
                       margin, currentY, { width: contentWidth, align: 'right' });
            }
            
            currentY += 20;
            
            // Description
            if (exp.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${exp.description}`, margin + 20, currentY, {
                   width: contentWidth - 20,
                   lineGap: 2
                 });
              currentY = doc.y + 15;
            }
            
            currentY += 15;
          }
        });
        currentY += 20;
      }

      // Education
      if (formData.education && formData.education.some(edu => edu.school)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(16)
           .fillColor('#2c3e50')
           .font('Times-Bold')
           .text('Education', margin, currentY);
        
        doc.moveTo(margin, currentY + 22)
           .lineTo(margin + contentWidth, currentY + 22)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();
        
        currentY += 35;
        
        formData.education.forEach(edu => {
          if (edu.school) {
            doc.fontSize(13)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(`${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`, margin, currentY);
            
            currentY += 15;
            
            if (edu.school) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(edu.school, margin, currentY);
              currentY += 12;
            }
            
            if (edu.startDate || edu.endDate) {
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Roman')
                 .text(`${edu.startDate || ''} - ${edu.endDate || ''}`, margin, currentY);
              currentY += 15;
            }

            if (edu.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(edu.description, margin, currentY, {
                   width: contentWidth,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 15;
          }
        });
        currentY += 20;
      }

      // Skills
      if (formData.skills && formData.skills.some(skill => skill.trim())) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(16)
           .fillColor('#2c3e50')
           .font('Times-Bold')
           .text('Skills', margin, currentY);
        
        doc.moveTo(margin, currentY + 22)
           .lineTo(margin + contentWidth, currentY + 22)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();
        
        currentY += 35;
        
        const skillsText = formData.skills
          .filter(skill => skill.trim())
          .join(' • ');
        
        doc.fontSize(11)
           .fillColor('#000000')
           .font('Times-Roman')
           .text(skillsText, margin, currentY, {
             width: contentWidth,
             lineGap: 3
           });
        currentY = doc.y + 30;
      }

      // Projects
      if (formData.projects && formData.projects.some(proj => proj.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(16)
           .fillColor('#2c3e50')
           .font('Times-Bold')
           .text('Projects', margin, currentY);
        
        doc.moveTo(margin, currentY + 22)
           .lineTo(margin + contentWidth, currentY + 22)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();
        
        currentY += 35;
        
        formData.projects.forEach(proj => {
          if (proj.title) {
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = margin;
            }

            doc.fontSize(13)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(proj.title, margin, currentY);
            
            currentY += 15;
            
            if (proj.technologies) {
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(`Technologies: ${proj.technologies}`, margin, currentY);
              currentY += 12;
            }
            
            if (proj.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${proj.description}`, margin + 20, currentY, {
                   width: contentWidth - 20,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }

            if (proj.link) {
              doc.fontSize(10)
                 .fillColor('#2c3e50')
                 .font('Times-Roman')
                 .text(`Link: ${proj.link}`, margin, currentY);
              currentY += 12;
            }
            
            currentY += 15;
          }
        });
        currentY += 20;
      }

      // Extra-curricular Activities
      if (formData.extracurricular && formData.extracurricular.some(activity => activity.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = margin;
        }

        doc.fontSize(16)
           .fillColor('#2c3e50')
           .font('Times-Bold')
           .text('Extra-curricular Activities', margin, currentY);
        
        doc.moveTo(margin, currentY + 22)
           .lineTo(margin + contentWidth, currentY + 22)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();
        
        currentY += 35;
        
        formData.extracurricular.forEach(activity => {
          if (activity.title) {
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = margin;
            }

            // Activity title and dates
            doc.fontSize(13)
               .fillColor('#000000')
               .font('Times-Bold')
               .text(activity.title, margin, currentY);
            
            if (activity.startDate || activity.endDate) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(`${activity.startDate || ''} - ${activity.current ? 'Present' : activity.endDate || ''}`, 
                       margin, currentY, { width: contentWidth, align: 'right' });
            }
            
            currentY += 15;
            
            // Organization
            if (activity.organization) {
              doc.fontSize(11)
                 .fillColor('#666666')
                 .font('Times-Italic')
                 .text(activity.organization, margin, currentY);
              currentY += 15;
            }
            
            // Description
            if (activity.description) {
              doc.fontSize(11)
                 .fillColor('#000000')
                 .font('Times-Roman')
                 .text(`• ${activity.description}`, margin + 20, currentY, {
                   width: contentWidth - 20,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 15;
          }
        });
      }
    };

    const generateMinimalTemplate = () => {
      // Clean header
      doc.fontSize(24)
         .fillColor('#111827')
         .font('Helvetica-Light')
         .text(formData.name || 'Your Name', 72, 72);
      
      let currentY = 105;
      
      // Subtitle and contact in clean layout
      if (formData.email || formData.phone || formData.location) {
        const contacts = [];
        if (formData.email) contacts.push(formData.email);
        if (formData.phone) contacts.push(formData.phone);
        if (formData.location) contacts.push(formData.location);
        
        doc.fontSize(10)
           .fillColor('#6b7280')
           .font('Helvetica')
           .text(contacts.join(' • '), 72, currentY);
        
        currentY += 30;
      }

      // Professional Summary
      if (formData.summary) {
        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Summary', 72, currentY);
        
        currentY += 20;
        doc.fontSize(10)
           .fillColor('#6b7280')
           .font('Helvetica')
           .text(formData.summary, 72, currentY, { 
             width: doc.page.width - 144,
             align: 'justify',
             lineGap: 2
           });
        currentY = doc.y + 25;
      }

      // Experience section
      if (formData.experience && formData.experience.some(exp => exp.company)) {
        // Check if we need a new page
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Experience', 72, currentY);
        
        currentY += 20;
        
        formData.experience.forEach(exp => {
          if (exp.company || exp.position) {
            // Check if we need a new page for this experience entry
            if (currentY > doc.page.height - 100) {
              doc.addPage();
              currentY = 72;
            }

            // Position and dates in one line
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Medium')
               .text(exp.position || 'Position', 72, currentY);
            
            if (exp.startDate || exp.endDate) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(`${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`, 
                       doc.page.width - 150, currentY, { align: 'right' });
            }
            
            currentY += 12;
            
            // Company
            if (exp.company) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(exp.company, 72, currentY);
              currentY += 15;
            }
            
            // Description
            if (exp.description) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(exp.description, 72, currentY, {
                   width: doc.page.width - 144,
                   lineGap: 2
                 });
              currentY = doc.y + 15;
            }
            
            currentY += 10;
          }
        });
        currentY += 15;
      }

      // Education
      if (formData.education && formData.education.some(edu => edu.school)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Education', 72, currentY);
        
        currentY += 20;
        
        formData.education.forEach(edu => {
          if (edu.school || edu.degree) {
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Medium')
               .text(`${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`, 72, currentY);
            
            currentY += 12;
            
            if (edu.school) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(edu.school, 72, currentY);
              currentY += 12;
            }
            
            if (edu.startDate || edu.endDate) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(`${edu.startDate || ''} - ${edu.endDate || ''}`, 72, currentY);
              currentY += 15;
            }

            if (edu.description) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(edu.description, 72, currentY, {
                   width: doc.page.width - 144,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 10;
          }
        });
        currentY += 15;
      }

      // Skills
      if (formData.skills && formData.skills.some(skill => skill.trim())) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Skills', 72, currentY);
        
        currentY += 20;
        
        const skillsText = formData.skills
          .filter(skill => skill.trim())
          .join(' • ');
        
        doc.fontSize(10)
           .fillColor('#6b7280')
           .font('Helvetica')
           .text(skillsText, 72, currentY, {
             width: doc.page.width - 144,
             lineGap: 2
           });
        currentY = doc.y + 20;
      }

      // Projects
      if (formData.projects && formData.projects.some(proj => proj.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Projects', 72, currentY);
        
        currentY += 20;
        
        formData.projects.forEach(proj => {
          if (proj.title) {
            // Check if we need a new page for this project entry
            if (currentY > doc.page.height - 80) {
              doc.addPage();
              currentY = 72;
            }

            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Medium')
               .text(proj.title, 72, currentY);
            
            currentY += 12;
            
            if (proj.technologies) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(`Technologies: ${proj.technologies}`, 72, currentY);
              currentY += 12;
            }
            
            if (proj.description) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(proj.description, 72, currentY, {
                   width: doc.page.width - 144,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }

            if (proj.link) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(`Link: ${proj.link}`, 72, currentY);
              currentY += 12;
            }
            
            currentY += 10;
          }
        });
        currentY += 15;
      }

      // Extra-curricular Activities
      if (formData.extracurricular && formData.extracurricular.some(activity => activity.title)) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = 72;
        }

        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Activities', 72, currentY);
        
        currentY += 20;
        
        formData.extracurricular.forEach(activity => {
          if (activity.title) {
            // Check if we need a new page for this activity entry
            if (currentY > doc.page.height - 80) {
              doc.addPage();
              currentY = 72;
            }

            // Activity title and dates
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Medium')
               .text(activity.title, 72, currentY);
            
            if (activity.startDate || activity.endDate) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(`${activity.startDate || ''} - ${activity.current ? 'Present' : activity.endDate || ''}`, 
                       doc.page.width - 150, currentY, { align: 'right' });
            }
            
            currentY += 12;
            
            // Organization  
            if (activity.organization) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(activity.organization, 72, currentY);
              currentY += 15;
            }
            
            // Description
            if (activity.description) {
              doc.fontSize(10)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(activity.description, 72, currentY, {
                   width: doc.page.width - 144,
                   lineGap: 2
                 });
              currentY = doc.y + 10;
            }
            
            currentY += 10;
          }
        });
      }
    };

    // Generate PDF based on selected template
    switch (template) {
      case 'executive':
        generateExecutiveTemplate();
        break;
      case 'classic':
        generateClassicTemplate();
        break;
      case 'minimal':
        generateMinimalTemplate();
        break;
      case 'modern':
      default:
        generateModernTemplate();
        break;
    }
    
    // Finalize the PDF
    doc.end();
    
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Create or update resume (legacy endpoint)
router.post('/create', auth, async (req, res) => {
  try {
    const { content, keywords, atsScore } = req.body;

    let resume = new Resume({
      user: req.user.id,
      content,
      keywords: keywords || [],
      atsScore: atsScore || 0
    });

    await resume.save();
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
    res.json(resumes);
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

export default router;