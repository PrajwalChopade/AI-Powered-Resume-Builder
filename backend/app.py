#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Python Flask Backend for Resume Analyzer
Migrated from Node.js/Express to Python/Flask with MongoDB integration
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
import google.generativeai as genai
import os
import io
import re
import json
import time
import bcrypt
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
import uuid
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])  # Allow React frontend

# Get API key, JWT secret, and MongoDB URI from environment
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('REACT_APP_GEMINI_API_KEY')
JWT_SECRET = os.getenv('JWT_SECRET') or 'your-secret-key'  # Should be in .env file
MONGODB_URI = os.getenv('MONGODB_URI')

if not GEMINI_API_KEY:
    print('ERROR: GEMINI_API_KEY missing in .env')
else:
    print(f'SUCCESS: GEMINI_API_KEY loaded: {GEMINI_API_KEY[:10]}...')
    genai.configure(api_key=GEMINI_API_KEY)

if not MONGODB_URI:
    print('ERROR: MONGODB_URI missing in .env')
    exit(1)
else:
    print(f'SUCCESS: MONGODB_URI loaded: {MONGODB_URI[:30]}...')

# MongoDB setup
try:
    client = MongoClient(MONGODB_URI)
    db = client['resume_analyzer']
    
    # Collections
    users_collection = db['users']
    resumes_collection = db['resumes']
    ats_evaluations_collection = db['ats_evaluations']
    
    # Test connection
    client.admin.command('ping')
    print('SUCCESS: Connected to MongoDB successfully')
except Exception as e:
    print(f'ERROR: Failed to connect to MongoDB: {e}')
    exit(1)

# Auth middleware
def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'No token, authorization denied'}), 401
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is not valid'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

