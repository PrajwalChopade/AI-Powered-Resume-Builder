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
      return res.json({ 
        success: true, 
        resume: null,
        message: 'No resume found' 
      });
    }
    
    res.json({
      success: true,
      resume: {
        id: resume._id,
        title: resume.title,
        content: resume.content,
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

// Download resume as PDF - SINGLE PAGE OPTIMIZED
router.post('/download-pdf', auth, async (req, res) => {
  try {
    const { formData } = req.body;
    const template = formData.layout?.template || 'modern';
    const primaryColor = formData.layout?.color || '#2563eb';
    
    // Create PDF document - US Letter size (612 x 792 points)
    const doc = new PDFDocument({ size: 'letter', margin: 72 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${formData.name || 'resume'}.pdf"`);
    
    // Pipe the PDF to the response
    doc.pipe(res);

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

    // Helper function to convert hex to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : {r: 13, g: 110, b: 253};
    };

    // Template generators - all single-page optimized
    const generateModernTemplate = () => {
      const pageWidth = 612;
      const margin = 72; 
      const contentWidth = pageWidth - (margin * 2);
      const primaryColor = formData.layout?.color || '#2563eb';
      
      let currentY = margin;
      const maxY = PAGE_HEIGHT - margin;
      const sectionsToInclude = getOptimizedSections(formData, MAX_CONTENT_HEIGHT);

      // Header - compact but professional
      doc.fontSize(28)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text(formData.name || 'Your Name', margin, currentY, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      currentY += 35;

      // Contact info
      const contactInfo = [];
      if (formData.email) contactInfo.push(formData.email);
      if (formData.phone) contactInfo.push(formData.phone);
      if (formData.location) contactInfo.push(formData.location);
      
      if (contactInfo.length > 0) {
        doc.fontSize(11)
           .fillColor('#666666')
           .font('Helvetica')
           .text(contactInfo.join(' • '), margin, currentY, { 
             width: contentWidth, 
             align: 'center' 
           });
        currentY += 25;
      }

      // Professional Summary
      if (sectionsToInclude.includes('summary') && formData.summary) {
        doc.fontSize(14)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('PROFESSIONAL SUMMARY', margin, currentY);
        
        doc.moveTo(margin, currentY + 18)
           .lineTo(margin + contentWidth, currentY + 18)
           .lineWidth(1.5)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 25;
        
        const maxSummaryLength = 350;
        const summaryText = truncateText(formData.summary, maxSummaryLength);
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Helvetica')
           .text(summaryText, margin, currentY, { 
             width: contentWidth,
             align: 'justify',
             lineGap: 2
           });
        currentY = doc.y + 20;
      }

      // Work Experience
      if (sectionsToInclude.includes('experience') && formData.experience?.length > 0) {
        doc.fontSize(14)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('EXPERIENCE', margin, currentY);
        
        doc.moveTo(margin, currentY + 18)
           .lineTo(margin + contentWidth, currentY + 18)
           .lineWidth(1.5)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 25;
        
        const experienceToShow = formData.experience.slice(0, 3);
        
        experienceToShow.forEach((exp, index) => {
          if (exp.company && currentY < maxY - 40) {
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(exp.position || 'Position', margin, currentY);
            
            if (exp.startDate || exp.endDate) {
              const dateText = `${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`;
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Helvetica')
                 .text(dateText, margin, currentY, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 14;
            
            doc.fontSize(10)
               .fillColor('#666666')
               .font('Helvetica-Oblique')
               .text(exp.company, margin, currentY);
            currentY += 12;
            
            if (exp.description && currentY < maxY - 30) {
              const maxDescLength = 120;
              const descText = truncateText(exp.description, maxDescLength);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Helvetica')
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
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('EDUCATION', margin, currentY);
        
        doc.moveTo(margin, currentY + 18)
           .lineTo(margin + contentWidth, currentY + 18)
           .lineWidth(1.5)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 25;
        
        formData.education.slice(0, 2).forEach(edu => {
          if (edu.school && currentY < maxY - 30) {
            const degreeText = `${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`;
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(degreeText, margin, currentY);
            
            if (edu.startDate || edu.endDate) {
              const dateText = `${edu.startDate || ''} - ${edu.endDate || ''}`;
              doc.fontSize(10)
                 .fillColor('#666666')
                 .font('Helvetica')
                 .text(dateText, margin, currentY, { 
                   width: contentWidth, 
                   align: 'right' 
                 });
            }
            
            currentY += 14;
            
            doc.fontSize(10)
               .fillColor('#666666')
               .font('Helvetica-Oblique')
               .text(edu.school, margin, currentY);
            currentY += 18;
          }
        });
      }

      // Skills
      if (sectionsToInclude.includes('skills') && formData.skills?.length > 0 && currentY < maxY - 50) {
        doc.fontSize(14)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('SKILLS', margin, currentY);
        
        doc.moveTo(margin, currentY + 18)
           .lineTo(margin + contentWidth, currentY + 18)
           .lineWidth(1.5)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 25;
        
        const skills = formData.skills.filter(skill => skill.trim()).slice(0, 12);
        const skillsText = skills.join(' • ');
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Helvetica')
           .text(skillsText, margin, currentY, {
             width: contentWidth,
             lineGap: 2
           });
        currentY = doc.y + 15;
      }

      // Projects
      if (sectionsToInclude.includes('projects') && formData.projects?.length > 0 && currentY < maxY - 60) {
        doc.fontSize(14)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('PROJECTS', margin, currentY);
        
        doc.moveTo(margin, currentY + 18)
           .lineTo(margin + contentWidth, currentY + 18)
           .lineWidth(1.5)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 25;
        
        formData.projects.slice(0, 2).forEach(proj => {
          if (proj.title && currentY < maxY - 25) {
            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(proj.title, margin, currentY);
            
            currentY += 12;
            
            if (proj.technologies) {
              doc.fontSize(9)
                 .fillColor('#666666')
                 .font('Helvetica-Oblique')
                 .text(proj.technologies, margin, currentY);
              currentY += 10;
            }
            
            if (proj.description && currentY < maxY - 20) {
              const maxProjDesc = 100;
              const projDesc = truncateText(proj.description, maxProjDesc);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Helvetica')
                 .text(`• ${projDesc}`, margin + 10, currentY, {
                   width: contentWidth - 10,
                   lineGap: 1
                 });
              currentY = doc.y + 8;
            }
          }
        });
      }

      // Extracurricular
      if (sectionsToInclude.includes('extracurricular') && formData.extracurricular?.length > 0 && currentY < maxY - 40) {
        doc.fontSize(14)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('ACTIVITIES', margin, currentY);
        
        doc.moveTo(margin, currentY + 18)
           .lineTo(margin + contentWidth, currentY + 18)
           .lineWidth(1.5)
           .strokeColor(primaryColor)
           .stroke();
        
        currentY += 25;
        
        formData.extracurricular.slice(0, 2).forEach(activity => {
          if (activity.title && currentY < maxY - 20) {
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(`${activity.title}${activity.organization ? ` - ${activity.organization}` : ''}`, margin, currentY);
            
            currentY += 12;
            
            if (activity.description && currentY < maxY - 15) {
              const maxActDesc = 80;
              const actDesc = truncateText(activity.description, maxActDesc);
              
              doc.fontSize(9)
                 .fillColor('#000000')
                 .font('Helvetica')
                 .text(`• ${actDesc}`, margin + 10, currentY, {
                   width: contentWidth - 10
                 });
              currentY = doc.y + 8;
            }
          }
        });
      }
    };

    const generateClassicTemplate = () => {
      const pageWidth = 612;
      const margin = 72; 
      const contentWidth = pageWidth - (margin * 2);
      const primaryColor = formData.layout?.color || '#2c3e50';
      
      let currentY = margin;
      const maxY = PAGE_HEIGHT - margin;
      const sectionsToInclude = getOptimizedSections(formData, MAX_CONTENT_HEIGHT);

      // Header - compact classic styling
      doc.fontSize(26)
         .fillColor('#000000')
         .font('Times-Bold')
         .text(formData.name || 'Your Name', margin, currentY, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      currentY += 35;

      // Contact info
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
            
            doc.fontSize(10)
               .fillColor('#666666')
               .font('Times-Italic')
               .text(exp.company, margin, currentY);
            currentY += 12;
            
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

    const generateExecutiveTemplate = () => {
      let currentY = 72;
      const maxY = PAGE_HEIGHT - 72;
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
            
            doc.fontSize(10)
               .fillColor('#1a365d')
               .font('Times-Bold')
               .text(exp.company, 72, currentY);
            currentY += 12;
            
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

    const generateMinimalTemplate = () => {
      let currentY = 72;
      const maxY = PAGE_HEIGHT - 72;
      const sectionsToInclude = getOptimizedSections(formData, MAX_CONTENT_HEIGHT);

      // Minimal header
      doc.fontSize(22)
         .fillColor('#111827')
         .font('Helvetica-Light')
         .text(formData.name || 'Your Name', 72, currentY);
      
      currentY += 35;

      // Contact info - minimal style
      const contactInfo = [];
      if (formData.email) contactInfo.push(formData.email);
      if (formData.phone) contactInfo.push(formData.phone);
      if (formData.location) contactInfo.push(formData.location);
      
      if (contactInfo.length > 0) {
        doc.fontSize(10)
           .fillColor('#6b7280')
           .font('Helvetica')
           .text(contactInfo.join('  •  '), 72, currentY);
        currentY += 25;
      }

      // Summary
      if (sectionsToInclude.includes('summary') && formData.summary) {
        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Summary', 72, currentY);
        currentY += 18;
        
        const maxSummaryLength = 320;
        const summaryText = truncateText(formData.summary, maxSummaryLength);
        
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Helvetica')
           .text(summaryText, 72, currentY, {
             width: doc.page.width - 144,
             lineGap: 2
           });
        currentY = doc.y + 18;
      }

      // Experience
      if (sectionsToInclude.includes('experience') && formData.experience?.length > 0) {
        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Experience', 72, currentY);
        currentY += 18;
        
        const experienceToShow = formData.experience.slice(0, 3);
        
        experienceToShow.forEach(exp => {
          if (exp.company && currentY < maxY - 30) {
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(exp.position || 'Position', 72, currentY);
            
            if (exp.startDate || exp.endDate) {
              const dateText = `${exp.startDate || ''} - ${exp.current ? 'Present' : exp.endDate || ''}`;
              doc.fontSize(9)
                 .fillColor('#6b7280')
                 .font('Helvetica')
                 .text(dateText, 72, currentY, { 
                   width: doc.page.width - 144, 
                   align: 'right' 
                 });
            }
            
            currentY += 12;
            
            doc.fontSize(9)
               .fillColor('#6b7280')
               .font('Helvetica')
               .text(exp.company, 72, currentY);
            currentY += 10;
            
            if (exp.description && currentY < maxY - 20) {
              const maxDescLength = 100;
              const descText = truncateText(exp.description, maxDescLength);
              
              doc.fontSize(9)
                 .fillColor('#374151')
                 .font('Helvetica')
                 .text(descText, 72, currentY, {
                   width: doc.page.width - 144,
                   lineGap: 1
                 });
              currentY = doc.y + 8;
            }
            
            currentY += 8;
          }
        });
      }

      // Education
      if (sectionsToInclude.includes('education') && formData.education?.length > 0 && currentY < maxY - 40) {
        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Education', 72, currentY);
        currentY += 18;
        
        formData.education.slice(0, 2).forEach(edu => {
          if (edu.school && currentY < maxY - 20) {
            const degreeText = `${edu.degree || 'Degree'}${edu.field ? ` in ${edu.field}` : ''}`;
            doc.fontSize(10)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(degreeText, 72, currentY);
            
            currentY += 12;
            
            doc.fontSize(9)
               .fillColor('#6b7280')
               .font('Helvetica')
               .text(edu.school, 72, currentY);
            currentY += 15;
          }
        });
      }

      // Skills
      if (sectionsToInclude.includes('skills') && formData.skills?.length > 0 && currentY < maxY - 30) {
        doc.fontSize(12)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text('Skills', 72, currentY);
        currentY += 18;
        
        const skills = formData.skills.filter(skill => skill.trim()).slice(0, 10);
        const skillsText = skills.join('  •  ');
        
        doc.fontSize(9)
           .fillColor('#6b7280')
           .font('Helvetica')
           .text(skillsText, 72, currentY, {
             width: doc.page.width - 144,
             lineGap: 2
           });
        currentY = doc.y + 15;
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

// Get resume history
router.get('/history', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt atsScore');
    
    res.json({
      success: true,
      resumes
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch resume history' });
  }
});

// Get specific resume by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({
      success: true,
      resume
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

export default router;
