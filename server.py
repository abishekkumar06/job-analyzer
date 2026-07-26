"""
JobAnalyzer - AI-Powered Resume Analyzer Backend
Flask server for PDF/DOCX resume parsing, skill extraction,
job matching, and career recommendations.
"""

import os
import re
import json
import math
import requests as http_requests
from collections import Counter, defaultdict
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# ============================================
# SUPABASE AUTH CONFIG
# ============================================
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')


def get_user_from_token(token):
    """Return the Supabase user object for a given access token, or None."""
    if not token:
        return None
    try:
        resp = http_requests.get(
            f'{SUPABASE_URL}/auth/v1/user',
            headers={'apikey': SUPABASE_ANON_KEY, 'Authorization': f'Bearer {token}'},
            timeout=10
        )
        if resp.status_code == 200:
            return resp.json()
    except http_requests.exceptions.RequestException:
        pass
    return None


def upsert_profile(token, user_id, name='', phone='', email=''):
    """Create or update a row in public.profiles for this user. Best-effort, never raises."""
    try:
        http_requests.post(
            f'{SUPABASE_URL}/rest/v1/profiles',
            headers={
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates',
            },
            json={'id': user_id, 'name': name, 'phone': phone, 'email': email},
            timeout=10
        )
    except http_requests.exceptions.RequestException:
        pass