# Utility functions
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_jwt(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

# PDF text extractor
def pdf_to_text(pdf_file):
    try:
        pdf_bytes = io.BytesIO(pdf_file.read())
        reader = PdfReader(pdf_bytes)
        text = "".join(page.extract_text() or "" for page in reader.pages)
        return text
    except Exception as e:
        print(f"PDF extraction error: {str(e)}")
        return ""

# Clean resume text
def clean_resume_text(content):
    if not isinstance(content, str):
        content = str(content)
    
    content = re.sub(r'[^\w\s\.,;:()\-@]', ' ', content)
    content = re.sub(r'\s+', ' ', content)
    content = re.sub(r'\n\s*\n', '\n', content)
    
    return content.strip()

# ATS prompt formatting
def get_ats_prompt(resume_text, job_description):
    return f"""Analyze the resume for this role:
Job Description: {job_description}
Resume: {resume_text}

Provide in this exact JSON format:
{{
  "ats_score": 85,
  "matched_skills": ["JavaScript", "React", "Node.js"],
  "missing_skills": ["Python", "AWS"],
  "gap_analysis": ["Add cloud experience", "Include Python projects"],
  "keyword_density": 75,
  "skills_match": 80,
  "experience_match": 90
}}

Return only the JSON, no other text."""

# Parse Gemini response
def parse_gemini_response(response_text):
    try:
        try:
            json_data = json.loads(response_text)
        except json.JSONDecodeError:
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                json_data = json.loads(json_match.group())
            else:
                raise ValueError("No valid JSON in response")
        
        return {
            'atsScore': json_data.get('ats_score', 0),
            'matchedSkills': json_data.get('matched_skills', []),
            'missingSkills': json_data.get('missing_skills', []),
            'gapAnalysis': json_data.get('gap_analysis', ['Unable to analyze']),
            'keywordDensity': json_data.get('keyword_density', 0),
            'skillsMatch': json_data.get('skills_match', 0),
            'experienceMatch': json_data.get('experience_match', 0),
        }
    except Exception as error:
        print(f'Gemini parsing error: {str(error)}')
        print(f'Raw response that failed to parse: {response_text}')
        return {
            'atsScore': 0,
            'matchedSkills': [],
            'missingSkills': [],
            'gapAnalysis': ['Could not parse AI response.'],
            'keywordDensity': 0,
            'skillsMatch': 0,
            'experienceMatch': 0,
        }

# Gemini AI resume analysis
# Optimized combined ATS analysis and improvements in single API call
def get_combined_analysis_prompt(resume_text, job_description):
    # Truncate inputs to prevent overly long prompts
    resume_text = resume_text[:3000] if len(resume_text) > 3000 else resume_text
    job_description = job_description[:2000] if len(job_description) > 2000 else job_description
    
    return f"""You are an expert resume reviewer and career coach for a company called 'Resume Analyser'. Your task is to provide highly specific, actionable feedback to help a user improve their resume for a specific job.

**Resume Content:**
```
{resume_text}
```

**Job Description:**
```
{job_description}
```

**CRITICAL INSTRUCTIONS:**
Your response MUST be a single JSON object. Do not include any text before or after the JSON object.
The JSON object must follow the exact structure specified below.
The goal is to provide "show, don't tell" feedback. Instead of saying "quantify your achievements", you must provide the exact text to change.

**Task:**
Provide a detailed analysis in the following JSON format.

**JSON Output Structure:**
```json
{{
  "ats_analysis": {{
    "atsScore": 78,
    "keywordMatches": ["Python", "Data Analysis", "Machine Learning"],
    "missingSkills": ["TensorFlow", "PyTorch", "AWS"],
    "strengthAreas": ["Strong project experience in data science", "Good use of action verbs"],
    "improvementAreas": ["Quantify achievements with metrics", "Add a dedicated technical skills section"],
    "gapAnalysis": "The resume shows strong foundational skills but lacks specific experience with the cloud technologies (AWS, Azure) and advanced deep learning frameworks (TensorFlow) mentioned in the job description. To be a stronger candidate, the applicant needs to highlight projects or experiences that involve these technologies.",
    "recommendations": ["Integrate keywords like 'TensorFlow' and 'AWS' into project descriptions.", "Update the summary to align with the job title and key requirements."]
  }},
  "specific_improvements": [
    {{
      "section": "Experience",
      "original_text": "Responsible for data cleaning and preprocessing.",
      "improved_text": "Engineered data pipelines that cleaned and preprocessed over 500GB of raw data, improving data quality by 30% and enabling more accurate modeling.",
      "reason": "This is a more powerful description because it uses a strong action verb ('Engineered') and quantifies the impact with specific metrics (500GB, 30%), clearly demonstrating the scale and value of your work.",
      "keywords_added": ["data pipelines", "data quality"],
      "impact_score": 9,
      "category": "Quantification"
    }},
    {{
      "section": "Projects",
      "original_text": "Built a machine learning model to predict customer churn.",
      "improved_text": "Developed and deployed a customer churn prediction model using Scikit-learn and XGBoost with 92% accuracy, which identified at-risk customers and directly informed retention strategies, reducing churn by 15%.",
      "reason": "This is better because it specifies the technologies used (Scikit-learn, XGBoost), provides a quantifiable result (92% accuracy, 15% churn reduction), and shows the business impact of the project.",
      "keywords_added": ["Scikit-learn", "XGBoost", "92% accuracy", "retention strategies"],
      "impact_score": 8,
      "category": "Technical Detail"
    }}
  ],
  "skill_additions": [
    {{
      "skill": "TensorFlow",
      "reason": "The job description explicitly lists TensorFlow as a required skill for deep learning tasks. Adding this to your skills section is crucial.",
      "section_to_add": "Skills"
    }},
    {{
      "skill": "AWS Sagemaker",
      "reason": "Experience with cloud-based machine learning platforms like AWS is a key requirement. If you have experience, add it. If not, consider a small project to learn it.",
      "section_to_add": "Skills"
    }}
  ],
  "improvement_summary": {{
    "current_score": 78,
    "expected_score_after_improvements": 90,
    "improvement_potential": 12,
    "critical_missing_keywords": ["TensorFlow", "AWS", "PyTorch"]
  }}
}}
```

Return ONLY the JSON object. Do not include ```json markdown delimiters or any other text or explanations.
"""

def analyze_resume_with_combined_ai(job_description, resume_text):
    """
    This function is now a wrapper for the new, focused prompt analysis.
    It ensures that all calls to the AI for improvements use the best method.
    """
    print("Redirecting to `analyze_resume_with_new_prompt` for focused suggestions.")
    return analyze_resume_with_new_prompt(job_description, resume_text)



def analyze_resume_with_ai(job_description, resume_text):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = get_ats_prompt(resume_text, job_description)
        
        print('Calling Gemini API...')
        print(f'Using API Key: {GEMINI_API_KEY[:20]}...')
        print('Model: gemini-1.5-flash')
        
        response = model.generate_content(prompt)
        
        print('SUCCESS: Gemini API responded successfully')
        
        ai_text = response.text if response.text else ''
        print(f'Raw AI Response: {ai_text}')
        
        if not ai_text:
            print('ERROR: No text in Gemini response!')
            raise Exception('Empty response from Gemini API')
        
        parsed_results = parse_gemini_response(ai_text)
        print(f'SUCCESS: Parsed results: {json.dumps(parsed_results, indent=2)}')
        
        return parsed_results
        
    except Exception as e:
        print(f'ERROR: Gemini API Error: {str(e)}')
        raise e

# Resume improvement analysis with Gemini AI
def get_new_improvement_prompt(resume_text, job_description):
    """
    A new, highly focused prompt to get specific 'replace this with that' suggestions.
    """
    # Truncate inputs to prevent overly long prompts and improve focus
    resume_text = resume_text[:4000] if len(resume_text) > 4000 else resume_text
    job_description = job_description[:3000] if len(job_description) > 3000 else job_description
    
    return f"""You are an expert resume writer. Your single task is to analyze the provided RESUME against the JOB DESCRIPTION and suggest specific text replacements.

**RESUME:**
```
{resume_text}
```

**JOB DESCRIPTION:**
```
{job_description}
```

**Instructions:**
1.  Read the resume and job description carefully.
2.  Identify phrases in the resume that can be improved to better match the job description.
3.  For each improvement, provide the exact original text and the exact improved text.
4.  The improved text should be more impactful, use keywords from the job description, and quantify results where possible.
5.  Your response MUST be ONLY a JSON object with a single key: "specific_improvements".
6.  Do not include any other analysis, summaries, or explanations.

**JSON Output Format:**
```json
{{
  "specific_improvements": [
    {{
      "section": "Experience",
      "original_text": "Responsible for data cleaning and preprocessing.",
      "improved_text": "Engineered data pipelines that cleaned and preprocessed over 500GB of raw data, improving data quality by 30% and enabling more accurate modeling.",
      "reason": "Quantifies the impact with specific metrics (500GB, 30%) and uses a stronger action verb ('Engineered')."
    }},
    {{
      "section": "Projects",
      "original_text": "Built a machine learning model to predict customer churn.",
      "improved_text": "Developed and deployed a customer churn prediction model using Scikit-learn and XGBoost with 92% accuracy, which directly informed retention strategies and reduced churn by 15%.",
      "reason": "Specifies the technologies used (Scikit-learn, XGBoost), provides a quantifiable result (92% accuracy, 15% churn reduction), and shows the business impact."
    }}
  ]
}}
```

Return ONLY the JSON object.
"""

def clean_and_parse_json(text: str) -> dict:
    """
    Cleans the text response from the AI and parses it into a JSON object.
    Handles markdown code blocks and other common AI response artifacts.
    """
    if not text:
        raise ValueError("Input text is empty.")

    # Find the start of the JSON - handles ```json markdown
    json_start_match = re.search(r'\{', text)
    if not json_start_match:
        raise ValueError("No JSON object found in the response.")
    
    json_start_index = json_start_match.start()
    
    # Find the corresponding closing brace for the JSON object
    open_braces = 0
    json_end_index = -1
    
    # Create a substring starting from the first open brace
    text_from_start = text[json_start_index:]

    for i, char in enumerate(text_from_start):
        if char == '{':
            open_braces += 1
        elif char == '}':
            open_braces -= 1
            if open_braces == 0:
                json_end_index = json_start_index + i + 1
                break
    
    if json_end_index == -1:
        raise ValueError("Could not find a complete JSON object in the response.")

    json_str = text[json_start_index:json_end_index]
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to decode JSON: {e}. Content: '{json_str[:200]}...'")

def analyze_resume_with_new_prompt(job_description, resume_text):
    """
    Uses the new, focused prompt to get suggestions, with retry logic.
    """
    max_retries = 2
    for attempt in range(max_retries):
        start_time = time.time()
        ai_text = ''
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = get_new_improvement_prompt(resume_text, job_description)
            
            print(f'[Attempt {attempt + 1}/{max_retries}] Calling Gemini API with FOCUSED prompt...')
            
            response = model.generate_content(
                prompt,
                generation_config={'temperature': 0.3}
            )
            
            end_time = time.time()
            print(f'SUCCESS: Gemini responded in {end_time - start_time:.2f} seconds')
            
            ai_text = response.text if response.text else ''
            
            if not ai_text:
                raise ValueError('Empty response from Gemini API.')
            
            print("Cleaning and parsing AI response...")
            combined_data = clean_and_parse_json(ai_text)
            print("SUCCESS: AI response parsed successfully.")

            specific_improvements = combined_data.get('specific_improvements', [])
            
            improvements = {
                'specific_improvements': specific_improvements,
                'skill_additions': [],
                'ats_analysis': {'current_score': 0, 'expected_score_after_improvements': 0, 'improvement_potential': 0}
            }
            
            ats_results = {'atsScore': 0, 'matchedSkills': [], 'missingSkills': [], 'gapAnalysis': []}
            
            return ats_results, improvements
            
        except (ValueError, json.JSONDecodeError) as e:
            print(f'ERROR: Parsing failed on attempt {attempt + 1}: {str(e)}')
            print(f'Raw response sample: {ai_text[:500]}...')
            if attempt < max_retries - 1:
                print("Retrying...")
                time.sleep(1)  # Wait a second before retrying
            else:
                print("All retry attempts failed.")
                raise e # Re-raise the exception to be caught by the route handler
        except Exception as e:
            print(f'CRITICAL ERROR during Gemini call on attempt {attempt + 1}: {str(e)}')
            raise e

    # This part should not be reached if logic is correct, but as a fallback:
    print("ERROR: Exited retry loop without success.")
    return {}, {'specific_improvements': [], 'skill_additions': [], 'ats_analysis': {}}


# Helper functions for resume improvement
def format_resume_for_analysis(resume_content):
    """Convert resume JSON data to text for AI analysis"""
    try:
        text_parts = []
        
        # Personal information
        if 'name' in resume_content:
            text_parts.append(f"Name: {resume_content['name']}")
        if 'email' in resume_content:
            text_parts.append(f"Email: {resume_content['email']}")
        if 'phone' in resume_content:
            text_parts.append(f"Phone: {resume_content['phone']}")
        if 'location' in resume_content:
            text_parts.append(f"Location: {resume_content['location']}")
        
        # Summary
        if 'summary' in resume_content and resume_content['summary']:
            text_parts.append(f"Summary: {resume_content['summary']}")
        
        # Experience
        if 'experience' in resume_content and resume_content['experience']:
            text_parts.append("EXPERIENCE:")
            for exp in resume_content['experience']:
                if isinstance(exp, dict):
                    exp_text = f"• {exp.get('position', '')} at {exp.get('company', '')}"
                    if exp.get('startDate') or exp.get('endDate'):
                        exp_text += f" ({exp.get('startDate', '')} - {exp.get('endDate', 'Present')})"
                    if exp.get('description'):
                        exp_text += f": {exp.get('description', '')}"
                    text_parts.append(exp_text)
        
        # Education
        if 'education' in resume_content and resume_content['education']:
            text_parts.append("EDUCATION:")
            for edu in resume_content['education']:
                if isinstance(edu, dict):
                    edu_text = f"• {edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('school', '')}"
                    if edu.get('startDate') or edu.get('endDate'):
                        edu_text += f" ({edu.get('startDate', '')} - {edu.get('endDate', '')})"
                    text_parts.append(edu_text)
        
        # Skills
        if 'skills' in resume_content and resume_content['skills']:
            skills_list = []
            for skill in resume_content['skills']:
                if isinstance(skill, str) and skill.strip():
                    skills_list.append(skill.strip())
            if skills_list:
                text_parts.append(f"SKILLS: {', '.join(skills_list)}")
        
        # Projects
        if 'projects' in resume_content and resume_content['projects']:
            text_parts.append("PROJECTS:")
            for proj in resume_content['projects']:
                if isinstance(proj, dict):
                    proj_text = f"• {proj.get('title', '')}: {proj.get('description', '')}"
                    if proj.get('technologies'):
                        proj_text += f" (Technologies: {proj.get('technologies', '')})"
                    text_parts.append(proj_text)
        
        # Activities
        if 'activities' in resume_content and resume_content['activities']:
            text_parts.append("ACTIVITIES:")
            for act in resume_content['activities']:
                if isinstance(act, dict):
                    act_text = f"• {act.get('title', '')} at {act.get('organization', '')}"
                    if act.get('description'):
                        act_text += f": {act.get('description', '')}"
                    text_parts.append(act_text)
        
        return '\n'.join(text_parts)
        
    except Exception as e:
        print(f'Error formatting resume for analysis: {e}')
        return str(resume_content)

def apply_improvements_to_resume(resume_content, improvements_data):
    """Apply specific text improvements to resume content"""
    try:
        updated_content = resume_content.copy()
        improvements_applied = []
        
        # Extract improvements from the new format
        specific_improvements = improvements_data.get('specific_improvements', [])
        skill_additions = improvements_data.get('skill_additions', [])
        
        print(f'Applying {len(specific_improvements)} specific text improvements...')
        
        # Apply specific text replacements
        for improvement in specific_improvements:
            section = improvement.get('section', '')
            original_text = improvement.get('original_text', '')
            improved_text = improvement.get('improved_text', '')
            
            if not original_text or not improved_text:
                continue
            
            improvement_applied = False
            
            # Apply improvements based on section
            if section == 'experience' and 'experience' in updated_content:
                for i, exp in enumerate(updated_content['experience']):
                    if isinstance(exp, dict):
                        # Check in job description/responsibilities
                        if 'description' in exp and isinstance(exp['description'], str):
                            if original_text.lower() in exp['description'].lower():
                                # Find exact match (case insensitive) and replace
                                updated_description = re.sub(
                                    re.escape(original_text), 
                                    improved_text, 
                                    exp['description'], 
                                    flags=re.IGNORECASE
                                )
                                updated_content['experience'][i]['description'] = updated_description
                                improvement_applied = True
                                print(f'Applied experience improvement: {original_text[:50]}... -> {improved_text[:50]}...')
                        
                        # Check in responsibilities array
                        if 'responsibilities' in exp and isinstance(exp['responsibilities'], list):
                            for j, resp in enumerate(exp['responsibilities']):
                                if isinstance(resp, str) and original_text.lower() in resp.lower():
                                    updated_resp = re.sub(
                                        re.escape(original_text), 
                                        improved_text, 
                                        resp, 
                                        flags=re.IGNORECASE
                                    )
                                    updated_content['experience'][i]['responsibilities'][j] = updated_resp
                                    improvement_applied = True
                                    print(f'Applied responsibility improvement: {original_text[:50]}...')
            
            elif section == 'summary' and 'summary' in updated_content:
                if isinstance(updated_content['summary'], str) and original_text.lower() in updated_content['summary'].lower():
                    updated_content['summary'] = re.sub(
                        re.escape(original_text), 
                        improved_text, 
                        updated_content['summary'], 
                        flags=re.IGNORECASE
                    )
                    improvement_applied = True
                    print(f'Applied summary improvement: {original_text[:50]}...')
            
            elif section == 'projects' and 'projects' in updated_content:
                for i, proj in enumerate(updated_content['projects']):
                    if isinstance(proj, dict) and 'description' in proj:
                        if isinstance(proj['description'], str) and original_text.lower() in proj['description'].lower():
                            updated_content['projects'][i]['description'] = re.sub(
                                re.escape(original_text), 
                                improved_text, 
                                proj['description'], 
                                flags=re.IGNORECASE
                            )
                            improvement_applied = True
                            print(f'Applied project improvement: {original_text[:50]}...')
            
            elif section == 'education' and 'education' in updated_content:
                for i, edu in enumerate(updated_content['education']):
                    if isinstance(edu, dict) and 'description' in edu:
                        if isinstance(edu['description'], str) and original_text.lower() in edu['description'].lower():
                            updated_content['education'][i]['description'] = re.sub(
                                re.escape(original_text), 
                                improved_text, 
                                edu['description'], 
                                flags=re.IGNORECASE
                            )
                            improvement_applied = True
                            print(f'Applied education improvement: {original_text[:50]}...')
            
            if improvement_applied:
                improvements_applied.append({
                    'section': section,
                    'original_text': original_text,
                    'improved_text': improved_text,
                    'reason': improvement.get('reason', ''),
                    'keywords_added': improvement.get('keywords_added', [])
                })
        
        # Add new skills
        print(f'Adding {len(skill_additions)} new skills...')
        if skill_additions and 'skills' in updated_content:
            current_skills = updated_content['skills'] if isinstance(updated_content['skills'], list) else []
            # Remove empty skills and normalize
            current_skills = [skill.strip() for skill in current_skills if skill and skill.strip()]
            
            for skill_addition in skill_additions:
                skill_name = skill_addition.get('skill', '') if isinstance(skill_addition, dict) else str(skill_addition)
                if skill_name and skill_name.strip():
                    skill_name = skill_name.strip()
                    # Check if skill already exists (case insensitive)
                    if skill_name.lower() not in [s.lower() for s in current_skills]:
                        current_skills.append(skill_name)
                        print(f'Added new skill: {skill_name}')
            
            updated_content['skills'] = current_skills
        elif skill_additions and 'skills' not in updated_content:
            # Create skills section if it doesn't exist
            new_skills = []
            for skill_addition in skill_additions:
                skill_name = skill_addition.get('skill', '') if isinstance(skill_addition, dict) else str(skill_addition)
                if skill_name and skill_name.strip():
                    new_skills.append(skill_name.strip())
            
            if new_skills:
                updated_content['skills'] = new_skills
                print(f'Created skills section with {len(new_skills)} new skills')
        
        print(f'Successfully applied {len(improvements_applied)} improvements and {len(skill_additions)} skill additions')
        return updated_content, improvements_applied
        
    except Exception as e:
        print(f'Error applying improvements: {e}')
        import traceback
        traceback.print_exc()
        return resume_content, []

# Routes

# Basic route for testing
@app.route('/', methods=['GET'])
def home():
    return 'ATS API is running - Upload a resume for analysis'

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'api_key_loaded': bool(GEMINI_API_KEY)})

