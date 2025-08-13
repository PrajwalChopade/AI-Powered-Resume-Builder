"use client"

import { useState, useRef, createContext, useContext } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"
import axios from 'axios'; // Add this import
// Simple Auth Context (included in the same file)
const AuthContext = createContext({
  isAuthenticated: true, // Default to true for simplicity
  login: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

// Server Action for Gemini API// KeywordAnalyzer.jsx - Replace the Gemini API initialization code

// Remove "use server" directive since this is client-side code
// "use server"  <- Remove this line

async function analyzeResumeWithGemini(resumeContent, jobDescription) {
  try {
    // Get API key from environment variables with proper prefix for client-side
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Gemini API key is not configured in environment variables");
      return {
        matchingKeywords: [],
        missingKeywords: [],
        technicalSkills: [],
        recommendations: [],
        error: "Gemini API key is not configured. Please check your environment settings.",
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Rest of your code remains the same...
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })

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
    `

    // Generate content with Gemini
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract the JSON from the response
    // The response might contain markdown code blocks or other text
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/)

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const analysisResult = JSON.parse(jsonStr.trim())

      return {
        matchingKeywords: analysisResult.matchingKeywords || [],
        missingKeywords: analysisResult.missingKeywords || [],
        technicalSkills: analysisResult.technicalSkills || [],
        recommendations: analysisResult.recommendations || [],
      }
    }

    // If we couldn't parse JSON, try to extract data in a more forgiving way
    try {
      const analysisResult = JSON.parse(text.replace(/```/g, "").trim())

      return {
        matchingKeywords: analysisResult.matchingKeywords || [],
        missingKeywords: analysisResult.missingKeywords || [],
        technicalSkills: analysisResult.technicalSkills || [],
        recommendations: analysisResult.recommendations || [],
      }
    } catch (jsonError) {
      console.error("Failed to parse JSON from Gemini response:", jsonError)

      return {
        matchingKeywords: [],
        missingKeywords: [],
        technicalSkills: [],
        recommendations: [],
        error: "Failed to parse analysis results",
      }
    }
  } catch (error) {
    console.error("Error analyzing resume with Gemini:", error)

    return {
      matchingKeywords: [],
      missingKeywords: [],
      technicalSkills: [],
      recommendations: [],
      error: "Failed to analyze resume. Please try again.",
    }
  }
}

