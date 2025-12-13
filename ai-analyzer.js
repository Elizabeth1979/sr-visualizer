/**
 * AI Analyzer - Gemini Multimodal Integration
 * Uses Gemini Vision API to compare visual content with screen reader output
 */

// API Configuration
let apiKey = null;

/**
 * Set the Gemini API key
 */
export function setApiKey(key) {
    apiKey = key;
    localStorage.setItem('gemini_api_key', key);
}

/**
 * Get the stored API key
 */
export function getApiKey() {
    if (apiKey) return apiKey;
    apiKey = localStorage.getItem('gemini_api_key');
    return apiKey;
}

/**
 * Check if API key is configured
 */
export function hasApiKey() {
    return !!getApiKey();
}

/**
 * Clear the stored API key
 */
export function clearApiKey() {
    apiKey = null;
    localStorage.removeItem('gemini_api_key');
}

/**
 * Capture an element as a base64 image using html2canvas
 */
export async function capturePreview(container) {
    const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')).default;
    const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
    });
    return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Analyze all issues in batch
 */
export async function analyzeIssuesWithGemini(issues, imageBase64, analysisResults) {
    const key = getApiKey();
    if (!key) {
        throw new Error('Gemini API key not configured');
    }

    // Build context from screen reader announcements
    const srContext = analysisResults.map(r => r.announcement).join('\n');

    const prompt = `You are an expert web accessibility auditor. Analyze this webpage screenshot and the detected accessibility issues.

SCREEN READER ANNOUNCEMENTS:
${srContext}

DETECTED ISSUES:
${issues.map((issue, i) => `${i + 1}. ${issue.type}: ${issue.description}`).join('\n')}

For each issue, provide:
1. A specific, actionable fix
2. For images without alt text: suggest appropriate alt text based on what you see in the image
3. For unlabeled buttons: suggest an appropriate aria-label based on the button's visual appearance (icon meaning)
4. For fake buttons: explain why using semantic HTML matters

Respond as a JSON object with this structure:
{
  "issues": [
    {
      "issueIndex": 0,
      "aiSuggestion": "specific suggestion with exact code",
      "confidence": "high/medium/low",
      "explanation": "why this fix is recommended"
    }
  ],
  "overallScore": 0-100,
  "summary": "brief accessibility summary"
}`;

    console.log('🔑 Making Gemini API call with key:', key.substring(0, 8) + '...');
    console.log('📸 Image data length:', imageBase64.length);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key=${key}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'image/png',
                                data: imageBase64
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json'
                }
            })
        }
    );

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
        const error = await response.json();
        console.error('❌ Gemini API error:', error);
        throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response from Gemini');
    }

    try {
        return JSON.parse(text);
    } catch {
        console.warn('Failed to parse Gemini response as JSON:', text);
        return {
            issues: [],
            summary: text,
            overallScore: null
        };
    }
}



/**
 * Test the API connection
 */
export async function testApiConnection() {
    const key = getApiKey();
    if (!key) {
        throw new Error('No API key configured');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );

    if (!response.ok) {
        throw new Error('Invalid API key or API error');
    }

    return true;
}