# Auth routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        # Validate input
        if not name or not email or not password:
            return jsonify({'message': 'Please enter all fields'}), 400
        
        # Check for existing user
        existing_user = users_collection.find_one({'email': email})
        if existing_user:
            return jsonify({'message': 'User already exists'}), 400
        
        # Hash password and create user
        hashed_password = hash_password(password)
        
        user_doc = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.utcnow()
        }
        
        result = users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Generate JWT token
        token = generate_jwt(user_id)
        
        return jsonify({
            'token': token,
            'user': {
                'id': user_id,
                'name': name,
                'email': email
            }
        }), 201
        
    except Exception as e:
        print(f'Registration error: {str(e)}')
        return jsonify({'message': 'Server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        # Validate input
        if not email or not password:
            return jsonify({'message': 'Please enter all fields'}), 400
        
        # Check user exists and verify password
        user = users_collection.find_one({'email': email})
        
        if not user or not check_password(password, user['password']):
            return jsonify({'message': 'Invalid credentials'}), 400
        
        # Generate JWT token
        user_id = str(user['_id'])
        token = generate_jwt(user_id)
        
        return jsonify({
            'token': token,
            'user': {
                'id': user_id,
                'name': user['name'],
                'email': user['email']
            }
        })
        
    except Exception as e:
        print(f'Login error: {str(e)}')
        return jsonify({'message': 'Server error'}), 500

# ATS evaluation route
@app.route('/api/ats/evaluate', methods=['POST'])
def evaluate_resume():
    try:
        # Get job description from form data
        job_description = request.form.get('jobDescription')
        
        # Get uploaded file
        if 'resume' not in request.files:
            return jsonify({'msg': 'No resume file uploaded'}), 400
        
        resume_file = request.files['resume']
        
        if not job_description or not resume_file:
            return jsonify({'msg': 'Resume file and Job Description are required.'}), 400
        
        print('Processing PDF file...')
        
        # Parse the PDF file to get text
        resume_content = pdf_to_text(resume_file)
        cleaned_resume = clean_resume_text(resume_content)
        
        if not cleaned_resume:
            return jsonify({'msg': 'Could not extract text from PDF. Please use a text-based PDF.'}), 400
        
        print(f'SUCCESS: PDF processed, text length: {len(cleaned_resume)}')
        
        # Analyze with Gemini
        parsed_results = analyze_resume_with_ai(job_description, cleaned_resume)
        
        # Store in database if user is authenticated (optional)
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
                payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
                user_id = payload['user_id']
                
                # Store evaluation in MongoDB
                evaluation_doc = {
                    'user_id': ObjectId(user_id),
                    'resume_content': cleaned_resume[:1000],  # Store first 1000 chars
                    'job_description': job_description[:1000],  # Store first 1000 chars
                    'results': parsed_results,
                    'created_at': datetime.utcnow()
                }
                
                ats_evaluations_collection.insert_one(evaluation_doc)
                
            except Exception as auth_error:
                print(f'Auth error during evaluation save: {auth_error}')
                pass  # Continue without saving if auth fails
        
        # Send results back to client
        return jsonify({
            'success': True,
            'results': parsed_results,
            'resumeText': cleaned_resume  # Include resume text for improvement feature
        })
        
    except Exception as err:
        print('ERROR: ATS Evaluation Failed:')
        print(f'Error message: {str(err)}')
        
        return jsonify({
            'msg': 'Server Error',
            'error': str(err),
            'details': str(err)
        }), 500

# AI analysis routes
@app.route('/api/ai/analyze-resume', methods=['POST'])
@auth_required
def analyze_resume():
    try:
        data = request.get_json()
        resume_text = data.get('resumeText')
        job_description = data.get('jobDescription')
        
        if not resume_text or not job_description:
            return jsonify({'message': 'Resume text and job description are required'}), 400
        
        # Use the same analysis function as ATS
        results = analyze_resume_with_ai(job_description, resume_text)
        
        return jsonify({
            'success': True,
            'analysis': results
        })
        
    except Exception as e:
        print(f'Resume analysis error: {str(e)}')
        return jsonify({'message': 'Analysis failed', 'error': str(e)}), 500

@app.route('/api/ai/test-key', methods=['POST'])
@auth_required
def test_api_key():
    try:
        if not GEMINI_API_KEY:
            return jsonify({'valid': False, 'error': 'No API key configured'}), 400
        
        # Test with a simple prompt
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Say 'API key is working' if you can see this.")
        
        return jsonify({
            'valid': True,
            'message': 'API key is working',
            'response': response.text
        })
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 400

# Resume improvement routes
@app.route('/api/ai/improve-resume', methods=['POST'])
@auth_required
def improve_resume():
    try:
        data = request.get_json()
        resume_id = data.get('resumeId')
        job_description = data.get('jobDescription')
        
        if not resume_id or not job_description:
            return jsonify({'message': 'Resume ID and job description are required'}), 400
        
        try:
            resume_object_id = ObjectId(resume_id)
        except Exception:
            return jsonify({'message': 'Invalid Resume ID format'}), 400

        resume = resumes_collection.find_one({
            '_id': resume_object_id,
            'user_id': ObjectId(request.user_id)
        })
        
        if not resume:
            return jsonify({'message': 'Resume not found'}), 404
        
        resume_content = resume.get('content', '')
        if isinstance(resume_content, dict):
            resume_text = format_resume_for_analysis(resume_content)
        else:
            resume_text = resume_content
        
        print('Analyzing saved resume with NEW FOCUSED prompt...')
        ats_results, improvements = analyze_resume_with_new_prompt(job_description, resume_text)
        
        # Ensure the response has the expected structure even on partial failure
        if not isinstance(ats_results, dict):
            ats_results = {}
        if not isinstance(improvements, dict):
            improvements = {'specific_improvements': [], 'skill_additions': [], 'ats_analysis': {}}

        return jsonify({
            'success': True,
            'current_analysis': ats_results,
            'improvements': improvements
        })
        
    except Exception as e:
        print(f'Resume improvement error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to analyze improvements', 'error': str(e)}), 500

# Simple test endpoint
@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({'message': 'Server is working', 'timestamp': datetime.utcnow().isoformat()})

# DEBUG: Temporary endpoint without auth for testing
@app.route('/api/ai/debug-improve-uploaded-resume', methods=['POST'])
def debug_improve_uploaded_resume():
    """DEBUG: Handle improvement without auth to isolate the 500 error"""
    print("🐛 DEBUG: Entering debug endpoint")
    try:
        data = request.get_json()
        print(f"🐛 DEBUG: Got request data: {list(data.keys()) if data else 'None'}")
        
        # Handle both camelCase and snake_case for compatibility
        resume_text = data.get('resumeText') or data.get('resume_text') if data else None
        job_description = data.get('jobDescription') or data.get('job_description') if data else None
        resume_title = data.get('resumeTitle', 'Uploaded Resume') if data else 'Default'
        
        print(f"🐛 DEBUG: Resume text length: {len(resume_text) if resume_text else 0}")
        print(f"🐛 DEBUG: Job desc length: {len(job_description) if job_description else 0}")
        
        if not resume_text or not job_description:
            print("🐛 DEBUG: Missing required fields")
            return jsonify({'message': 'Resume text and job description are required'}), 400
        
        print('🐛 DEBUG: About to call analyze_resume_with_combined_ai')
        # Use the combined analysis function
        ats_results, improvements = analyze_resume_with_combined_ai(job_description, resume_text)
        print('🐛 DEBUG: analyze_resume_with_combined_ai completed successfully')
        
        return jsonify({
            'success': True,
            'debug': True,
            'current_analysis': ats_results,
            'improvements': improvements,
            'message': 'Debug endpoint worked successfully'
        })
        
    except Exception as e:
        print(f'🐛 DEBUG: Exception occurred: {str(e)}')
        print(f'🐛 DEBUG: Exception type: {type(e).__name__}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'debug': True,
            'error': str(e),
            'error_type': type(e).__name__,
            'message': 'Debug endpoint caught an exception'
        }), 500