def save_resume_record(token, user_id, filename, ats_score, skills, job_matches, learning_path):
    """Insert a row into public.resumes for this user. Best-effort, never raises."""
    try:
        http_requests.post(
            f'{SUPABASE_URL}/rest/v1/resumes',
            headers={
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            json={
                'user_id': user_id,
                'filename': filename,
                'ats_score': ats_score,
                'extracted_skills': skills,
                'job_matches': job_matches,
                'learning_path': learning_path,
            },
            timeout=10
        )
    except http_requests.exceptions.RequestException:
        pass

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '/tmp/uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}

# ============================================
# COMPREHENSIVE SKILLS DATABASE
# ============================================

SKILLS_DATABASE = {
    'programming': {
        'Python': ['python', 'py', 'python3', 'python2'],
        'JavaScript': ['javascript', 'js', 'es6', 'es2015', 'ecmascript'],
        'Java': ['java', 'jdk', 'jre', 'j2ee', 'jvm'],
        'C++': ['c++', 'cpp', 'c plus plus'],
        'C#': ['c#', 'csharp', 'c sharp', '.net'],
        'R': ['r programming', 'r language', 'rstudio', 'r-studio'],
        'Go': ['golang', 'go lang', 'go programming'],
        'Rust': ['rust', 'rust lang'],
        'TypeScript': ['typescript', 'ts'],
        'PHP': ['php', 'php7', 'php8'],
        'Ruby': ['ruby', 'ruby on rails', 'rails'],
        'Scala': ['scala'],
        'Kotlin': ['kotlin'],
        'Swift': ['swift', 'swiftui'],
        'Bash': ['bash', 'shell script', 'shell scripting', 'sh'],
        'MATLAB': ['matlab'],
        'Julia': ['julia'],
        'Perl': ['perl'],
        'Objective-C': ['objective-c', 'objc', 'objective c'],
    },
    'ml_ai': {
        'Machine Learning': ['machine learning', 'ml', 'supervised learning', 'unsupervised learning'],
        'Deep Learning': ['deep learning', 'dl', 'neural networks', 'neural network'],
        'Natural Language Processing': ['natural language processing', 'nlp', 'text mining', 'text analytics'],
        'Computer Vision': ['computer vision', 'cv', 'image recognition', 'image processing', 'object detection'],
        'TensorFlow': ['tensorflow', 'tf', 'keras'],
        'PyTorch': ['pytorch', 'torch'],
        'Scikit-learn': ['scikit-learn', 'sklearn', 'scikit learn'],
        'Generative AI': ['generative ai', 'gen ai', 'genai', 'llm', 'large language model', 'gpt', 'chatgpt'],
        'Prompt Engineering': ['prompt engineering', 'prompt design'],
        'MLOps': ['mlops', 'ml ops', 'model deployment', 'model serving'],
        'Reinforcement Learning': ['reinforcement learning', 'rl'],
        'Transfer Learning': ['transfer learning'],
        'GANs': ['gan', 'gans', 'generative adversarial'],
        'Transformers': ['transformers', 'transformer', 'bert', 'attention mechanism'],
        'XGBoost': ['xgboost', 'xgb', 'gradient boosting'],
        'Random Forest': ['random forest'],
        'SVM': ['svm', 'support vector machine'],
        'Hugging Face': ['hugging face', 'huggingface'],
        'OpenCV': ['opencv', 'open cv'],
        'NLTK': ['nltk'],
        'SpaCy': ['spacy'],
        'LangChain': ['langchain', 'lang chain'],
    },
    'data': {
        'SQL': ['sql', 'mysql', 'postgresql', 'postgres', 'mssql', 'sql server', 'tsql', 't-sql'],
        'NoSQL': ['nosql', 'no sql'],
        'MongoDB': ['mongodb', 'mongo'],
        'Data Analysis': ['data analysis', 'data analytics', 'data analyst'],
        'Data Science': ['data science', 'data scientist'],
        'Data Engineering': ['data engineering', 'data engineer', 'data pipeline'],
        'Data Mining': ['data mining'],
        'Data Visualization': ['data visualization', 'data viz'],
        'Pandas': ['pandas'],
        'NumPy': ['numpy'],
        'Apache Spark': ['apache spark', 'spark', 'pyspark'],
        'Hadoop': ['hadoop', 'hdfs', 'mapreduce'],
        'Apache Kafka': ['kafka', 'apache kafka'],
        'Apache Airflow': ['airflow', 'apache airflow'],
        'ETL': ['etl', 'extract transform load'],
        'Data Warehousing': ['data warehousing', 'data warehouse', 'dwh'],
        'Redis': ['redis'],
        'Elasticsearch': ['elasticsearch', 'elastic search', 'elk'],
        'Cassandra': ['cassandra'],
        'DynamoDB': ['dynamodb', 'dynamo db'],
        'BigQuery': ['bigquery', 'big query'],
        'Snowflake': ['snowflake'],
        'Databricks': ['databricks'],
    },
    'cloud': {
        'AWS': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'sagemaker'],
        'Google Cloud': ['gcp', 'google cloud', 'google cloud platform'],
        'Microsoft Azure': ['azure', 'microsoft azure'],
        'Docker': ['docker', 'dockerfile', 'container'],
        'Kubernetes': ['kubernetes', 'k8s'],
        'CI/CD': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'github actions'],
        'Terraform': ['terraform', 'iac', 'infrastructure as code'],
        'Serverless': ['serverless', 'lambda', 'cloud functions'],
        'Microservices': ['microservices', 'micro services'],
        'DevOps': ['devops', 'dev ops'],
        'Linux': ['linux', 'ubuntu', 'centos', 'redhat'],
        'Ansible': ['ansible'],
        'CloudFormation': ['cloudformation', 'cloud formation'],
    },
    'web': {
        'React': ['react', 'reactjs', 'react.js'],
        'Angular': ['angular', 'angularjs'],
        'Vue.js': ['vue', 'vuejs', 'vue.js'],
        'Node.js': ['node.js', 'nodejs', 'node', 'express', 'expressjs'],
        'Django': ['django'],
        'Flask': ['flask'],
        'FastAPI': ['fastapi', 'fast api'],
        'Spring Boot': ['spring boot', 'spring', 'spring framework'],
        'REST API': ['rest api', 'restful', 'rest'],
        'GraphQL': ['graphql', 'graph ql'],
        'HTML/CSS': ['html', 'css', 'html5', 'css3'],
        'Next.js': ['next.js', 'nextjs'],
        'Svelte': ['svelte', 'sveltekit'],
    },
    'tools': {
        'Git': ['git', 'github', 'gitlab', 'bitbucket', 'version control'],
        'Tableau': ['tableau'],
        'Power BI': ['power bi', 'powerbi'],
        'Excel': ['excel', 'microsoft excel', 'spreadsheet'],
        'Jupyter': ['jupyter', 'jupyter notebook', 'jupyterlab'],
        'VS Code': ['vs code', 'vscode', 'visual studio code'],
        'Jira': ['jira'],
        'Confluence': ['confluence'],
        'Figma': ['figma'],
        'Postman': ['postman'],
        'Swagger': ['swagger', 'openapi'],
    },
    'concepts': {
        'Agile': ['agile', 'scrum', 'kanban', 'sprint'],
        'Statistics': ['statistics', 'statistical analysis', 'hypothesis testing'],
        'Mathematics': ['mathematics', 'linear algebra', 'calculus', 'probability'],
        'Data Modeling': ['data modeling', 'data modelling', 'er diagram'],
        'System Design': ['system design', 'architecture', 'design patterns'],
        'Algorithms': ['algorithms', 'data structures', 'dsa'],
        'Project Management': ['project management', 'pmp'],
        'Business Intelligence': ['business intelligence', 'bi'],
        'A/B Testing': ['a/b testing', 'ab testing', 'experimentation'],
        'Feature Engineering': ['feature engineering'],
        'Model Evaluation': ['model evaluation', 'cross validation', 'confusion matrix'],
        'Automation': ['automation', 'rpa', 'robotic process automation'],
    }
}

