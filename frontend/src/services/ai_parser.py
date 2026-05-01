import sys
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(dotenv_path)

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print(json.dumps({"error": "GEMINI_API_KEY not found in environment"}))
    sys.exit(1)

api_key = api_key.replace('"', '').replace("'", "").strip()
genai.configure(api_key=api_key)

# Model list to try in order of preference
MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "models/gemini-1.5-flash", "gemini-pro", "models/gemini-pro"]

def clean_and_validate_json(raw_text):
    text = raw_text.strip()
    if text.startswith('```'):
        lines = text.split('\n')
        if lines[0].startswith('```'): lines = lines[1:]
        if lines and lines[-1].strip() == '```': lines = lines[:-1]
        text = '\n'.join(lines).strip()
    try:
        return json.dumps(json.loads(text))
    except:
        import re
        match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
        if match:
            try: return json.dumps(json.loads(match.group(1)))
            except: pass
        return json.dumps({"error": "Malformed AI response", "raw": text[:100]})

def call_gemini_with_fallback(prompt):
    """Tries multiple model names until one works."""
    errors = []
    for model_name in MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            errors.append(f"{model_name}: {str(e)}")
            if "404" in str(e) or "not found" in str(e).lower():
                continue # Try next model
            # We can also continue on 400 for safety instead of strictly failing
            continue
    raise Exception(f"All models failed. Errors: { ' | '.join(errors) }")

def parse_sms(text):
    try:
        prompt = f"Parse this SMS into JSON: {text}. ONLY return JSON with keys: title, amount, category."
        res_text = call_gemini_with_fallback(prompt)
        return clean_and_validate_json(res_text)
    except Exception as e:
        return json.dumps({"error": str(e)})

def parse_csv(csv_data):
    try:
        prompt = f"Parse this CSV into a JSON array: {csv_data}. ONLY return JSON with keys: title, amount, category, date (in YYYY-MM-DD format if available)."
        res_text = call_gemini_with_fallback(prompt)
        return clean_and_validate_json(res_text)
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    input_data = sys.stdin.read().strip()
    if command == "sms": print(parse_sms(input_data))
    elif command == "csv": print(parse_csv(input_data))
    else: print(json.dumps({"error": "Invalid command"}))
