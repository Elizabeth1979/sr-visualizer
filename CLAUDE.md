# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SR Visualizer is a client-side accessibility testing tool that helps sighted developers understand how screen reader users experience web pages. It combines virtual screen reader simulation with WCAG violation detection and optional AI-powered fix suggestions.

**Key Characteristic**: This is a dependency-free web application that loads all external libraries from CDNs. There is no build process, no package.json, and no npm dependencies to install.

## Running the Project

```bash
# Start local development server
npx serve .

# Open browser to http://localhost:3000
```

Alternative serving methods:
- `python -m http.server 3000`
-           ´´    ´`php -S localhost:3000`
- Any static file server

## Architecture

### Module System

The application uses ES modules with dynamic imports from CDNs. Key architectural pattern:

1. **app.js** - Main orchestrator that coordinates all modules
2. **sr-visualizer.js** - Virtual Screen Reader integration (primary analysis)
3. **axe-analyzer.js** - Axe-core WCAG testing (secondary analysis)
4. **issue-detector.js** - Custom DOM scanning (fallback/supplementary)
5. **ai-analyzer.js** - Optional Gemini Vision API integration

### Data Flow

```
User loads HTML → app.js coordinates analysis → Parallel execution:
├─ sr-visualizer.js: Virtual SR traverses DOM → Streams announcements to UI
└─ axe-analyzer.js: Runs WCAG checks → Displays violations

Optional: User clicks "AI Enhance" → ai-analyzer.js:
├─ Captures screenshot with html2canvas
├─ Sends to Gemini Vision API with context
└─ Returns contextual fix suggestions
```

### Virtual Screen Reader Integration

`sr-visualizer.js` uses the GuidePup Virtual Screen Reader library:
- Dynamically imported from unpkg.com
- Traverses DOM using `vsr.start()`, `vsr.next()`, `vsr.lastSpokenPhrase()`
- Streams results progressively (max 500 iterations)
- Falls back to `analyzeContainerSimple()` if VSR fails
- Categories: landmark, heading, interactive, form, content

**Important**: Always handle VSR failures gracefully. The `analyzeContainerSimple()` fallback directly scans DOM using selectors.

### Axe-core Integration

`axe-analyzer.js` loads axe-core from jsDelivr:
- Tests against: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice
- Returns violations and incomplete checks
- Impact levels: critical, serious, moderate, minor
- Each violation includes helpUrl for documentation

### AI Enhancement (Optional)

`ai-analyzer.js` integrates Gemini Vision API:
- Uses html2canvas to capture preview screenshot
- Sends image + issues + SR context to Gemini
- Expects JSON response with fix suggestions
- API key stored in localStorage
- Model: `gemini-3-pro` (multimodal)

**API Key Flow**: User clicks "AI Enhance" → Prompt for key if not stored → Capture + analyze → Display suggestions on issue cards

### State Management

Global state in `app.js`:
- `analysisResults[]` - Array of SR announcements with category
- `currentIndex` - Currently highlighted announcement
- `previewContainer` - DOM reference to preview frame
- `axeResults` - Object with violations/incomplete/passes

### UI Architecture

Three-panel layout (defined in index.html):
1. **Left**: Input section (collapsible) with tabs for samples vs. paste HTML
2. **Center**: Live preview of HTML content
3. **Right**: Split panel:
   - Top: Screen reader announcements (streaming list)
   - Bottom: Accessibility issues (axe violations + optional AI suggestions)

Navigation: Prev/Next buttons cycle through `analysisResults[]` and highlight corresponding announcement.

## Sample Pages

Three templates embedded in index.html:
- `#sample-good` - Accessible page with proper landmarks, labels, headings
- `#sample-bad` - Problematic page with divs, onclick handlers, missing alt text
- `#sample-form` - Form example with labels, one intentionally unlabeled input

Used for demonstration and testing during development.

## CDN Dependencies

All external libraries loaded at runtime (no bundling):
- `@guidepup/virtual-screen-reader` from unpkg.com
- `axe-core@4.8.4` from cdn.jsdelivr.net
- `html2canvas@1.4.1` from cdn.jsdelivr.net
- Google Fonts: Space Grotesk (headings), DM Sans (body)

**When modifying**: Be aware that changing CDN URLs may affect loading. Always test with browser DevTools Network tab.

## Styling

`styles.css` uses CSS custom properties (variables):
- Dark theme: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- Yellow accent color system
- Font families: Space Grotesk (headings), DM Sans (body)
- No CSS preprocessor or build step

## Common Development Patterns

### Adding a New Analysis Module

1. Create new .js file with ES module exports
2. Import in app.js: `import { function } from './module.js'`
3. Call during `loadAndAnalyze()` - either parallel or sequential
4. Stream results to UI or batch update

### Handling Errors

Both SR and Axe analysis wrapped in try/catch:
- VSR errors → fallback to `analyzeContainerSimple()`
- Axe errors → display error message in issues panel
- AI errors → show retry button, preserve API key

### Streaming vs. Batch Updates

- **SR analysis**: Streams results via `onProgress` callback (better UX for slow traversal)
- **Axe analysis**: Batch renders after completion (fast enough to not need streaming)

## API Integration Notes

Gemini API (ai-analyzer.js):
- Endpoint: `generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent`
- Requires base64 image + text prompt
- Response: JSON with `issues[]` array containing `aiSuggestion` and `explanation`
- Temperature: 0.3 (prefer deterministic suggestions)
- Max tokens: 2048

## Accessibility Considerations

This tool itself should be accessible:
- Proper semantic HTML in index.html
- ARIA labels on icon buttons (collapse toggle, nav buttons)
- Keyboard navigation support
- Screen reader announcements for dynamic content updates

When modifying UI, test with real screen readers if possible.

## Browser Compatibility

Requires modern browser with:
- ES modules support
- Dynamic import() support
- Fetch API
- LocalStorage
- HTML5 Canvas (for html2canvas)

Tested primarily in Chrome/Edge. Safari and Firefox should work but may have minor rendering differences.