# ============================================
# JOB ROLES & REQUIRED SKILLS
# ============================================

JOB_ROLES = {
    'Data Scientist': {
        'required': ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Data Analysis'],
        'preferred': ['Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Data Visualization', 'Pandas', 'NumPy', 'Scikit-learn', 'R'],
        'nice_to_have': ['AWS', 'Docker', 'Spark', 'Generative AI', 'A/B Testing', 'Feature Engineering'],
        'avg_salary': '₹18.5 LPA',
        'salary_range': '₹8-35 LPA',
        'growth': '+24%',
        'openings': 4520,
    },
    'Data Analyst': {
        'required': ['SQL', 'Excel', 'Data Analysis', 'Data Visualization', 'Statistics'],
        'preferred': ['Python', 'Tableau', 'Power BI', 'Pandas', 'R'],
        'nice_to_have': ['Machine Learning', 'A/B Testing', 'BigQuery', 'Snowflake'],
        'avg_salary': '₹8.5 LPA',
        'salary_range': '₹4-18 LPA',
        'growth': '+18%',
        'openings': 3200,
    },
    'ML Engineer': {
        'required': ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch'],
        'preferred': ['MLOps', 'Docker', 'Kubernetes', 'AWS', 'Scikit-learn', 'REST API'],
        'nice_to_have': ['Spark', 'Kafka', 'Generative AI', 'System Design', 'CI/CD'],
        'avg_salary': '₹22.0 LPA',
        'salary_range': '₹12-40 LPA',
        'growth': '+28%',
        'openings': 2340,
    },
    'Data Engineer': {
        'required': ['Python', 'SQL', 'ETL', 'Data Engineering', 'Apache Spark'],
        'preferred': ['AWS', 'Hadoop', 'Kafka', 'Airflow', 'Docker', 'Data Warehousing'],
        'nice_to_have': ['Kubernetes', 'Snowflake', 'Databricks', 'BigQuery', 'Terraform'],
        'avg_salary': '₹16.5 LPA',
        'salary_range': '₹6-30 LPA',
        'growth': '+22%',
        'openings': 2800,
    },
    'Full Stack Developer': {
        'required': ['JavaScript', 'HTML/CSS', 'React', 'Node.js', 'SQL'],
        'preferred': ['TypeScript', 'MongoDB', 'REST API', 'Git', 'Docker'],
        'nice_to_have': ['AWS', 'CI/CD', 'GraphQL', 'Next.js', 'Kubernetes'],
        'avg_salary': '₹15.2 LPA',
        'salary_range': '₹5-28 LPA',
        'growth': '+18%',
        'openings': 3890,
    },
    'Cloud Architect': {
        'required': ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Microservices'],
        'preferred': ['Terraform', 'CI/CD', 'Google Cloud', 'Microsoft Azure', 'Serverless'],
        'nice_to_have': ['Python', 'Ansible', 'System Design', 'CloudFormation'],
        'avg_salary': '₹25.0 LPA',
        'salary_range': '₹15-45 LPA',
        'growth': '+32%',
        'openings': 2750,
    },
    'DevOps Engineer': {
        'required': ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'AWS'],
        'preferred': ['Terraform', 'Ansible', 'Python', 'Bash', 'Git'],
        'nice_to_have': ['Google Cloud', 'Microsoft Azure', 'Microservices', 'Serverless'],
        'avg_salary': '₹18.0 LPA',
        'salary_range': '₹8-32 LPA',
        'growth': '+26%',
        'openings': 2100,
    },
    'Business Analyst': {
        'required': ['Data Analysis', 'Excel', 'SQL', 'Business Intelligence', 'Agile'],
        'preferred': ['Tableau', 'Power BI', 'Python', 'Project Management', 'Data Visualization'],
        'nice_to_have': ['Machine Learning', 'Statistics', 'Jira', 'Confluence'],
        'avg_salary': '₹12.0 LPA',
        'salary_range': '₹5-22 LPA',
        'growth': '+15%',
        'openings': 2500,
    },
    'AI Research Scientist': {
        'required': ['Python', 'Deep Learning', 'Machine Learning', 'Mathematics', 'Statistics'],
        'preferred': ['PyTorch', 'TensorFlow', 'NLP', 'Computer Vision', 'Reinforcement Learning'],
        'nice_to_have': ['Generative AI', 'Transformers', 'GANs', 'Hugging Face', 'LangChain'],
        'avg_salary': '₹30.0 LPA',
        'salary_range': '₹18-55 LPA',
        'growth': '+35%',
        'openings': 1500,
    },
    'Product Manager': {
        'required': ['Agile', 'Data Analysis', 'Project Management', 'Business Intelligence'],
        'preferred': ['SQL', 'A/B Testing', 'Jira', 'Excel', 'Data Visualization'],
        'nice_to_have': ['Python', 'Machine Learning', 'Figma', 'Tableau'],
        'avg_salary': '₹20.0 LPA',
        'salary_range': '₹10-35 LPA',
        'growth': '+20%',
        'openings': 1800,
    },
}

