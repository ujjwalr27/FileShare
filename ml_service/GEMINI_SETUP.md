# Gemini API Setup Guide

The summarization service now uses **Google Gemini API** for high-quality document summarization.

## Quick Setup

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure the ML Service

1. Open the `.env` file in the `ml-service` directory
2. Replace `your_gemini_api_key_here` with your actual API key:

```env
GEMINI_API_KEY=AIzaSyC...your_actual_key_here
```

### 3. Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

### 4. Start the ML Service

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

## What Changed?

### Removed:
- ❌ PyTorch and heavy transformer models (saved ~3GB disk space)
- ❌ BART, Pegasus, T5, LED models
- ❌ Complex chunking and model loading logic

### Added:
- ✅ Google Gemini API (gemini-1.5-flash)
- ✅ Fast, cloud-based summarization
- ✅ Better quality summaries
- ✅ No local GPU/CPU intensive processing

## Features

The API endpoints remain the same:

- **POST /summarize** - Generate text summary
- **POST /bullet-points** - Generate bullet-point summary
- **POST /key-points** - Extract key sentences
- **POST /analyze** - Comprehensive document analysis

## Benefits of Gemini API

1. **No Large Models** - No need to download multi-GB models
2. **Fast Processing** - Cloud-based inference is quick
3. **High Quality** - Google's latest AI technology
4. **Cost Effective** - Free tier available, pay-as-you-go pricing
5. **Long Context** - Can handle very long documents

## Pricing

- **Free Tier**: 15 requests per minute, 1 million tokens per day
- **Paid**: Very affordable pay-as-you-go pricing

For most use cases, the free tier is more than sufficient!

## Troubleshooting

### Error: "GEMINI_API_KEY not set"
- Make sure you've added your API key to the `.env` file
- Restart the ML service after updating the `.env` file

### Error: API quota exceeded
- You've hit the free tier limits
- Wait a minute and try again, or upgrade to paid tier

### Error: Invalid API key
- Double-check your API key is correct
- Regenerate the key from Google AI Studio if needed

## API Reference

[Google AI Generative API Documentation](https://ai.google.dev/docs)
