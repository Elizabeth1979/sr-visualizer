# SR Visualizer

A tool to help sighted developers understand how screen reader users experience web pages.

![Screenshot](/Users/elizabethp/.gemini/antigravity/brain/80cd6039-b81b-45b7-9369-72af5730be63/ai_panel_display_1765648675967.png)

## Features

- **Screen Reader Simulation** - Uses [GuidePup Virtual Screen Reader](https://github.com/guidepup/virtual-screen-reader) to simulate what screen readers announce
- **WCAG Violation Detection** - Integrates [axe-core](https://github.com/dequelabs/axe-core) for comprehensive accessibility testing
- **AI Enhancement** - Optional Gemini AI integration for contextual fix suggestions
- **Streaming Output** - Results appear in real-time as the page is analyzed

## Quick Start

```bash
# No install needed - just serve the files
npx serve .

# Open http://localhost:3000
```

## How It Works

1. **Load Content** - Select a sample page or paste HTML
2. **View Announcements** - See what screen readers would say for each element
3. **Review Issues** - Axe-core finds WCAG violations with severity levels
4. **Get AI Suggestions** - Optionally connect Gemini for smart fix recommendations

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main UI with tabs and samples |
| `styles.css` | Dark theme styling |
| `app.js` | Application logic and UI coordination |
| `sr-visualizer.js` | Virtual Screen Reader integration |
| `axe-analyzer.js` | Axe-core WCAG testing |
| `issue-detector.js` | Custom accessibility issue detection |
| `ai-analyzer.js` | Gemini AI integration |

## AI Enhancement (Optional)

To enable AI-powered suggestions:

1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click "🤖 AI Enhance" in the issues panel
3. Enter your API key

The AI analyzes screenshots and suggests contextual fixes like:
- Appropriate alt text for images
- Meaningful labels for icon buttons
- Semantic HTML improvements

## Technologies

- **Virtual Screen Reader** - Client-side screen reader simulation (no real SR needed)
- **Axe-core** - Industry-standard WCAG testing engine
- **Gemini Vision API** - Multimodal AI for visual context analysis
- **html2canvas** - Screenshot capture for AI analysis

## Development

The app uses ES modules loaded from CDNs - no build step required:

```javascript
// Virtual Screen Reader from unpkg
import('https://unpkg.com/@guidepup/virtual-screen-reader/lib/esm/index.browser.js')

// Axe-core from jsDelivr  
import('https://cdn.jsdelivr.net/npm/axe-core@4.8.4/+esm')

// html2canvas for screenshots
import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')
```

## License

MIT
