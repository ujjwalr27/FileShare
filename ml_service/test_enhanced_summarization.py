"""
Test script for enhanced summarization features
Demonstrates the improved document analysis and bullet point generation
"""

import requests
import json

# Configuration
ML_SERVICE_URL = "http://127.0.0.1:8001"

# Sample long document for testing
SAMPLE_DOCUMENT = """
Machine Learning and Artificial Intelligence in Modern Healthcare

Introduction
The integration of machine learning and artificial intelligence in healthcare has revolutionized patient care and medical research. These technologies are transforming diagnosis, treatment planning, and drug discovery processes across the medical field.

Deep Learning Applications
Deep learning models have shown remarkable success in medical imaging. Convolutional neural networks can now detect diseases like cancer, diabetic retinopathy, and pneumonia with accuracy comparable to expert radiologists. These systems analyze thousands of medical images in seconds, providing rapid preliminary diagnoses.

Natural Language Processing in Healthcare
Natural language processing (NLP) technologies are being used to extract valuable insights from electronic health records. These systems can identify patterns in patient symptoms, predict disease progression, and recommend personalized treatment plans. NLP also helps in automating medical documentation, reducing the administrative burden on healthcare professionals.

Predictive Analytics
Machine learning algorithms can predict patient outcomes by analyzing historical data. These predictive models help identify high-risk patients, enabling early intervention and preventive care. Hospitals use these systems to optimize resource allocation and improve patient flow management.

Drug Discovery and Development
AI is accelerating drug discovery by analyzing molecular structures and predicting drug interactions. Machine learning models can screen millions of compounds in days, a process that traditionally took years. This has significant implications for developing treatments for rare diseases and personalizing medicine.

Challenges and Considerations
Despite the benefits, there are important challenges to address. Data privacy concerns, algorithmic bias, and the need for regulatory frameworks are critical issues. Healthcare providers must ensure that AI systems are transparent, explainable, and aligned with medical ethics.

The Future of AI in Healthcare
The future holds even more promise with the development of more sophisticated AI models. Quantum computing may further enhance drug discovery capabilities. Wearable devices integrated with AI will enable continuous health monitoring and early disease detection.

Conclusion
Artificial intelligence and machine learning are not replacing healthcare professionals but augmenting their capabilities. The collaboration between AI systems and medical experts is creating a new paradigm in healthcare delivery, promising better outcomes for patients worldwide.
"""

