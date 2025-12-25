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

    const prompt = `You are an expert web accessibility auditor. Analyze this webpage screenshot and detected issues.

SCREEN READER OUTPUT:
${srContext}

WCAG VIOLATIONS DETECTED:
${issues.map((issue, i) => {
    const nodesDetail = issue.nodes ? issue.nodes.map((node, j) =>
        `  Node ${j + 1}:
  - HTML: ${node.html}
  - Selector: ${node.target}
  - Problem: ${node.failureSummary}
  - Axe Suggestion: ${node.axeFixes || 'None'}`
    ).join('\n') : '';

    return `${i + 1}. [${issue.impact.toUpperCase()}] ${issue.help}
${nodesDetail}
WCAG: ${issue.wcagTags ? issue.wcagTags.join(', ') : 'N/A'}`;
}).join('\n\n')}

For each violation, provide:
1. EXACT code fix (before/after HTML)
2. For images: suggest specific alt text based on visual content
3. For buttons: suggest aria-label based on visual appearance
4. Cross-reference with screen reader output to explain user impact

Respond as JSON:
{
  "issues": [{
    "issueIndex": 0,
    "beforeCode": "current HTML",
    "afterCode": "fixed HTML",
    "aiSuggestion": "concise fix description",
    "confidence": "high/medium/low",
    "explanation": "why this matters for screen reader users"
  }],
  "overallScore": 0-100,
  "summary": "brief summary"
}`;

    console.log('🔑 Making Gemini API call with key:', key.substring(0, 8) + '...');
    console.log('📸 Image data length:', imageBase64.length);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`,
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
        const parsed = JSON.parse(text);

        // Validate response structure
        if (!parsed || typeof parsed !== 'object') {
            console.warn('⚠️ Invalid AI response structure');
            return {
                issues: [],
                summary: text.substring(0, 500),
                parseError: true
            };
        }

        // Ensure issues array exists and filter invalid entries
        if (!Array.isArray(parsed.issues)) {
            console.warn('⚠️ AI response missing issues array');
            parsed.issues = [];
        } else {
            // Filter out invalid issues
            const validIssues = parsed.issues.filter(issue =>
                issue.hasOwnProperty('issueIndex') && issue.aiSuggestion
            );

            if (validIssues.length < parsed.issues.length) {
                console.warn(`⚠️ Filtered ${parsed.issues.length - validIssues.length} invalid issue(s)`);
            }

            parsed.issues = validIssues;
        }

        console.log(`✅ AI returned ${parsed.issues.length} valid suggestion(s)`);
        return parsed;

    } catch (error) {
        console.error('❌ JSON parse failed:', error);
        console.warn('Raw response (first 200 chars):', text.substring(0, 200));
        return {
            issues: [],
            summary: text.substring(0, 500),
            overallScore: null,
            parseError: true
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
