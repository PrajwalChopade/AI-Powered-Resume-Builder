import express from 'express';
import axios from 'axios';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing in .env');
} else {
  console.log('✅ GEMINI_API_KEY loaded:', GEMINI_API_KEY.substring(0, 10) + '...');
}

// Format prompt exactly like the working Python code
const getATSPrompt = (resumeText, jobDescription) => `Analyze the resume for this role:
Job Description: ${jobDescription}
Resume: ${resumeText}

Provide in this exact JSON format:
{
  "ats_score": 85,
  "matched_skills": ["JavaScript", "React", "Node.js"],
  "missing_skills": ["Python", "AWS"],
  "gap_analysis": ["Add cloud experience", "Include Python projects"],
  "keyword_density": 75,
  "skills_match": 80,
  "experience_match": 90
}

Return only the JSON, no other text.`;

const cleanResumeText = (content) => {
  if (typeof content === 'object') content = JSON.stringify(content);
  return content
    .replace(/[^\w\s\.,;:()\-@]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

const parseGeminiResponse = (responseText) => {
  try {
    // Try to parse the response directly first
    let jsonData;
    try {
      jsonData = JSON.parse(responseText);
    } catch {
      // If that fails, look for JSON within the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON in response");
      }
    }
    
    // Convert to camelCase for frontend compatibility
    return {
      atsScore: jsonData.ats_score || 0,
      matchedSkills: jsonData.matched_skills || [],
      missingSkills: jsonData.missing_skills || [],
      gapAnalysis: jsonData.gap_analysis || ['Unable to analyze'],
      keywordDensity: jsonData.keyword_density || 0,
      skillsMatch: jsonData.skills_match || 0,
      experienceMatch: jsonData.experience_match || 0,
    };
  } catch (error) {
    console.error('Gemini parsing error:', error.message);
    console.error('Raw response that failed to parse:', responseText);
    return {
      atsScore: 0,
      matchedSkills: [],
      missingSkills: [],
      gapAnalysis: ['Could not parse AI response.'],
      keywordDensity: 0,
      skillsMatch: 0,
      experienceMatch: 0,
    };
  }
};

router.post('/evaluate', upload.single('resume'), async (req, res) => {
  try {
    // Get text fields from the form data body
    const { jobDescription } = req.body;
    // Get the file from multer
    const resumeFile = req.file;

    if (!resumeFile || !jobDescription) {
      return res.status(400).json({ msg: 'Resume file and Job Description are required.' });
    }

    console.log('📄 Processing PDF file...');
    
    // 1. Parse the PDF file to get text
    const data = await pdfParse(resumeFile.buffer);
    const resumeContent = cleanResumeText(data.text);

    console.log('✅ PDF processed, text length:', resumeContent.length);

    // 2. Create the prompt for the AI
    const prompt = getATSPrompt(resumeContent, jobDescription);

    console.log('📡 Calling Gemini API...');
    console.log('Using API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 20)}...` : 'MISSING');
    console.log('Model: gemini-1.5-flash (confirmed working model)');

    // 3. Call the Gemini API (FREE!) - Using confirmed working model
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('✅ Gemini API responded successfully');

    // 4. Parse the response from the AI
    const aiText = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Raw AI Response:', aiText);
    
    if (!aiText) {
      console.error('❌ No text in Gemini response!');
      console.error('Full response:', JSON.stringify(geminiResponse.data, null, 2));
      throw new Error('Empty response from Gemini API');
    }
    
    const parsedResults = parseGeminiResponse(aiText);

    console.log('✅ Parsed results:', JSON.stringify(parsedResults, null, 2));

    // 5. Send the results back to the client
    res.json({
      success: true,
      results: parsedResults
    });

  } catch (err) {
    console.error('❌ ATS Evaluation Failed:');
    console.error('Error message:', err.message);
    console.error('Error response:', err.response?.data);
    console.error('Error status:', err.response?.status);
    
    // If it's a Gemini API error, provide more specific feedback
    if (err.response?.data?.error) {
      console.error('Gemini API Error:', err.response.data.error);
    }
    
    res.status(500).json({ 
      msg: 'Server Error', 
      error: err.response?.data || err.message,
      details: err.message,
      status: err.response?.status,
      geminiError: err.response?.data?.error || null
    });
  }
});

export default router;
