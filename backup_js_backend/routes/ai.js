import { GoogleGenerativeAI } from "@google/generative-ai";
import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();

// Initialize Gemini AI
let genAI;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔍 AI Route - API Key check:');
  console.log('Key exists:', !!apiKey);
  console.log('Key length:', apiKey ? apiKey.length : 0);
  console.log('Key starts with AIza:', apiKey ? apiKey.startsWith('AIza') : false);
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ GEMINI_API_KEY is missing from environment variables');
  } else {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    console.log('✅ Gemini AI initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Gemini AI:', error.message);
}

// Route to analyze resume with Gemini AI
router.post('/analyze-resume', auth, async (req, res) => {
  const { resumeContent, jobDescription } = req.body;
  
  try {
    // Validation
    if (!resumeContent || !jobDescription) {
      return res.status(400).json({
        error: 'Both resume content and job description are required'
      });
    }

    if (!genAI) {
      return res.status(500).json({
        error: 'AI service not available. Please check API configuration.'
      });
    }

    console.log('🤖 Calling Gemini AI for resume analysis...');

    // Use the correct model name - gemini-pro is stable and available
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Create a prompt for the Gemini model
    const prompt = `
      You are an expert resume analyzer and career coach. Analyze the following resume against the job description.
      
      RESUME:
      ${resumeContent}
      
      JOB DESCRIPTION:
      ${jobDescription}
      
      Perform a detailed analysis and provide the following information in JSON format:
      1. Extract important keywords from the job description
      2. Identify which keywords from the job description are present in the resume
      3. Identify which important keywords from the job description are missing from the resume
      4. Identify technical skills mentioned in the resume
      5. Provide specific recommendations for improving the resume to better match this job
      
      Return ONLY a valid JSON object with these keys:
      {
        "matchingKeywords": ["keyword1", "keyword2", ...],
        "missingKeywords": ["keyword1", "keyword2", ...],
        "technicalSkills": ["skill1", "skill2", ...],
        "recommendations": ["recommendation1", "recommendation2", ...]
      }
    `;

    // Generate content with timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('📤 Gemini Response received:', text.substring(0, 200) + '...');

    // Extract the JSON from the response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      try {
        const analysisResult = JSON.parse(jsonStr.trim());
        
        return res.json({
          success: true,
          matchingKeywords: Array.isArray(analysisResult.matchingKeywords) ? 
            analysisResult.matchingKeywords.slice(0, 20) : [],
          missingKeywords: Array.isArray(analysisResult.missingKeywords) ? 
            analysisResult.missingKeywords.slice(0, 20) : [],
          technicalSkills: Array.isArray(analysisResult.technicalSkills) ? 
            analysisResult.technicalSkills.slice(0, 15) : [],
          recommendations: Array.isArray(analysisResult.recommendations) ? 
            analysisResult.recommendations.slice(0, 10) : []
        });
      } catch (jsonError) {
        console.error('❌ JSON parse error:', jsonError);
        return res.status(500).json({ 
          error: 'Failed to parse analysis results',
          details: 'Invalid JSON response from AI'
        });
      }
    } else {
      console.error('❌ No JSON found in response');
      return res.status(500).json({ 
        error: 'Failed to extract analysis results',
        details: 'AI response format not recognized'
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing resume:', error);
    
    let errorMessage = 'Analysis failed';
    if (error.message.includes('API_KEY_INVALID')) {
      errorMessage = 'Invalid API key configuration';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout - please try with shorter content';
    } else if (error.message.includes('quota')) {
      errorMessage = 'API quota exceeded - please try again later';
    } else if (error.message.includes('PERMISSION_DENIED')) {
      errorMessage = 'API access denied - please check your API key permissions';
    }

    return res.status(500).json({ 
      error: errorMessage,
      details: error.message
    });
  }
});

// Test API key route
router.post('/test-key', auth, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({
        error: 'AI service not available',
        details: 'Gemini API key is not configured'
      });
    }

    console.log('🧪 Testing Gemini API key...');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Say hello in one word");
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      message: 'API key is valid and working!',
      testResponse: text
    });

  } catch (error) {
    console.error('❌ API Key Test Error:', error);
    res.status(500).json({
      error: 'API key test failed',
      details: error.message
    });
  }
});

export default router;