# Learning resources for skill gaps
LEARNING_RESOURCES = {
    'Machine Learning': {'time': '6-8 weeks', 'resources': ['Andrew Ng ML Course (Coursera)', 'Hands-On ML with Scikit-Learn (Book)']},
    'Deep Learning': {'time': '8-10 weeks', 'resources': ['Deep Learning Specialization (Coursera)', 'fast.ai Practical Deep Learning']},
    'Python': {'time': '4-6 weeks', 'resources': ['Python for Everybody (Coursera)', 'Automate the Boring Stuff']},
    'SQL': {'time': '3-4 weeks', 'resources': ['SQL for Data Science (Coursera)', 'Mode Analytics SQL Tutorial']},
    'TensorFlow': {'time': '4-6 weeks', 'resources': ['TensorFlow Developer Certificate', 'TF Official Tutorials']},
    'PyTorch': {'time': '4-6 weeks', 'resources': ['PyTorch Official Tutorials', 'Deep Learning with PyTorch (Book)']},
    'AWS': {'time': '6-8 weeks', 'resources': ['AWS Cloud Practitioner', 'AWS Solutions Architect Associate']},
    'Docker': {'time': '2-3 weeks', 'resources': ['Docker Official Getting Started', 'Docker Mastery (Udemy)']},
    'Kubernetes': {'time': '4-6 weeks', 'resources': ['CKA Certification', 'Kubernetes in Action (Book)']},
    'NLP': {'time': '6-8 weeks', 'resources': ['NLP Specialization (Coursera)', 'Hugging Face Course']},
    'Statistics': {'time': '4-5 weeks', 'resources': ['Statistics with Python (Coursera)', 'Think Stats (Book)']},
    'Data Visualization': {'time': '2-3 weeks', 'resources': ['Data Visualization with Python', 'Storytelling with Data (Book)']},
    'Pandas': {'time': '2-3 weeks', 'resources': ['Pandas Official Documentation', 'Python for Data Analysis (Book)']},
    'NumPy': {'time': '1-2 weeks', 'resources': ['NumPy Official Tutorial', 'Python Data Science Handbook']},
    'Scikit-learn': {'time': '3-4 weeks', 'resources': ['Scikit-learn Official Tutorials', 'Hands-On ML Book']},
    'Generative AI': {'time': '4-6 weeks', 'resources': ['Google Generative AI Course', 'DeepLearning.AI GenAI Course']},
    'MLOps': {'time': '4-6 weeks', 'resources': ['MLOps Specialization (Coursera)', 'Made With ML']},
    'React': {'time': '4-6 weeks', 'resources': ['React Official Tutorial', 'Full Stack Open']},
    'Node.js': {'time': '3-4 weeks', 'resources': ['Node.js Official Guides', 'The Odin Project']},
    'Spark': {'time': '4-6 weeks', 'resources': ['PySpark Course', 'Learning Spark (Book)']},
    'Git': {'time': '1 week', 'resources': ['Git Official Tutorial', 'Pro Git Book']},
    'Tableau': {'time': '2-3 weeks', 'resources': ['Tableau Public Training', 'Tableau Desktop Specialist']},
    'Power BI': {'time': '2-3 weeks', 'resources': ['Microsoft Power BI Learning Path', 'Power BI Guided Learning']},
    'Computer Vision': {'time': '6-8 weeks', 'resources': ['CS231n (Stanford)', 'OpenCV Python Tutorials']},
    'Data Engineering': {'time': '8-10 weeks', 'resources': ['Data Engineering Zoomcamp', 'Designing Data-Intensive Apps']},
    'Excel': {'time': '2-3 weeks', 'resources': ['Excel Skills for Business (Coursera)', 'ExcelJet Tutorials']},
    'Terraform': {'time': '3-4 weeks', 'resources': ['HashiCorp Terraform Associate', 'Terraform Up & Running']},
    'CI/CD': {'time': '2-3 weeks', 'resources': ['GitHub Actions Docs', 'Jenkins Tutorial']},
    'REST API': {'time': '2-3 weeks', 'resources': ['RESTful API Design', 'Postman Learning Center']},
    'Mathematics': {'time': '6-8 weeks', 'resources': ['Mathematics for ML (Coursera)', '3Blue1Brown Videos']},
    'System Design': {'time': '4-6 weeks', 'resources': ['System Design Primer (GitHub)', 'Designing Data-Intensive Applications']},
    'Agile': {'time': '2-3 weeks', 'resources': ['Agile with Atlassian Jira', 'Scrum Guide']},
}


