# pyrefly: ignore [missing-import]
import google.generativeai as genai
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_KEY"))

for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        if any(x in m.name for x in ["flash", "pro"]) and "preview" not in m.name and "tts" not in m.name:
            print(m.name)