@app.route('/api/ai/improve-uploaded-resume', methods=['POST'])
@auth_required
def improve_uploaded_resume():
    """Handle improvement of uploaded resume files from ATS checker - NEW FOCUSED PROMPT"""
    try:
        data = request.get_json()
        resume_text = data.get('resumeText')
        job_description = data.get('jobDescription')
        
        if not resume_text or not job_description:
            return jsonify({'message': 'Resume text and job description are required'}), 400
        
        print(f'Analyzing uploaded resume with NEW FOCUSED prompt: {len(resume_text)} characters')
        
        ats_results, improvements = analyze_resume_with_new_prompt(job_description, resume_text)

        # Ensure the response has the expected structure even on partial failure
        if not isinstance(ats_results, dict):
            ats_results = {}
        if not isinstance(improvements, dict):
            improvements = {'specific_improvements': [], 'skill_additions': [], 'ats_analysis': {}}
        
        return jsonify({
            'success': True,
            'current_analysis': ats_results,
            'improvements': improvements
        })
        
    except Exception as e:
        print(f'Uploaded resume improvement error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to analyze improvements', 'error': str(e)}), 500

# REMOVED: Implementation routes as per user request to only show analysis without auto-implementation
# @app.route('/api/ai/implement-improvements', methods=['POST'])
# @app.route('/api/ai/implement-uploaded-improvements', methods=['POST'])
# def implement_improvements():
#     Implementation functionality removed per user request
        print(f'Selected improvements count: {len(selected_improvements)}')
        
        if not resume_id:
            return jsonify({'message': 'Resume ID is required'}), 400
        
        if not selected_improvements and not improvements_data:
            return jsonify({'message': 'No improvements selected'}), 400
        
        # Get current resume
        resume = resumes_collection.find_one({
            '_id': ObjectId(resume_id),
            'user_id': ObjectId(request.user_id)
        })
        
        if not resume:
            return jsonify({'message': 'Resume not found'}), 404
        
        # Get current resume content
        resume_content = resume.get('content', {})
        
        if not isinstance(resume_content, dict):
            return jsonify({'message': 'Invalid resume format'}), 400
        
        # Prepare improvements data for application
        improvements_to_apply = {
            'specific_improvements': [],
            'skill_additions': []
        }
        
        # If we have the full improvements data, filter by selected indices
        if improvements_data and 'specific_improvements' in improvements_data:
            all_improvements = improvements_data.get('specific_improvements', [])
            all_skills = improvements_data.get('skill_additions', [])
            
            # Apply selected specific improvements
            for index in selected_improvements:
                if isinstance(index, int) and 0 <= index < len(all_improvements):
                    improvements_to_apply['specific_improvements'].append(all_improvements[index])
            
            # Add all skill additions if any improvements are selected
            if selected_improvements:
                improvements_to_apply['skill_additions'] = all_skills
        
        # Apply improvements to resume content
        updated_content, applied_improvements = apply_improvements_to_resume(resume_content, improvements_to_apply)
        
        # Create improved resume title
        current_title = resume.get('title', 'Resume')
        if '- Improved' not in current_title:
            new_title = f"{current_title} - Improved"
        else:
            # If already improved, add version number
            import time
            version_suffix = f"v{int(time.time() % 10000)}"
            new_title = f"{current_title.replace('- Improved', '')} - Improved {version_suffix}".strip()
        
        # Create new resume document
        new_resume_doc = {
            'user_id': ObjectId(request.user_id),
            'title': new_title,
            'content': updated_content,
            'structured_data': updated_content if isinstance(updated_content, dict) else {},  # Required by GET endpoint
            'keywords': resume.get('keywords', []),  # Copy from original
            'ats_score': resume.get('ats_score', 0),  # Copy from original
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),  # Required by GET endpoint
            'version': resume.get('version', 1) + 1,
            'is_active': True,  # Required by GET endpoint
            'original_resume_id': ObjectId(resume_id),
            'improvements_applied': applied_improvements,
            'total_improvements_count': len(applied_improvements),
            'skill_additions_count': len(improvements_to_apply.get('skill_additions', [])),
            'is_improved_version': True,
            'metadata': {  # Required by GET endpoint
                'template': resume.get('metadata', {}).get('template', 'modern'),
                'color': resume.get('metadata', {}).get('color', '#0d6efd'),
                'font': resume.get('metadata', {}).get('font', 'Inter'),
                'sections_completed': resume.get('metadata', {}).get('sections_completed', 4),
                'total_sections': 5,
                'completion_percentage': min(resume.get('metadata', {}).get('completion_percentage', 80) + 10, 100),  # Boost by 10%
                'is_improved': True,
                'improvement_source': 'ai_saved_resume'
            },
            'improvement_metadata': {
                'selected_improvement_indices': selected_improvements,
                'applied_at': datetime.utcnow().isoformat(),
                'categories_improved': list(set([imp.get('category', 'general') for imp in applied_improvements]))
            }
        }
        
        result = resumes_collection.insert_one(new_resume_doc)
        
        # Return detailed response
        return jsonify({
            'success': True,
            'message': f'Successfully applied {len(applied_improvements)} improvements',
            'new_resume_id': str(result.inserted_id),
            'new_resume': {
                'id': str(result.inserted_id),
                'title': new_title,
                'content': updated_content,
                'created_at': datetime.utcnow().isoformat(),
                'improvements_applied': len(applied_improvements),
                'skills_added': len(improvements_to_apply.get('skill_additions', []))
            },
            'improvements_summary': {
                'total_applied': len(applied_improvements),
                'skills_added': len(improvements_to_apply.get('skill_additions', [])),
                'categories': list(set([imp.get('category', 'general') for imp in applied_improvements])),
                'sections_updated': list(set([imp.get('section', 'unknown') for imp in applied_improvements]))
            }
        })
        
    except Exception as e:
        print(f'Implement improvements error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to implement improvements', 'error': str(e)}), 500

