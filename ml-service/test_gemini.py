"""
Quick test script to verify Gemini API integration
Run this after setting up your GEMINI_API_KEY in .env file
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test text
test_text = """
Artificial Intelligence (AI) has revolutionized the way we live and work in the 21st century. 
From self-driving cars to personalized recommendations on streaming platforms, AI is everywhere. 
Machine learning, a subset of AI, enables computers to learn from data without being explicitly programmed. 
Deep learning, which uses neural networks with multiple layers, has achieved breakthrough results in 
image recognition, natural language processing, and game playing. Companies like Google, Amazon, and 
Microsoft are investing billions in AI research and development. However, AI also raises important 
ethical questions about privacy, bias, and job displacement. As AI continues to advance, society 
must grapple with how to harness its benefits while mitigating potential risks.
"""

def test_gemini_api():
    """Test if Gemini API is configured correctly"""
    api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key or api_key == 'your_gemini_api_key_here':
        print("❌ GEMINI_API_KEY not set in .env file")
        print("\nPlease:")
        print("1. Get your API key from: https://makersuite.google.com/app/apikey")
        print("2. Add it to the .env file: GEMINI_API_KEY=your_actual_key")
        return False
    
    print("✓ API key found in environment")
    
    try:
        import google.generativeai as genai
        print("✓ google-generativeai package installed")
    except ImportError:
        print("❌ google-generativeai not installed")
        print("\nRun: pip install google-generativeai>=0.3.0")
        return False
    
    try:
        # Configure and test API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("✓ Gemini API configured")
        
        # Test summarization
        print("\n" + "="*60)
        print("Testing Summarization...")
        print("="*60)
        
        prompt = f"""Summarize the following text in 2-3 sentences:

{test_text}

Summary:"""
        
        response = model.generate_content(prompt)
        summary = response.text.strip()
        
        print("\nOriginal text length:", len(test_text.split()), "words")
        print("\nGenerated Summary:")
        print(summary)
        print("\nSummary length:", len(summary.split()), "words")
        
        print("\n" + "="*60)
        print("✅ SUCCESS! Gemini API is working correctly")
        print("="*60)
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing Gemini API: {e}")
        print("\nPossible issues:")
        print("- Invalid API key")
        print("- Network connection problem")
        print("- API quota exceeded")
        return False

if __name__ == "__main__":
    print("="*60)
    print("Gemini API Integration Test")
    print("="*60)
    print()
    
    success = test_gemini_api()
    
    if success:
        print("\n✅ Your Gemini API setup is complete!")
        print("You can now start the ML service with:")
        print("  uvicorn main:app --host 0.0.0.0 --port 8001")
    else:
        print("\n❌ Setup incomplete. Please fix the issues above.")