# ============================================
# TEXT EXTRACTION
# ============================================

def extract_text_from_pdf(filepath):
    """Extract text from PDF using pdfplumber."""
    import pdfplumber
    text = ''
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + '\n'
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {str(e)}")
    return text


def extract_text_from_docx(filepath):
    """Extract text from DOCX using python-docx."""
    from docx import Document
    try:
        doc = Document(filepath)
        text = '\n'.join([para.text for para in doc.paragraphs if para.text.strip()])
    except Exception as e:
        raise ValueError(f"Failed to read DOCX: {str(e)}")
    return text


# ============================================
# SKILL EXTRACTION ENGINE
# ============================================

def extract_skills(text):
    """Extract skills from resume text using keyword matching."""
    text_lower = text.lower()
    found_skills = {}
    
    for category, skills in SKILLS_DATABASE.items():
        for skill_name, keywords in skills.items():
            for keyword in keywords:
                # Use word boundary matching for short keywords to avoid false positives
                if len(keyword) <= 2:
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, text_lower):
                        found_skills[skill_name] = category
                        break
                else:
                    if keyword in text_lower:
                        found_skills[skill_name] = category
                        break
    
    return found_skills


def categorize_skills(found_skills):
    """Group extracted skills by category."""
    categorized = defaultdict(list)
    for skill, category in found_skills.items():
        categorized[category].append(skill)
    return dict(categorized)


# ============================================
# RESUME SECTION PARSER
# ============================================

def parse_resume_sections(text):
    """Parse resume into sections based on common headers."""
    sections = {
        'contact': '',
        'summary': '',
        'experience': '',
        'education': '',
        'skills': '',
        'projects': '',
        'certifications': '',
        'other': ''
    }
    
    section_patterns = {
        'summary': r'(?:summary|objective|profile|about\s*me)',
        'experience': r'(?:experience|work\s*history|employment|professional\s*experience)',
        'education': r'(?:education|academic|qualification|degree)',
        'skills': r'(?:skills|technical\s*skills|core\s*competencies|technologies)',
        'projects': r'(?:projects|personal\s*projects|portfolio)',
        'certifications': r'(?:certifications?|certificates?|licenses?)',
    }
    
    lines = text.split('\n')
    current_section = 'contact'
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        # Check if line is a section header
        matched = False
        for section, pattern in section_patterns.items():
            if re.match(r'^[\s•\-]*' + pattern + r'[\s:]*$', line_stripped, re.IGNORECASE):
                current_section = section
                matched = True
                break
        
        if not matched:
            sections[current_section] += line_stripped + '\n'
    
    return sections


# ============================================
# ATS SCORE CALCULATOR
# ============================================