# REMOVED: Implementation route as per user request to only show analysis without auto-implementation
# @app.route('/api/ai/implement-uploaded-improvements', methods=['POST'])
@auth_required
def implement_uploaded_improvements():
    """Handle implementation of improvements for uploaded resume files"""
    try:
        data = request.get_json()
        improvement_id = data.get('improvementId')
        selected_improvements = data.get('selectedImprovements', [])
        improvements_data = data.get('improvementsData', {})
        resume_title = data.get('resumeTitle', 'Improved Resume')
        
        print(f'Implementing improvements for uploaded resume')
        print(f'Selected improvements count: {len(selected_improvements)}')
        
        if not improvement_id:
            return jsonify({'message': 'Improvement ID is required'}), 400
        
        if not selected_improvements and not improvements_data:
            return jsonify({'message': 'No improvements selected'}), 400
        
        # Get the improvement analysis from database
        improvement_analysis = db['resume_improvements'].find_one({
            '_id': ObjectId(improvement_id),
            'user_id': ObjectId(request.user_id)
        })
        
        if not improvement_analysis:
            return jsonify({'message': 'Improvement analysis not found'}), 404
        
        # Get the original resume text
        resume_text = improvement_analysis.get('resume_text', '')
        if not resume_text:
            return jsonify({'message': 'Original resume text not found'}), 400
        
        # Convert resume text to structured format for improvement application
        # This is a simplified conversion - in production you might want more sophisticated parsing
        resume_content = {
            'summary': '',  # Will be populated from resume text
            'experience': [],
            'education': [],
            'skills': [],
            'projects': [],
            'raw_text': resume_text
        }
        
        # Basic parsing of resume text to extract sections
        lines = resume_text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Simple heuristic to identify sections
            if 'experience' in line.lower() and len(line) < 50:
                current_section = 'experience'
                continue
            elif 'education' in line.lower() and len(line) < 50:
                current_section = 'education'
                continue
            elif 'skills' in line.lower() and len(line) < 50:
                current_section = 'skills'
                continue
            elif 'project' in line.lower() and len(line) < 50:
                current_section = 'projects'
                continue
            elif 'summary' in line.lower() and len(line) < 50:
                current_section = 'summary'
                continue
            
            # Add content to appropriate section
            if current_section == 'experience':
                resume_content['experience'].append({'description': line})
            elif current_section == 'education':
                resume_content['education'].append({'description': line})
            elif current_section == 'skills':
                # Split skills by comma
                skills = [skill.strip() for skill in line.split(',') if skill.strip()]
                resume_content['skills'].extend(skills)
            elif current_section == 'projects':
                resume_content['projects'].append({'description': line})
            elif current_section == 'summary':
                resume_content['summary'] = line
        
        # Prepare improvements data for application
        improvements_to_apply = {
            'specific_improvements': [],
            'skill_additions': []
        }
        
        # If we have the full improvements data, filter by selected indices
        if improvements_data and 'specific_improvements' in improvements_data:
            all_improvements = improvements_data.get('specific_improvements', [])
            all_skills = improvements_data.get('skill_additions', [])
            
            # Apply selected specific improvements
            for index in selected_improvements:
                if isinstance(index, int) and 0 <= index < len(all_improvements):
                    improvements_to_apply['specific_improvements'].append(all_improvements[index])
            
            # Add all skill additions if any improvements are selected
            if selected_improvements:
                improvements_to_apply['skill_additions'] = all_skills
        
        # Apply improvements to resume content
        updated_content, applied_improvements = apply_improvements_to_resume(resume_content, improvements_to_apply)
        
        # Create improved resume title
        if '- Improved' not in resume_title:
            new_title = f"{resume_title} - Improved"
        else:
            # If already improved, add version number
            import time
            version_suffix = f"v{int(time.time() % 10000)}"
            new_title = f"{resume_title.replace('- Improved', '')} - Improved {version_suffix}".strip()
        
        # Parse content to create structured data for the new resume
        try:
            if isinstance(updated_content, str):
                # If content is a string, create basic structured data
                structured_content = {
                    'summary': resume_content.get('summary', ''),
                    'experience': resume_content.get('experience', []),
                    'education': resume_content.get('education', []),
                    'skills': resume_content.get('skills', []),
                    'projects': resume_content.get('projects', []),
                    'layout': {
                        'template': 'modern',
                        'color': '#0d6efd',
                        'font': 'Inter'
                    }
                }
                content_to_save = json.dumps(structured_content)
            else:
                structured_content = updated_content
                content_to_save = json.dumps(updated_content)
        except Exception as e:
            print(f'Error parsing content: {e}')
            structured_content = {'raw_content': str(updated_content)}
            content_to_save = str(updated_content)
        
        # Create new resume document in user's collection
        new_resume_doc = {
            'user_id': ObjectId(request.user_id),
            'title': new_title,
            'content': content_to_save,
            'structured_data': structured_content,  # Required by GET endpoint
            'keywords': resume_content.get('skills', [])[:10],  # Use skills as keywords
            'ats_score': 0,  # Will be calculated when user runs ATS analysis
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),  # Required by GET endpoint
            'version': 1,
            'is_active': True,  # Required by GET endpoint
            'improvements_applied': applied_improvements,
            'total_improvements_count': len(applied_improvements),
            'skill_additions_count': len(improvements_to_apply.get('skill_additions', [])),
            'is_improved_version': True,
            'was_uploaded_file': True,
            'metadata': {  # Required by GET endpoint
                'template': structured_content.get('layout', {}).get('template', 'modern'),
                'color': structured_content.get('layout', {}).get('color', '#0d6efd'),
                'font': structured_content.get('layout', {}).get('font', 'Inter'),
                'sections_completed': len([s for s in ['summary', 'experience', 'education', 'skills'] if structured_content.get(s)]),
                'total_sections': 5,
                'completion_percentage': 80,  # Default to 80% for improved resumes
                'is_improved': True,
                'improvement_source': 'ai_uploaded_resume'
            },
            'improvement_metadata': {
                'selected_improvement_indices': selected_improvements,
                'applied_at': datetime.utcnow().isoformat(),
                'categories_improved': list(set([imp.get('category', 'general') for imp in applied_improvements])),
                'original_improvement_id': improvement_id
            }
        }
        
        result = resumes_collection.insert_one(new_resume_doc)
        
        # Return detailed response
        return jsonify({
            'success': True,
            'message': f'Successfully applied {len(applied_improvements)} improvements and saved to your resumes',
            'new_resume_id': str(result.inserted_id),
            'new_resume': {
                'id': str(result.inserted_id),
                'title': new_title,
                'content': updated_content,
                'created_at': datetime.utcnow().isoformat(),
                'improvements_applied': len(applied_improvements),
                'skills_added': len(improvements_to_apply.get('skill_additions', []))
            },
            'improvements_summary': {
                'total_applied': len(applied_improvements),
                'skills_added': len(improvements_to_apply.get('skill_additions', [])),
                'categories': list(set([imp.get('category', 'general') for imp in applied_improvements])),
                'sections_updated': list(set([imp.get('section', 'unknown') for imp in applied_improvements]))
            }
        })
        
    except Exception as e:
        print(f'Implement uploaded improvements error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to implement improvements', 'error': str(e)}), 500

