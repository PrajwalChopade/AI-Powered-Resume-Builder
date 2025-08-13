#!/usr/bin/env python3
"""Test the AI analysis function independently"""

import sys
import os
import time
import json
import re
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

def test_analyze_function():
    """Test the analyze_resume_with_combined_ai function"""
    
    # Set up Gemini API
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not found")
        return
    
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"SUCCESS: GEMINI_API_KEY configured: {GEMINI_API_KEY[:20]}...")
    
    def get_combined_analysis_prompt(resume_text, job_description):
        # Truncate inputs to prevent overly long prompts
        resume_text = resume_text[:3000] if len(resume_text) > 3000 else resume_text
        job_description = job_description[:2000] if len(job_description) > 2000 else job_description
        
        return f"""Analyze this resume against the job description. Provide ATS score and top 3 improvements.

RESUME: {resume_text}

JOB: {job_description}

Return ONLY this JSON structure:
{{
  "ats_analysis": {{
    "atsScore": 75,
    "keywordMatches": ["skill1", "skill2"],
    "missingSkills": ["missing1", "missing2"],
    "strengthAreas": ["strength1"],
    "improvementAreas": ["improvement1"],
    "gapAnalysis": ["gap1"],
    "recommendations": ["rec1"]
  }},
  "specific_improvements": [
    {{
      "section": "experience",
      "original_text": "exact text from resume",
      "improved_text": "improved version with metrics",
      "reason": "why this helps ATS",
      "keywords_added": ["keyword"],
      "impact_score": 8,
      "category": "quantification"
    }}
  ],
  "skill_additions": [
    {{
      "skill": "Python",
      "reason": "mentioned in job description",
      "section_to_add": "skills"
    }}
  ],
  "improvement_summary": {{
    "current_score": 75,
    "expected_score_after_improvements": 85,
    "improvement_potential": 10,
    "critical_missing_keywords": ["keyword1"]
  }}
}}

Limit to top 3 improvements. Return only JSON, no other text."""

    def analyze_resume_with_combined_ai(job_description, resume_text):
        """Combined ATS analysis and improvements in single API call for better performance"""
        start_time = time.time()
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = get_combined_analysis_prompt(resume_text, job_description)
            
            print('🚀 Calling Gemini API for combined ATS analysis and improvements...')
            
            # Add timeout configuration to prevent hanging
            try:
                response = model.generate_content(
                    prompt,
                    generation_config={
                        'candidate_count': 1,
                        'max_output_tokens': 3000,
                        'temperature': 0.2,
                        'top_k': 40,
                        'top_p': 0.95,
                    }
                )
            except Exception as gen_error:
                print(f'⚠️ Generation config failed, trying simple call: {gen_error}')
                response = model.generate_content(prompt)
            
            end_time = time.time()
            print(f'✅ SUCCESS: Gemini API responded in {end_time - start_time:.2f} seconds')
            
            ai_text = response.text if response.text else ''
            print(f'Response length: {len(ai_text)} characters')
            
            if not ai_text:
                print('❌ ERROR: No text in Gemini response!')
                raise Exception('Empty response from Gemini API')
            
            # Parse the combined response
            try:
                # Clean the response to extract JSON
                ai_text_clean = ai_text.strip()
                if ai_text_clean.startswith('```json'):
                    ai_text_clean = ai_text_clean[7:]
                if ai_text_clean.endswith('```'):
                    ai_text_clean = ai_text_clean[:-3]
                ai_text_clean = ai_text_clean.strip()
                
                json_match = re.search(r'\{[\s\S]*\}', ai_text_clean)
                if json_match:
                    combined_data = json.loads(json_match.group())
                    print('✅ Parsed JSON from regex match')
                else:
                    combined_data = json.loads(ai_text_clean)
                    print('✅ Parsed JSON directly')
                
                print(f'✅ SUCCESS: Parsed combined analysis in {time.time() - start_time:.2f} seconds total')
                
                # Validate required structure
                if 'ats_analysis' not in combined_data:
                    print('⚠️ WARNING: Missing ats_analysis in response, using fallback')
                    raise ValueError('Missing ats_analysis in combined response')
                
                return combined_data
                
            except (json.JSONDecodeError, ValueError) as e:
                print(f'❌ ERROR: Failed to parse combined JSON: {e}')
                print(f'Raw response sample: {ai_text[:500]}...')
                raise e
            
        except Exception as e:
            print(f'❌ ERROR: Gemini API Error in combined analysis: {str(e)}')
            raise e

    # Test data
    resume_text = """
    John Doe
    Software Engineer
    
    EXPERIENCE:
    Software Engineer at TechCorp (2021-2024)
    - Developed web applications using JavaScript and React
    - Worked with REST APIs and databases
    - Collaborated with team members on various projects
    
    SKILLS:
    JavaScript, React, HTML, CSS, Git
    """
    
    job_description = """
    Software Engineer Position
    
    We are looking for a Software Engineer with experience in:
    - JavaScript, React, Node.js
    - Python programming
    - AWS cloud services
    - Database design and optimization
    - Agile development methodologies
    """
    
    print("Testing analyze_resume_with_combined_ai function...")
    print(f"Resume length: {len(resume_text)}")
    print(f"Job description length: {len(job_description)}")
    
    try:
        result = analyze_resume_with_combined_ai(job_description, resume_text)
        print("✅ SUCCESS: Function completed without errors")
        print(f"Result keys: {list(result.keys())}")
        if 'ats_analysis' in result:
            print(f"ATS Score: {result['ats_analysis'].get('atsScore', 'N/A')}")
        print("Analysis completed successfully!")
        return True
    except Exception as e:
        print(f"❌ ERROR: Function failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_analyze_function()