def calculate_ats_score(text, found_skills, sections):
    """Calculate ATS compatibility score (0-100)."""
    score_breakdown = {}
    total_score = 0
    
    # 1. Skills count score (max 30 points)
    skill_count = len(found_skills)
    skill_score = min(30, skill_count * 3)
    score_breakdown['skills_relevance'] = {
        'score': skill_score,
        'max': 30,
        'label': 'Skills Relevance',
        'detail': f'{skill_count} technical skills identified'
    }
    total_score += skill_score
    
    # 2. Section completeness (max 20 points)
    expected_sections = ['experience', 'education', 'skills']
    found_sections = sum(1 for s in expected_sections if sections.get(s, '').strip())
    section_score = int((found_sections / len(expected_sections)) * 20)
    score_breakdown['structure'] = {
        'score': section_score,
        'max': 20,
        'label': 'Resume Structure',
        'detail': f'{found_sections}/{len(expected_sections)} key sections found'
    }
    total_score += section_score
    
    # 3. Quantifiable achievements (max 15 points)
    numbers_pattern = r'\d+[\%\+]|\d+(?:x|X)|\$\d+|\d+\s*(?:projects?|clients?|team|users?|customers?|revenue|growth|improvement|increase|decrease|reduction)'
    quantifiable = len(re.findall(numbers_pattern, text))
    quant_score = min(15, quantifiable * 3)
    score_breakdown['achievements'] = {
        'score': quant_score,
        'max': 15,
        'label': 'Quantifiable Achievements',
        'detail': f'{quantifiable} measurable accomplishments found'
    }
    total_score += quant_score
    
    # 4. Keyword density (max 15 points)
    word_count = len(text.split())
    keyword_count = sum(1 for skill in found_skills for keyword in SKILLS_DATABASE.get(found_skills[skill], {}).get(skill, []) if keyword in text.lower())
    density = (keyword_count / max(word_count, 1)) * 100
    density_score = min(15, int(density * 15))
    score_breakdown['keyword_optimization'] = {
        'score': min(15, max(5, density_score)),
        'max': 15,
        'label': 'Keyword Optimization',
        'detail': f'{word_count} words with relevant keyword density'
    }
    total_score += min(15, max(5, density_score))
    
    # 5. Formatting quality (max 10 points)
    has_bullets = bool(re.search(r'[•\-\*]', text))
    has_dates = bool(re.search(r'\d{4}', text))
    has_proper_length = 200 < word_count < 1500
    format_score = (3 if has_bullets else 0) + (3 if has_dates else 0) + (4 if has_proper_length else 2)
    score_breakdown['formatting'] = {
        'score': format_score,
        'max': 10,
        'label': 'Formatting Quality',
        'detail': 'Well-formatted' if format_score >= 7 else 'Needs improvement'
    }
    total_score += format_score
    
    # 6. Contact info (max 10 points)
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
    has_phone = bool(re.search(r'[\+]?[\d\-\(\)\s]{10,}', text))
    has_linkedin = bool(re.search(r'linkedin', text, re.IGNORECASE))
    contact_score = (4 if has_email else 0) + (3 if has_phone else 0) + (3 if has_linkedin else 0)
    score_breakdown['contact_info'] = {
        'score': contact_score,
        'max': 10,
        'label': 'Contact Information',
        'detail': f"{'Email ✓' if has_email else 'Email ✗'} | {'Phone ✓' if has_phone else 'Phone ✗'} | {'LinkedIn ✓' if has_linkedin else 'LinkedIn ✗'}"
    }
    total_score += contact_score
    
    return min(100, total_score), score_breakdown


# ============================================
# JOB MATCHING ENGINE
# ============================================

def match_jobs(found_skills):
    """Match extracted skills against job roles and return ranked matches."""
    matches = []
    skill_names = set(found_skills.keys())
    
    for role, requirements in JOB_ROLES.items():
        required = set(requirements['required'])
        preferred = set(requirements['preferred'])
        nice_to_have = set(requirements.get('nice_to_have', []))
        all_skills = required | preferred | nice_to_have
        
        # Calculate match scores
        required_match = skill_names & required
        preferred_match = skill_names & preferred
        nice_match = skill_names & nice_to_have
        
        # Weighted scoring
        required_pct = len(required_match) / max(len(required), 1)
        preferred_pct = len(preferred_match) / max(len(preferred), 1)
        nice_pct = len(nice_match) / max(len(nice_to_have), 1) if nice_to_have else 0
        
        # Overall match: 50% required, 35% preferred, 15% nice to have
        match_pct = round((required_pct * 0.50 + preferred_pct * 0.35 + nice_pct * 0.15) * 100)
        
        # Missing skills
        missing_required = required - skill_names
        missing_preferred = preferred - skill_names
        
        if match_pct > 15:  # Only include roles with >15% match
            matches.append({
                'role': role,
                'match_percentage': match_pct,
                'avg_salary': requirements['avg_salary'],
                'salary_range': requirements['salary_range'],
                'growth': requirements['growth'],
                'openings': requirements['openings'],
                'matched_skills': list(required_match | preferred_match | nice_match),
                'missing_required': list(missing_required),
                'missing_preferred': list(missing_preferred),
                'required_count': len(required),
                'required_matched': len(required_match),
            })
    
    # Sort by match percentage descending
    matches.sort(key=lambda x: x['match_percentage'], reverse=True)
    return matches


# ============================================
# SKILL GAP ANALYZER
# ============================================

def analyze_skill_gaps(found_skills, job_matches):
    """Identify skill gaps and create learning recommendations."""
    skill_names = set(found_skills.keys())
    gap_counter = Counter()
    
    # Count how many top roles need each missing skill
    for match in job_matches[:5]:
        for skill in match['missing_required']:
            gap_counter[skill] += 3  # High weight for required skills
        for skill in match['missing_preferred']:
            gap_counter[skill] += 1  # Lower weight for preferred
    
    # Sort gaps by importance
    sorted_gaps = gap_counter.most_common(10)
    
    learning_path = []
    for skill, importance in sorted_gaps:
        priority = 'high' if importance >= 6 else ('medium' if importance >= 3 else 'low')
        resource_info = LEARNING_RESOURCES.get(skill, {'time': '3-4 weeks', 'resources': ['Online courses and documentation']})
        
        learning_path.append({
            'skill': skill,
            'priority': priority,
            'importance_score': importance,
            'estimated_time': resource_info['time'],
            'resources': resource_info['resources'],
            'roles_needed': sum(1 for m in job_matches[:5] if skill in m['missing_required'] or skill in m['missing_preferred']),
        })
    
    return learning_path