# Resume management routes (comprehensive MongoDB implementation)
@app.route('/api/resume/create', methods=['POST'])
@auth_required
def create_resume():
    try:
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        keywords = data.get('keywords', [])
        resume_id = data.get('resumeId')  # For updates
        
        if not title or not content:
            return jsonify({'message': 'Title and content are required'}), 400
        
        user_id = ObjectId(request.user_id)
        
        # Parse content to extract structured data
        try:
            content_data = json.loads(content) if isinstance(content, str) else content
        except json.JSONDecodeError:
            content_data = {'raw_content': content}
        
        resume_doc = {
            'user_id': user_id,
            'title': title,
            'content': content,
            'structured_data': content_data,  # Store parsed resume data
            'keywords': keywords,
            'ats_score': data.get('atsScore', 0),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'version': 1,
            'is_active': True,
            'metadata': {
                'template': content_data.get('layout', {}).get('template', 'modern'),
                'color': content_data.get('layout', {}).get('color', '#0d6efd'),
                'font': content_data.get('layout', {}).get('font', 'Inter'),
                'sections_completed': _count_completed_sections(content_data),
                'total_sections': 5,
                'completion_percentage': _calculate_completion_percentage(content_data)
            }
        }
        
        if resume_id:
            # Update existing resume
            try:
                existing_resume = resumes_collection.find_one({'_id': ObjectId(resume_id), 'user_id': user_id})
                if not existing_resume:
                    return jsonify({'message': 'Resume not found'}), 404
                
                resume_doc['version'] = existing_resume.get('version', 1) + 1
                resume_doc['created_at'] = existing_resume.get('created_at', datetime.utcnow())
                
                resumes_collection.replace_one({'_id': ObjectId(resume_id)}, resume_doc)
                return jsonify({
                    '_id': resume_id,
                    'message': 'Resume updated successfully',
                    'version': resume_doc['version']
                }), 200
                
            except Exception as e:
                return jsonify({'message': 'Invalid resume ID'}), 400
        else:
            # Create new resume
            result = resumes_collection.insert_one(resume_doc)
            return jsonify({
                '_id': str(result.inserted_id),
                'message': 'Resume created successfully',
                'version': 1
            }), 201
        
    except Exception as e:
        print(f'Create/Update resume error: {str(e)}')
        return jsonify({'message': 'Failed to save resume', 'error': str(e)}), 500