// Main KeywordAnalyzer Component
export default function KeywordAnalyzer() {
  const [resumeContent, setResumeContent] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [keywords, setKeywords] = useState([])
  const [missingKeywords, setMissingKeywords] = useState([])
  const [technicalSkills, setTechnicalSkills] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("paste")
  const fileInputRef = useRef(null)
  const { isAuthenticated } = useAuth()

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setUploadProgress(10)

    try {
      // Read the file as text or use a library to extract text from PDFs/DOCXs
      const reader = new FileReader()

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 50)
          setUploadProgress(progress)
        }
      }

      reader.onload = async (event) => {
        setUploadProgress(60)
        const content = event.target?.result
        setResumeContent(content)
        setUploadProgress(100)

        // Auto-analyze if job description is already provided
        if (jobDescription) {
          await analyzeResume(content, jobDescription)
        } else {
          setLoading(false)
        }
      }

      reader.onerror = () => {
        setError("Error reading file. Please try again.")
        setLoading(false)
      }

      // For simplicity, we're assuming text files. In a real app, you'd use libraries
      // like pdf.js or mammoth.js to extract text from PDFs and DOCXs
      reader.readAsText(file)
    } catch (err) {
      setError("Error processing file. Please try again.")
      console.error(err)
      setLoading(false)
    }
  }

  // const analyzeResume = async (resume, job) => {
  //   if (!resume || !job) {
  //     setError("Please provide both resume content and job description")
  //     return
  //   }

  //   setLoading(true)
  //   setError("")

  //   try {
  //     // Call the server action to analyze with Gemini
  //     const result = await analyzeResumeWithGemini(resume, job)

  //     if (result.error) {
  //       setError(result.error)
  //       return
  //     }

  //     setKeywords(result.matchingKeywords || [])
  //     setMissingKeywords(result.missingKeywords || [])
  //     setTechnicalSkills(result.technicalSkills || [])
  //     setRecommendations(result.recommendations || [])
  //   } catch (err) {
  //     setError("Error analyzing keywords. Please try again.")
  //     console.error(err)
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  // Inside the analyzeResume function in KeywordAnalyzer.jsx
const analyzeResume = async (resume, job) => {
  if (!resume || !job) {
    setError("Please provide both resume content and job description")
    return
  }

  setLoading(true)
  setError("")

  try {
    const token = localStorage.getItem('token');
    
    // Call the backend API instead of using client-side Gemini
    const response = await axios.post('/api/ai/analyze-resume', {
      resumeContent: resume,
      jobDescription: job
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = response.data;

    setKeywords(result.matchingKeywords || [])
    setMissingKeywords(result.missingKeywords || [])
    setTechnicalSkills(result.technicalSkills || [])
    setRecommendations(result.recommendations || [])
  } catch (err) {
    setError(err.response?.data?.error || "Error analyzing keywords. Please try again.")
    console.error(err)
  } finally {
    setLoading(false)
  }
};
  const handleSubmit = async (e) => {
    e.preventDefault()
    await analyzeResume(resumeContent, jobDescription)
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const hasResults = keywords.length > 0 || missingKeywords.length > 0 || recommendations.length > 0

  return (
    <div className="container">
      <h2 className="mb-4">Resume Keyword Analyzer</h2>
      <p className="mb-4">
        Match your resume against job descriptions to identify important keywords using AI analysis
      </p>

      {error && (
        <div className="alert alert-danger mb-4">
          <div className="d-flex">
            <div className="me-2">⚠️</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h5>Resume</h5>
                <p className="card-text">Provide your resume content for analysis</p>
                <ul className="nav nav-tabs card-header-tabs">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "paste" ? "active" : ""}`}
                      onClick={() => setActiveTab("paste")}
                    >
                      Paste Text
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "upload" ? "active" : ""}`}
                      onClick={() => setActiveTab("upload")}
                    >
                      Upload File
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body">
                {activeTab === "paste" ? (
                  <textarea
                    className="form-control"
                    rows="12"
                    placeholder="Paste the content of your resume here..."
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                  ></textarea>
                ) : (
                  <div className="border border-dashed rounded p-4 text-center" style={{ minHeight: "300px" }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.pdf,.docx,.doc"
                      className="d-none"
                    />

                    {loading && uploadProgress < 100 ? (
                      <div className="w-100">
                        <div className="progress mb-2">
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${uploadProgress}%` }}
                            aria-valuenow={uploadProgress}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <p className="text-muted small">Processing file... {uploadProgress}%</p>
                      </div>
                    ) : resumeContent ? (
                      <div className="text-center">
                        <div className="text-success mb-3">✓</div>
                        <p>File uploaded successfully!</p>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={triggerFileUpload}>
                          Upload a different file
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-muted mb-3" style={{ fontSize: "2rem" }}>
                          📄
                        </div>
                        <p className="mb-4 text-muted">Upload your resume file (TXT, PDF, DOCX)</p>
                        <button type="button" onClick={triggerFileUpload} className="btn btn-outline-primary mb-2">
                          Select File
                        </button>
                        <p className="text-muted small">Max file size: 5MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h5>Job Description</h5>
                <p className="card-text">Paste the job description to match against</p>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control"
                  rows="12"
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center my-4">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !resumeContent || !jobDescription}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Analyzing with AI...
              </>
            ) : (
              "Analyze with Gen AI"
            )}
          </button>
        </div>
      </form>

      {hasResults && (
        <div className="card mt-4">
          <div className="card-header">
            <h3>AI Analysis Results</h3>
            <p className="card-text">Powered by Google's Gemini AI</p>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h4 className="text-success">Matching Keywords</h4>
                <div className="mb-4">
                  {keywords.length > 0 ? (
                    keywords.map((keyword, index) => (
                      <span key={index} className="badge bg-success me-2 mb-2">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <p className="text-muted">No matching keywords found.</p>
                  )}
                </div>

                <h4 className="text-primary">Technical Skills Identified</h4>
                <div>
                  {technicalSkills.length > 0 ? (
                    technicalSkills.map((skill, index) => (
                      <span key={index} className="badge bg-primary me-2 mb-2">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-muted">No technical skills identified.</p>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <h4 className="text-danger">Missing Keywords</h4>
                <div>
                  {missingKeywords.length > 0 ? (
                    missingKeywords.map((keyword, index) => (
                      <span key={index} className="badge bg-danger me-2 mb-2">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <p className="text-success fw-bold">Great job! Your resume includes all important keywords.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4>AI Recommendations</h4>
              <ul className="list-group">
                {recommendations.length > 0 ? (
                  recommendations.map((recommendation, index) => (
                    <li key={index} className="list-group-item">
                      {recommendation}
                    </li>
                  ))
                ) : (
                  <li className="list-group-item text-muted">No specific recommendations available.</li>
                )}
              </ul>
            </div>
          </div>
          <div className="card-footer d-flex justify-content-between">
            <p className="text-muted small">Analysis completed {new Date().toLocaleString()}</p>
            <button className="btn btn-outline-secondary" onClick={() => window.print()}>
              Save Results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