# ============================================
# GENERATE INSIGHTS
# ============================================

def generate_insights(found_skills, sections, ats_score, job_matches):
    """Generate AI-powered insights about the resume."""
    skill_names = set(found_skills.keys())
    categorized = categorize_skills(found_skills)
    
    strengths = []
    improvements = []
    
    # Strengths analysis
    if len(found_skills) >= 10:
        strengths.append('Impressive breadth of technical skills — you demonstrate versatility across multiple domains')
    elif len(found_skills) >= 5:
        strengths.append('Good range of technical skills with clear domain expertise')
    
    if 'programming' in categorized and len(categorized['programming']) >= 2:
        langs = ', '.join(categorized['programming'][:3])
        strengths.append(f'Strong programming foundation ({langs})')
    
    if 'ml_ai' in categorized and len(categorized['ml_ai']) >= 2:
        strengths.append('Solid AI/ML knowledge — one of the fastest-growing domains in 2026')
    
    if 'cloud' in categorized:
        strengths.append('Cloud computing skills give you a significant competitive advantage')
    
    if sections.get('experience', '').strip():
        strengths.append('Work experience section is present and provides career context')
    
    if sections.get('education', '').strip():
        strengths.append('Education section properly documented')
    
    if 'data' in categorized and len(categorized['data']) >= 2:
        strengths.append('Strong data skills — highly valued across all tech roles')
    
    # Improvements analysis
    if len(found_skills) < 5:
        improvements.append('Add more technical skills — resumes with 8+ skills get 40% more callbacks')
    
    if 'ml_ai' not in categorized:
        improvements.append('Consider adding AI/ML skills — demand has surged 87% YoY')
    
    if 'cloud' not in categorized:
        improvements.append('Add cloud platform experience (AWS/GCP/Azure) — required in 65% of tech roles')
    
    if not sections.get('projects', '').strip():
        improvements.append('Add a Projects section — showcasing practical work increases interview chances by 35%')
    
    if not sections.get('certifications', '').strip():
        improvements.append('Include certifications — they can increase salary offers by 15-25%')
    
    if not re.search(r'\d+[\%\+]', sections.get('experience', '')):
        improvements.append('Add quantifiable achievements (percentages, metrics) to your experience bullets')
    
    if not re.search(r'linkedin', str(sections.get('contact', '')), re.IGNORECASE):
        improvements.append('Add your LinkedIn profile URL — 87% of recruiters check LinkedIn')
    
    top_match = job_matches[0] if job_matches else None
    if top_match and top_match['match_percentage'] < 60:
        improvements.append(f'Focus on building skills for "{top_match["role"]}" — currently at {top_match["match_percentage"]}% match')
    
    return {
        'strengths': strengths[:6],
        'improvements': improvements[:6],
    }


# ============================================
# API ENDPOINTS
# ============================================

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    """Main endpoint: accepts resume file, returns comprehensive analysis."""
    
    if 'resume' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload PDF or DOCX'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        file.save(filepath)
        
        # 1. Extract text
        ext = filename.rsplit('.', 1)[1].lower()
        if ext == 'pdf':
            text = extract_text_from_pdf(filepath)
        elif ext in ('doc', 'docx'):
            text = extract_text_from_docx(filepath)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400
        
        if not text.strip():
            return jsonify({'error': 'Could not extract text from the file. The file may be empty or image-based.'}), 400
        
        # 2. Parse sections
        sections = parse_resume_sections(text)
        
        # 3. Extract skills
        found_skills = extract_skills(text)
        categorized = categorize_skills(found_skills)
        
        # 4. Calculate ATS score
        ats_score, score_breakdown = calculate_ats_score(text, found_skills, sections)
        
        # 5. Match jobs
        job_matches = match_jobs(found_skills)
        
        # 6. Analyze skill gaps
        learning_path = analyze_skill_gaps(found_skills, job_matches)
        
        # 7. Generate insights
        insights = generate_insights(found_skills, sections, ats_score, job_matches)
        
        # Build response
        response = {
            'success': True,
            'filename': file.filename,
            'word_count': len(text.split()),
            'ats_score': ats_score,
            'score_breakdown': score_breakdown,
            'skills': {
                'total_count': len(found_skills),
                'categorized': categorized,
                'all_skills': list(found_skills.keys()),
            },
            'job_matches': job_matches[:8],
            'learning_path': learning_path,
            'insights': insights,
            'resume_sections': {
                'has_summary': bool(sections.get('summary', '').strip()),
                'has_experience': bool(sections.get('experience', '').strip()),
                'has_education': bool(sections.get('education', '').strip()),
                'has_skills': bool(sections.get('skills', '').strip()),
                'has_projects': bool(sections.get('projects', '').strip()),
                'has_certifications': bool(sections.get('certifications', '').strip()),
            }
        }

        # 8. Save to database if the request came from a logged-in user
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            current_user = get_user_from_token(token)
            if current_user:
                save_resume_record(
                    token, current_user.get('id'), file.filename, ats_score,
                    list(found_skills.keys()), job_matches[:8], learning_path
                )
                response['saved'] = True

        return jsonify(response)
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
    finally:
        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route('/api/signup', methods=['POST'])