@app.route('/api/resumes', methods=['GET'])
@auth_required
def get_user_resumes():
    try:
        user_id = ObjectId(request.user_id)
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '')
        
        # Build query
        query = {'user_id': user_id, 'is_active': True}
        if search:
            query['$or'] = [
                {'title': {'$regex': search, '$options': 'i'}},
                {'keywords': {'$in': [search]}}
            ]
        
        # Get total count
        total = resumes_collection.count_documents(query)
        
        # Get resumes with pagination
        resumes = resumes_collection.find(query).sort('updated_at', -1).skip((page - 1) * limit).limit(limit)
        
        result = []
        for resume in resumes:
            # Extract basic info from structured data
            structured_data = resume.get('structured_data', {})
            
            result.append({
                'id': str(resume['_id']),
                'title': resume['title'],
                'created_at': resume['created_at'].isoformat(),
                'updated_at': resume['updated_at'].isoformat(),
                'version': resume.get('version', 1),
                'ats_score': resume.get('ats_score', 0),
                'keywords': resume.get('keywords', []),
                'metadata': resume.get('metadata', {}),
                'preview': {
                    'name': structured_data.get('name', ''),
                    'email': structured_data.get('email', ''),
                    'phone': structured_data.get('phone', ''),
                    'summary': structured_data.get('summary', '')[:100] + '...' if structured_data.get('summary', '') else '',
                    'template': structured_data.get('layout', {}).get('template', 'modern'),
                    'color': structured_data.get('layout', {}).get('color', '#0d6efd')
                }
            })
        
        response = jsonify({
            'resumes': result,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
        
        # Add no-cache headers to ensure fresh data
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
        
    except Exception as e:
        print(f'Get resumes error: {str(e)}')
        return jsonify({'message': 'Failed to fetch resumes', 'error': str(e)}), 500

@app.route('/api/resume/<resume_id>', methods=['GET'])
@auth_required
def get_resume_details(resume_id):
    try:
        user_id = ObjectId(request.user_id)
        
        resume = resumes_collection.find_one({
            '_id': ObjectId(resume_id),
            'user_id': user_id,
            'is_active': True
        })
        
        if not resume:
            return jsonify({'message': 'Resume not found'}), 404
        
        return jsonify({
            'id': str(resume['_id']),
            'title': resume['title'],
            'content': resume['content'],
            'structured_data': resume.get('structured_data', {}),
            'keywords': resume.get('keywords', []),
            'ats_score': resume.get('ats_score', 0),
            'created_at': resume['created_at'].isoformat(),
            'updated_at': resume['updated_at'].isoformat(),
            'version': resume.get('version', 1),
            'metadata': resume.get('metadata', {})
        })
        
    except Exception as e:
        print(f'Get resume details error: {str(e)}')
        return jsonify({'message': 'Failed to fetch resume details', 'error': str(e)}), 500

@app.route('/api/resume/<resume_id>', methods=['DELETE'])
@auth_required
def delete_resume(resume_id):
    try:
        user_id = ObjectId(request.user_id)
        
        result = resumes_collection.update_one(
            {'_id': ObjectId(resume_id), 'user_id': user_id},
            {'$set': {'is_active': False, 'deleted_at': datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return jsonify({'message': 'Resume not found'}), 404
        
        return jsonify({'message': 'Resume deleted successfully'})
        
    except Exception as e:
        print(f'Delete resume error: {str(e)}')
        return jsonify({'message': 'Failed to delete resume', 'error': str(e)}), 500

# Helper functions for resume management
def _count_completed_sections(content_data):
    """Count completed sections in resume data"""
    if not content_data:
        return 0
    
    count = 0
    
    # Personal info
    if content_data.get('name') and content_data.get('email'):
        count += 1
    
    # Education
    if content_data.get('education') and any(edu.get('school') and edu.get('degree') for edu in content_data['education']):
        count += 1
    
    # Experience
    if content_data.get('experience') and any(exp.get('company') and exp.get('position') for exp in content_data['experience']):
        count += 1
    
    # Skills
    if content_data.get('skills') and any(skill.strip() for skill in content_data['skills'] if skill):
        count += 1
    
    # Projects
    if content_data.get('projects') and any(proj.get('title') for proj in content_data['projects']):
        count += 1
    
    return count

def _calculate_completion_percentage(content_data):
    """Calculate completion percentage of resume"""
    completed = _count_completed_sections(content_data)
    total = 5  # Total sections: personal, education, experience, skills, projects
    return (completed / total) * 100 if total > 0 else 0

def _generate_resume_html(resume_data):
    """Generate HTML for PDF conversion with exact styling"""
    layout = resume_data.get('layout', {})
    template = layout.get('template', 'modern')
    primary_color = layout.get('color', '#0d6efd')
    font_family = layout.get('font', 'Inter')
    
    # Template-specific styles
    templates = {
        'modern': {
            'section_title_style': f'border-bottom: 2px solid {primary_color}; padding-bottom: 8px; margin-bottom: 16px; color: {primary_color}; font-size: 1.2rem; font-weight: 600;',
            'name_style': f'font-size: 2.5rem; font-weight: 700; color: {primary_color}; margin-bottom: 0;',
            'header_bg': 'transparent'
        },
        'classic': {
            'section_title_style': 'border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 16px; font-family: serif; font-size: 1.2rem; font-weight: 600;',
            'name_style': 'font-size: 2.2rem; font-weight: 700; font-family: serif; margin-bottom: 0;',
            'header_bg': 'transparent'
        },
        'minimal': {
            'section_title_style': f'margin-bottom: 16px; color: {primary_color}; text-transform: uppercase; font-size: 1rem; letter-spacing: 2px; font-weight: 600;',
            'name_style': 'font-size: 2rem; font-weight: 300; color: #333; margin-bottom: 0;',
            'header_bg': 'transparent'
        },
        'professional': {
            'section_title_style': f'background-color: {primary_color}; color: white; padding: 6px 12px; margin-bottom: 16px; font-size: 1.2rem; font-weight: 600;',
            'name_style': 'font-size: 2.2rem; font-weight: 600; color: #333; margin-bottom: 0;',
            'header_bg': primary_color,
            'header_text_color': 'white',
            'header_padding': '20px'
        }
    }
    
    selected_template = templates.get(template, templates['modern'])
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{resume_data.get('name', 'Resume')}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family={font_family.replace(' ', '+')}:wght@300;400;500;600;700&display=swap');
            
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: '{font_family}', Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
                max-width: 850px;
                margin: 0 auto;
                padding: 20px;
            }}
            
            .header {{
                text-align: center;
                margin-bottom: 40px;
                background: {selected_template.get('header_bg', 'transparent')};
                color: {selected_template.get('header_text_color', 'inherit')};
                padding: {selected_template.get('header_padding', '0')};
            }}
            
            .name {{
                {selected_template['name_style']}
            }}
            
            .contact-info {{
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 20px;
                margin-top: 10px;
            }}
            
            .contact-item {{
                display: flex;
                align-items: center;
                gap: 5px;
            }}
            
            .section {{
                margin-bottom: 35px;
            }}
            
            .section-title {{
                {selected_template['section_title_style']}
            }}
            
            .experience-item, .education-item, .project-item, .activity-item {{
                margin-bottom: 25px;
                page-break-inside: avoid;
            }}
            
            .item-header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 5px;
            }}
            
            .item-title {{
                color: {primary_color};
                font-weight: 600;
                font-size: 1.1rem;
            }}
            
            .item-date {{
                color: #666;
                font-size: 0.9rem;
                white-space: nowrap;
            }}
            
            .item-subtitle {{
                font-weight: 500;
                margin-bottom: 8px;
                color: #555;
            }}
            
            .item-description {{
                margin-bottom: 0;
            }}
            
            .skills-container {{
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }}
            
            .skill-badge {{
                background-color: {primary_color}33;
                color: {primary_color};
                padding: 6px 12px;
                border-radius: 4px;
                font-weight: 500;
                font-size: 0.9rem;
            }}
            
            .project-link {{
                display: inline-block;
                background-color: {primary_color};
                color: white;
                padding: 4px 8px;
                text-decoration: none;
                border-radius: 3px;
                font-size: 0.8rem;
                margin-top: 8px;
            }}
            
            .technologies {{
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 8px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="name">{resume_data.get('name', 'Your Name')}</h1>
            <div class="contact-info">"""
    
    # Add contact info
    if resume_data.get('email'):
        html += f'<div class="contact-item">✉ {resume_data["email"]}</div>'
    if resume_data.get('phone'):
        html += f'<div class="contact-item">📞 {resume_data["phone"]}</div>'
    if resume_data.get('location'):
        html += f'<div class="contact-item">📍 {resume_data["location"]}</div>'
    
    html += """
            </div>
        </div>"""
    
    # Professional Summary
    if resume_data.get('summary'):
        html += f"""
        <div class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p>{resume_data['summary']}</p>
        </div>"""
    
    # Work Experience
    if resume_data.get('experience') and any(exp.get('company') for exp in resume_data['experience']):
        html += """
        <div class="section">
            <h2 class="section-title">Work Experience</h2>"""
        
        for exp in resume_data['experience']:
            if exp.get('company'):
                html += f"""
            <div class="experience-item">
                <div class="item-header">
                    <div class="item-title">{exp.get('position', '')}</div>
                    <div class="item-date">{exp.get('startDate', '')} - {'Present' if exp.get('current') else exp.get('endDate', '')}</div>
                </div>
                <div class="item-subtitle">{exp.get('company', '')}</div>
                <p class="item-description">{exp.get('description', '')}</p>
            </div>"""
        
        html += "</div>"
    
    # Education
    if resume_data.get('education') and any(edu.get('school') for edu in resume_data['education']):
        html += """
        <div class="section">
            <h2 class="section-title">Education</h2>"""
        
        for edu in resume_data['education']:
            if edu.get('school'):
                degree_field = edu.get('degree', '')
                if edu.get('field'):
                    degree_field += f" in {edu['field']}"
                
                html += f"""
            <div class="education-item">
                <div class="item-header">
                    <div class="item-title">{degree_field}</div>
                    <div class="item-date">{edu.get('startDate', '')} - {edu.get('endDate', '')}</div>
                </div>
                <div class="item-subtitle">{edu.get('school', '')}</div>
                {'<p class="item-description">' + edu.get('description', '') + '</p>' if edu.get('description') else ''}
            </div>"""
        
        html += "</div>"
    
    # Skills
    if resume_data.get('skills') and any(skill.strip() for skill in resume_data['skills'] if skill):
        html += """
        <div class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-container">"""
        
        for skill in resume_data['skills']:
            if skill and skill.strip():
                html += f'<span class="skill-badge">{skill.strip()}</span>'
        
        html += """
            </div>
        </div>"""
    
    # Projects
    if resume_data.get('projects') and any(proj.get('title') for proj in resume_data['projects']):
        html += """
        <div class="section">
            <h2 class="section-title">Projects</h2>"""
        
        for proj in resume_data['projects']:
            if proj.get('title'):
                html += f"""
            <div class="project-item">
                <div class="item-title">{proj.get('title', '')}</div>
                {'<div class="technologies">Technologies: ' + proj.get('technologies', '') + '</div>' if proj.get('technologies') else ''}
                <p class="item-description">{proj.get('description', '')}</p>
                {'<a href="' + proj.get('link', '') + '" class="project-link">View Project ↗</a>' if proj.get('link') else ''}
            </div>"""
        
        html += "</div>"
    
    # Activities
    if resume_data.get('activities') and any(activity.get('title') for activity in resume_data['activities']):
        html += """
        <div class="section">
            <h2 class="section-title">Extra-Curricular Activities</h2>"""
        
        for activity in resume_data['activities']:
            if activity.get('title'):
                html += f"""
            <div class="activity-item">
                <div class="item-header">
                    <div class="item-title">{activity.get('title', '')}</div>
                    <div class="item-date">{activity.get('startDate', '')} - {activity.get('endDate', '')}</div>
                </div>
                {'<div class="item-subtitle">' + activity.get('organization', '') + '</div>' if activity.get('organization') else ''}
                {'<p class="item-description">' + activity.get('description', '') + '</p>' if activity.get('description') else ''}
            </div>"""
        
        html += "</div>"
    
    html += """
    </body>
    </html>"""
    
    return html

@app.route('/api/resume/generate-pdf', methods=['POST'])
@auth_required
def generate_resume_pdf():
    try:
        data = request.get_json()
        resume_data = data.get('resumeData')
        
        if not resume_data:
            return jsonify({'message': 'Resume data is required'}), 400
        
        # Use reportlab for reliable PDF generation
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.5*inch, leftMargin=0.5*inch, 
                              topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Get styles
        styles = getSampleStyleSheet()
        primary_color = resume_data.get('layout', {}).get('color', '#0d6efd')
        
        # Custom styles
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], 
                                   fontSize=24, spaceAfter=12, 
                                   textColor=colors.HexColor(primary_color),
                                   alignment=1)  # Center alignment
        
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], 
                                     fontSize=14, spaceAfter=6, spaceBefore=12,
                                     textColor=colors.HexColor(primary_color),
                                     borderWidth=1,
                                     borderColor=colors.HexColor(primary_color),
                                     borderPadding=3)
        
        subheading_style = ParagraphStyle('CustomSubHeading', parent=styles['Heading3'], 
                                        fontSize=12, spaceAfter=3, spaceBefore=6,
                                        textColor=colors.black,
                                        fontName='Helvetica-Bold')
        
        normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
                                    fontSize=10, spaceAfter=3)
        
        contact_style = ParagraphStyle('ContactStyle', parent=styles['Normal'],
                                     fontSize=10, alignment=1,  # Center alignment
                                     spaceAfter=12)
        
        # Build PDF content
        story = []
        
        # Name (Title)
        story.append(Paragraph(resume_data.get('name', 'Your Name'), title_style))
        
        # Contact information in a centered format
        contact_info = []
        if resume_data.get('email'):
            contact_info.append(resume_data['email'])
        if resume_data.get('phone'):
            contact_info.append(resume_data['phone'])
        if resume_data.get('location'):
            contact_info.append(resume_data['location'])
        
        if contact_info:
            story.append(Paragraph(' | '.join(contact_info), contact_style))
        
        # Professional Summary
        if resume_data.get('summary'):
            story.append(Paragraph('PROFESSIONAL SUMMARY', heading_style))
            story.append(Paragraph(resume_data['summary'], normal_style))
            story.append(Spacer(1, 6))
        
        # Work Experience
        if resume_data.get('experience') and any(exp.get('company') for exp in resume_data['experience']):
            story.append(Paragraph('WORK EXPERIENCE', heading_style))
            
            for exp in resume_data['experience']:
                if exp.get('company') and exp.get('position'):
                    # Position and Company
                    story.append(Paragraph(f"<b>{exp.get('position', '')}</b>", subheading_style))
                    
                    # Company and dates
                    company_info = exp.get('company', '')
                    if exp.get('startDate') or exp.get('endDate'):
                        dates = f"{exp.get('startDate', '')} - {'Present' if exp.get('current') else exp.get('endDate', '')}"
                        company_info += f" | {dates}"
                    
                    story.append(Paragraph(company_info, normal_style))
                    
                    # Description
                    if exp.get('description'):
                        # Split description by bullet points or newlines
                        description = exp['description']
                        if '•' in description or '*' in description:
                            # Handle bullet points
                            bullets = description.replace('*', '•').split('•')
                            for bullet in bullets:
                                if bullet.strip():
                                    story.append(Paragraph(f"• {bullet.strip()}", normal_style))
                        else:
                            story.append(Paragraph(description, normal_style))
                    
                    story.append(Spacer(1, 6))
        
        # Education
        if resume_data.get('education') and any(edu.get('school') for edu in resume_data['education']):
            story.append(Paragraph('EDUCATION', heading_style))
            
            for edu in resume_data['education']:
                if edu.get('school'):
                    # Degree and Field
                    degree_field = edu.get('degree', '')
                    if edu.get('field'):
                        degree_field += f" in {edu['field']}" if degree_field else edu['field']
                    
                    if degree_field:
                        story.append(Paragraph(f"<b>{degree_field}</b>", subheading_style))
                    
                    # School and dates
                    school_info = edu.get('school', '')
                    if edu.get('startDate') or edu.get('endDate'):
                        dates = f"{edu.get('startDate', '')} - {edu.get('endDate', '')}"
                        school_info += f" | {dates}"
                    
                    story.append(Paragraph(school_info, normal_style))
                    
                    # Description
                    if edu.get('description'):
                        story.append(Paragraph(edu['description'], normal_style))
                    
                    story.append(Spacer(1, 6))
        
        # Skills
        if resume_data.get('skills') and any(skill.strip() for skill in resume_data['skills']):
            story.append(Paragraph('SKILLS', heading_style))
            skills_text = ' • '.join([skill.strip() for skill in resume_data['skills'] if skill.strip()])
            story.append(Paragraph(skills_text, normal_style))
            story.append(Spacer(1, 6))
        
        # Projects
        if resume_data.get('projects') and any(proj.get('title') for proj in resume_data['projects']):
            story.append(Paragraph('PROJECTS', heading_style))
            
            for proj in resume_data['projects']:
                if proj.get('title'):
                    # Project title
                    project_title = proj.get('title', '')
                    if proj.get('link'):
                        project_title += f" | {proj['link']}"
                    
                    story.append(Paragraph(f"<b>{project_title}</b>", subheading_style))
                    
                    # Technologies
                    if proj.get('technologies'):
                        story.append(Paragraph(f"<i>Technologies: {proj['technologies']}</i>", normal_style))
                    
                    # Description
                    if proj.get('description'):
                        story.append(Paragraph(proj['description'], normal_style))
                    
                    story.append(Spacer(1, 6))
        
        # Activities
        if resume_data.get('activities') and any(act.get('title') for act in resume_data['activities']):
            story.append(Paragraph('ACTIVITIES & ACHIEVEMENTS', heading_style))
            
            for act in resume_data['activities']:
                if act.get('title'):
                    # Activity title and organization
                    activity_title = act.get('title', '')
                    if act.get('organization'):
                        activity_title += f" - {act['organization']}"
                    
                    story.append(Paragraph(f"<b>{activity_title}</b>", subheading_style))
                    
                    # Dates
                    if act.get('startDate') or act.get('endDate'):
                        dates = f"{act.get('startDate', '')} - {act.get('endDate', '')}"
                        story.append(Paragraph(dates, normal_style))
                    
                    # Description
                    if act.get('description'):
                        story.append(Paragraph(act['description'], normal_style))
                    
                    story.append(Spacer(1, 6))
        
        # Build PDF
        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create response
        from flask import make_response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        filename = f"{resume_data.get('name', 'Resume').replace(' ', '_')}_Resume.pdf"
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['Content-Length'] = len(pdf_data)
        
        return response
        
    except Exception as e:
        print(f'PDF generation error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to generate PDF', 'error': str(e)}), 500