def test_basic_summarization():
    """Test basic text summarization"""
    print("\n" + "="*80)
    print("TEST 1: Basic Text Summarization")
    print("="*80)
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/api/summarization/summarize",
            json={
                "text": SAMPLE_DOCUMENT,
                "max_length": 150,
                "min_length": 50
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()['data']
            print(f"\n✅ Summary Generated:")
            print(f"   Summary: {data['summary']}")
            print(f"\n📊 Statistics:")
            print(f"   Original Length: {data['original_length']} words")
            print(f"   Summary Length: {data['summary_length']} words")
            print(f"   Compression Ratio: {data['compression_ratio']}")
            print(f"   Chunks Processed: {data['chunks_processed']}")
            
            if 'document_structure' in data:
                print(f"\n📄 Document Structure:")
                structure = data['document_structure']
                print(f"   Total Sentences: {structure['total_sentences']}")
                print(f"   Total Words: {structure['total_words']}")
                print(f"   Avg Sentence Length: {structure['avg_sentence_length']}")
                if structure.get('headings'):
                    print(f"   Headings Found: {', '.join(structure['headings'][:3])}")
            
            if 'key_phrases' in data:
                print(f"\n🔑 Key Phrases:")
                print(f"   {', '.join(data['key_phrases'][:8])}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_bullet_points():
    """Test enhanced bullet point generation"""
    print("\n" + "="*80)
    print("TEST 2: Enhanced Bullet Point Generation")
    print("="*80)
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/api/summarization/bullet-points",
            json={
                "text": SAMPLE_DOCUMENT,
                "num_points": 7
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()['data']
            print(f"\n✅ Bullet Points Generated:")
            for i, bullet in enumerate(data['bullets'], 1):
                print(f"   {i}. {bullet}")
            
            print(f"\n📊 Statistics:")
            print(f"   Number of Points: {data['num_points']}")
            print(f"   Original Length: {data['original_length']} words")
            print(f"   Method: {data.get('method', 'N/A')}")
            
            if 'key_phrases' in data:
                print(f"\n🔑 Key Phrases Identified:")
                print(f"   {', '.join(data['key_phrases'][:8])}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_key_points():
    """Test improved key point extraction"""
    print("\n" + "="*80)
    print("TEST 3: Advanced Key Point Extraction")
    print("="*80)
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/api/summarization/key-points",
            json={
                "text": SAMPLE_DOCUMENT,
                "top_k": 5
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()['data']
            print(f"\n✅ Key Points Extracted:")
            for i, point in enumerate(data['key_points'], 1):
                print(f"   {i}. {point}")
            
            print(f"\n📊 Statistics:")
            print(f"   Number of Points: {data['num_points']}")
            print(f"   Original Length: {data['original_length']} words")
            print(f"   Method: {data.get('method', 'N/A')}")
            
            if 'key_phrases' in data:
                print(f"\n🔑 Key Phrases:")
                print(f"   {', '.join(data['key_phrases'][:8])}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_comprehensive_analysis():
    """Test comprehensive document analysis"""
    print("\n" + "="*80)
    print("TEST 4: Comprehensive Document Analysis")
    print("="*80)
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/api/summarization/analyze",
            json={
                "text": SAMPLE_DOCUMENT
            },
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()['data']
            
            print(f"\n📝 FULL SUMMARY:")
            print(f"   {data['summary']}")
            
            print(f"\n📌 BULLET POINTS:")
            for i, bullet in enumerate(data['bullet_points'], 1):
                print(f"   {i}. {bullet}")
            
            print(f"\n🎯 KEY POINTS:")
            for i, point in enumerate(data['key_points'], 1):
                print(f"   {i}. {point}")
            
            print(f"\n🔑 KEY PHRASES:")
            print(f"   {', '.join(data['key_phrases'][:10])}")
            
            print(f"\n📄 DOCUMENT STRUCTURE:")
            structure = data['document_structure']
            print(f"   Total Sentences: {structure['total_sentences']}")
            print(f"   Total Words: {structure['total_words']}")
            print(f"   Total Paragraphs: {structure['total_paragraphs']}")
            print(f"   Avg Sentence Length: {structure['avg_sentence_length']} words")
            if structure.get('headings'):
                print(f"   Headings: {', '.join(structure['headings'])}")
            
            print(f"\n📊 STATISTICS:")
            stats = data['statistics']
            print(f"   Total Words: {stats['total_words']}")
            print(f"   Total Sentences: {stats['total_sentences']}")
            print(f"   Total Characters: {stats['total_characters']}")
            print(f"   Avg Sentence Length: {stats['avg_sentence_length']} words")
            print(f"   Estimated Reading Time: {stats['estimated_reading_time_minutes']} minutes")
            
            print(f"\n📉 COMPRESSION:")
            print(f"   Compression Ratio: {data['compression_ratio']}")
            print(f"   Chunks Processed: {data['chunks_processed']}")
            
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_short_text():
    """Test with short text"""
    print("\n" + "="*80)
    print("TEST 5: Short Text Handling")
    print("="*80)
    
    short_text = "Machine learning is transforming healthcare. AI models can now diagnose diseases with high accuracy. This technology is improving patient outcomes."
    
    try:
        response = requests.post(
            f"{ML_SERVICE_URL}/api/summarization/analyze",
            json={
                "text": short_text
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()['data']
            print(f"\n✅ Analysis Complete:")
            print(f"   Summary: {data['summary']}")
            print(f"   Bullet Points: {data['bullet_points']}")
            print(f"   Reading Time: {data['statistics']['estimated_reading_time_minutes']} minutes")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def check_service_health():
    """Check if ML service is running"""
    try:
        response = requests.get(f"{ML_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ ML Service is running")
            return True
        else:
            print("⚠️  ML Service returned unexpected status")
            return False
    except requests.exceptions.RequestException:
        print("❌ ML Service is not running. Please start it first:")
        print("   cd ml-service")
        print("   python main.py")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("ENHANCED SUMMARIZATION SERVICE - TEST SUITE")
    print("="*80)
    
    # Check service health
    if not check_service_health():
        return
    
    # Run tests
    test_basic_summarization()
    test_bullet_points()
    test_key_points()
    test_comprehensive_analysis()
    test_short_text()
    
    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)
    print("\n✨ Enhanced Features:")
    print("   ✅ Handles entire documents (no truncation)")
    print("   ✅ Intelligent chunking for long texts")
    print("   ✅ Advanced sentence scoring for bullet points")
    print("   ✅ Document structure analysis")
    print("   ✅ Key phrase extraction")
    print("   ✅ Reading time estimation")
    print("   ✅ Comprehensive document analysis endpoint")
    print()


if __name__ == "__main__":
    main()