def signup():
    """Create a new user account via Supabase Auth."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return jsonify({'error': 'Auth is not configured on the server'}), 500

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    if not phone:
        return jsonify({'error': 'Phone number is required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/auth/v1/signup',
            headers={'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json'},
            json={'email': email, 'password': password, 'data': {'name': name, 'phone': phone}},
            timeout=10
        )
        result = resp.json()

        if resp.status_code >= 400:
            msg = result.get('msg') or result.get('error_description') or result.get('error') or 'Signup failed'
            return jsonify({'error': msg}), resp.status_code

        return jsonify({
            'success': True,
            'message': 'Account created successfully.',
            'user': {
                'id': result.get('id') or (result.get('user') or {}).get('id'),
                'email': result.get('email') or (result.get('user') or {}).get('email'),
                'name': name,
            }
        })
    except http_requests.exceptions.RequestException:
        return jsonify({'error': 'Could not reach authentication service'}), 502


@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate an existing user via Supabase Auth."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return jsonify({'error': 'Auth is not configured on the server'}), 500

    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/auth/v1/token?grant_type=password',
            headers={'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json'},
            json={'email': email, 'password': password},
            timeout=10
        )
        result = resp.json()

        if resp.status_code >= 400:
            msg = result.get('error_description') or result.get('msg') or 'Invalid email or password'
            return jsonify({'error': msg}), 401

        user = result.get('user', {})
        access_token = result.get('access_token')
        name = (user.get('user_metadata') or {}).get('name', '')
        phone = (user.get('user_metadata') or {}).get('phone', '')

        upsert_profile(access_token, user.get('id'), name=name, phone=phone, email=user.get('email', ''))

        return jsonify({
            'success': True,
            'access_token': access_token,
            'user': {
                'id': user.get('id'),
                'email': user.get('email'),
                'name': name,
                'phone': phone,
            }
        })
    except http_requests.exceptions.RequestException:
        return jsonify({'error': 'Could not reach authentication service'}), 502


@app.route('/api/resumes', methods=['GET'])
def get_resumes():
    """Return the logged-in user's saved resume analysis history."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Login required'}), 401

    token = auth_header[7:].strip()
    current_user = get_user_from_token(token)
    if not current_user:
        return jsonify({'error': 'Invalid or expired session'}), 401

    try:
        resp = http_requests.get(
            f'{SUPABASE_URL}/rest/v1/resumes',
            headers={
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': f'Bearer {token}',
            },
            params={
                'user_id': f'eq.{current_user.get("id")}',
                'order': 'created_at.desc',
            },
            timeout=10
        )
        if resp.status_code >= 400:
            return jsonify({'error': 'Could not load resume history'}), 502
        return jsonify({'success': True, 'resumes': resp.json()})
    except http_requests.exceptions.RequestException:
        return jsonify({'error': 'Could not reach database'}), 502


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'JobAnalyzer Resume API',
        'version': '1.0.0',
        'skills_tracked': sum(len(v) for v in SKILLS_DATABASE.values()),
        'job_roles': len(JOB_ROLES),
    })


# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    print("\n" + "=" * 55)
    print("  🚀 JobAnalyzer Resume API Server")
    print("=" * 55)
    print(f"  📍 Running on: http://localhost:5000")
    print(f"  📊 Skills tracked: {sum(len(v) for v in SKILLS_DATABASE.values())}")
    print(f"  💼 Job roles: {len(JOB_ROLES)}")
    print(f"  📁 Upload folder: {UPLOAD_FOLDER}")
    print("=" * 55 + "\n")
    
    app.run(debug=True, port=5000)