# Test route without authentication for debugging
@app.route('/api/resume/test-pdf', methods=['POST'])
def test_generate_pdf():
    """Test PDF generation without authentication"""
    try:
        data = request.get_json()
        resume_data = data.get('resumeData', {
            'name': 'John Doe',
            'email': 'john@example.com',
            'phone': '+1-234-567-8900',
            'summary': 'Experienced software developer with expertise in Python and JavaScript.',
            'layout': {'color': '#0d6efd'}
        })
        
        # Use the same PDF generation logic
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.5*inch, leftMargin=0.5*inch, 
                              topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, spaceAfter=12)
        
        story = []
        story.append(Paragraph(resume_data.get('name', 'Test User'), title_style))
        story.append(Paragraph(resume_data.get('summary', 'Test summary'), styles['Normal']))
        
        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        from flask import make_response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename="test_resume.pdf"'
        
        return response
        
    except Exception as e:
        print(f'Test PDF generation error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to generate test PDF', 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f'Starting Python Flask server on port {port}...')
    print('MongoDB collections initialized:')
    print(f'  - Users: {users_collection.name}')
    print(f'  - Resumes: {resumes_collection.name}')
    print(f'  - ATS Evaluations: {ats_evaluations_collection.name}')
    app.run(debug=True, host='0.0.0.0', port=port)
