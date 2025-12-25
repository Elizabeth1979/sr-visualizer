/**
 * SR Visualizer - Main Application
 */

import {
    analyzeContainer,
    analyzeContainerSimple
} from './sr-visualizer.js';

import {
    runAxeAnalysis,
    getImpactIcon,
    formatWcagTags
} from './axe-analyzer.js';

import {
    hasApiKey,
    setApiKey,
    clearApiKey,
    capturePreview,
    analyzeIssuesWithGemini
} from './ai-analyzer.js';

// State
let analysisResults = [];
let currentIndex = 0;
let previewContainer = null;
let axeResults = null;

// DOM Elements
const tabButtons = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const sampleCards = document.querySelectorAll('.sample-card');
const htmlInput = document.getElementById('html-input');
const analyzeBtn = document.getElementById('analyze-btn');
const previewFrame = document.getElementById('preview-frame');
const announcementList = document.getElementById('announcement-list');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const elementCounter = document.getElementById('element-counter');
const issuesContent = document.getElementById('issues-content');
const enhanceAiBtn = document.getElementById('enhance-ai-btn');
const apiKeyModal = document.getElementById('api-key-modal');
const startScreen = document.getElementById('start-screen');
const mainContent = document.getElementById('main-content');
const newAnalysisBtn = document.getElementById('new-analysis-btn');
const modalApiKeyInput = document.getElementById('modal-api-key-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalError = document.getElementById('modal-error');
const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
const ttsToggleBtn = document.getElementById('tts-toggle-btn');
const ttsIndicator = document.getElementById('tts-indicator');
const aiSection = document.getElementById('ai-section');
const aiSectionContent = document.getElementById('ai-section-content');
const ttsModeSelect = document.getElementById('tts-mode-select');

// Text-to-Speech State
let ttsEnabled = false;
let ttsPlaying = false;
let ttsMode = 'single'; // 'single' or 'continuous'
let currentUtterance = null;
let currentHighlight = null;

/**
 * Initialize the application
 */
function init() {
    setupTabSwitching();
    setupSampleCards();
    setupAnalyzeButton();
    setupNavigation();
    setupKeyboardNavigation();
    setupAiEnhanceButton();
    setupModal();
    setupClearApiKeyButton();
    updateClearKeyButtonVisibility();
    setupTextToSpeech();
    setupNewAnalysisButton();

    console.log('✅ SR Visualizer initialized');
}

/**
 * Announce message to screen readers via live region
 * @param {string} message - Message to announce
 * @param {boolean} assertive - Use assertive (true) or polite (false)
 */
function announceToScreenReader(message, assertive = false) {
    const statusEl = document.getElementById('sr-status');
    if (!statusEl) return;

    // Change role if assertive needed
    if (assertive) {
        statusEl.setAttribute('aria-live', 'assertive');
    } else {
        statusEl.setAttribute('aria-live', 'polite');
    }

    statusEl.textContent = message;

    // Clear after announcement to allow duplicate announcements
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.setAttribute('aria-live', 'polite'); // Reset to polite
    }, 1000);
}

/**
 * Setup New Analysis button
 */
function setupNewAnalysisButton() {
    newAnalysisBtn.addEventListener('click', showStartScreen);
}

/**
 * Show start screen and hide visualization
 */
function showStartScreen() {
    startScreen.style.display = 'block';
    mainContent.style.display = 'none';
    newAnalysisBtn.style.display = 'none';

    // Clear previous analysis
    analysisResults = [];
    currentIndex = 0;
    axeResults = null;
    previewFrame.innerHTML = '<p class="placeholder-text">Select a sample or paste HTML to begin</p>';
    announcementList.innerHTML = '<li class="placeholder-item">Announcements will appear here...</li>';
    issuesContent.innerHTML = '<p class="placeholder-item">Issues will appear after analysis...</p>';
    aiSection.style.display = 'none';
    elementCounter.textContent = '0 / 0';

    // Stop any ongoing narration
    if (typeof stopNarration === 'function') {
        stopNarration();
    }
}

/**
 * Show visualization and hide start screen
 */
function showVisualization() {
    startScreen.style.display = 'none';
    mainContent.style.display = 'block';
    newAnalysisBtn.style.display = 'block';
}

/**
 * Tab switching logic
 */
function setupTabSwitching() {
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update active tab button
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

/**
 * Sample card click handlers
 */
function setupSampleCards() {
    sampleCards.forEach(card => {
        card.addEventListener('click', () => {
            const sampleId = card.dataset.sample;
            const template = document.getElementById(`sample-${sampleId}`);

            if (template) {
                const html = template.innerHTML;
                loadAndAnalyze(html);
            }
        });
    });
}

/**
 * Analyze button for pasted HTML
 */
function setupAnalyzeButton() {
    analyzeBtn.addEventListener('click', () => {
        const html = htmlInput.value.trim();
        if (html) {
            loadAndAnalyze(html);
        }
    });
}

/**
 * Navigation buttons for stepping through elements
 */
function setupNavigation() {
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCurrentElement();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < analysisResults.length - 1) {
            currentIndex++;
            updateCurrentElement();
        }
    });
}

/**
 * Setup keyboard navigation shortcuts
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Skip if in input or modal open
        if (e.target.matches('input, textarea, select')) return;
        if (apiKeyModal.classList.contains('open')) return;

        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                if (analysisResults.length > 0 && currentIndex < analysisResults.length - 1) {
                    currentIndex++;
                    updateCurrentElement();
                }
                break;

            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                if (analysisResults.length > 0 && currentIndex > 0) {
                    currentIndex--;
                    updateCurrentElement();
                }
                break;

            case 'Home':
                e.preventDefault();
                if (analysisResults.length > 0) {
                    currentIndex = 0;
                    updateCurrentElement();
                }
                break;

            case 'End':
                e.preventDefault();
                if (analysisResults.length > 0) {
                    currentIndex = analysisResults.length - 1;
                    updateCurrentElement();
                }
                break;

            case ' ':
            case 'Enter':
                // Only trigger if body or TTS button has focus
                if (e.target === document.body || e.target === ttsToggleBtn) {
                    e.preventDefault();
                    ttsToggleBtn.click();
                }
                break;

            case 'Escape':
                // Stop TTS if playing
                if (ttsPlaying || window.speechSynthesis.speaking) {
                    e.preventDefault();
                    stopNarration();
                    window.speechSynthesis.cancel();
                }
                break;

            case '?':
                e.preventDefault();
                showKeyboardHelp();
                break;
        }
    });

    console.log('⌨️ Keyboard navigation enabled');
}

/**
 * Show keyboard shortcuts help
 */
function showKeyboardHelp() {
    const helpText = `Keyboard Shortcuts:

Navigation:
  ← / ↑  Previous element
  → / ↓  Next element
  Home   First element
  End    Last element

Text-to-Speech:
  Space/Enter  Play/pause
  Esc          Stop

Help:
  ?  Show this help`;

    alert(helpText);
}

/**
 * Setup AI Enhance button
 */
function setupAiEnhanceButton() {
    enhanceAiBtn.addEventListener('click', () => {
        runAiEnhancement();
    });
}

/**
 * Setup modal event handlers
 */
function setupModal() {
    // Close modal on backdrop click
    apiKeyModal.addEventListener('click', (e) => {
        if (e.target === apiKeyModal) {
            closeApiKeyModal();
        }
    });

    // Close modal on close button
    modalCloseBtn.addEventListener('click', closeApiKeyModal);
    modalCancelBtn.addEventListener('click', closeApiKeyModal);

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && apiKeyModal.classList.contains('open')) {
            closeApiKeyModal();
        }
    });

    // Save API key on button click
    modalSaveBtn.addEventListener('click', async () => {
        await validateAndSaveApiKey();
    });

    // Save API key on Enter key
    modalApiKeyInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            await validateAndSaveApiKey();
        }
    });
}

/**
 * Open the API key modal
 */
function openApiKeyModal(errorMessage = null) {
    apiKeyModal.classList.add('open');
    modalApiKeyInput.value = '';

    // Store element that opened modal for focus return
    const previouslyFocused = document.activeElement;
    if (previouslyFocused && previouslyFocused !== document.body) {
        apiKeyModal.dataset.returnFocusTo = previouslyFocused.id || '';
    }

    // Focus input after modal is visible
    setTimeout(() => {
        modalApiKeyInput.focus();
    }, 100);

    // Show error message if provided
    if (errorMessage) {
        modalError.textContent = errorMessage;
        modalError.style.display = 'block';
    } else {
        modalError.style.display = 'none';
    }

    // Setup focus trap
    setupModalFocusTrap();
}

/**
 * Close the API key modal
 */
function closeApiKeyModal() {
    apiKeyModal.classList.remove('open');
    modalApiKeyInput.value = '';
    modalError.style.display = 'none';
    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = 'Connect & Analyze';

    // Remove focus trap
    if (apiKeyModal._focusTrapHandler) {
        apiKeyModal.removeEventListener('keydown', apiKeyModal._focusTrapHandler);
        apiKeyModal._focusTrapHandler = null;
    }

    // Restore focus to element that opened modal
    const returnId = apiKeyModal.dataset.returnFocusTo;
    if (returnId) {
        const returnElement = document.getElementById(returnId);
        if (returnElement) {
            setTimeout(() => returnElement.focus(), 100);
        }
    }
}

/**
 * Setup focus trap for modal
 */
function setupModalFocusTrap() {
    // Get all focusable elements within modal
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(apiKeyModal.querySelectorAll(focusableSelector));

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Remove previous handler if exists
    if (apiKeyModal._focusTrapHandler) {
        apiKeyModal.removeEventListener('keydown', apiKeyModal._focusTrapHandler);
    }

    // Create new trap handler
    apiKeyModal._focusTrapHandler = (e) => {
        // Only trap Tab key
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift+Tab: if on first element, move to last
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab: if on last element, move to first
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };

    apiKeyModal.addEventListener('keydown', apiKeyModal._focusTrapHandler);
}

/**
 * Validate and save API key from modal
 */
async function validateAndSaveApiKey() {
    const key = modalApiKeyInput.value.trim();
    if (!key) return;

    // Show loading state
    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = 'Validating...';
    modalError.style.display = 'none';

    try {
        // Temporarily set the key for validation
        setApiKey(key);

        // Validate the API key
        console.log('🔑 Validating API key in modal...');
        const { testApiConnection } = await import('./ai-analyzer.js');
        await testApiConnection();

        console.log('✅ API key is valid');

        // Close modal and run analysis
        closeApiKeyModal();
        updateClearKeyButtonVisibility();
        await runAiEnhancement();

    } catch (error) {
        console.error('❌ API key validation failed:', error);

        // Clear the invalid key
        clearApiKey();

        // Show error in modal
        modalError.textContent = '⚠️ Invalid API key. Please check and try again.';
        modalError.style.display = 'block';

        // Reset button state
        modalSaveBtn.disabled = false;
        modalSaveBtn.textContent = 'Connect & Analyze';
    }
}

/**
 * Setup Clear API Key button
 */
function setupClearApiKeyButton() {
    clearApiKeyBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your stored API key?')) {
            clearApiKey();
            updateClearKeyButtonVisibility();
            alert('API key cleared successfully!');
        }
    });
}

/**
 * Update Clear Key button visibility based on whether a key is stored
 */
function updateClearKeyButtonVisibility() {
    if (hasApiKey()) {
        clearApiKeyBtn.style.display = 'block';
    } else {
        clearApiKeyBtn.style.display = 'none';
    }
}

/**
 * Load HTML into preview and run analysis
 */
async function loadAndAnalyze(html) {
    // Switch to visualization view
    showVisualization();

    // Clear previous state
    analysisResults = [];
    currentIndex = 0;
    axeResults = null;

    // Disable AI Enhance button during analysis
    enhanceAiBtn.disabled = true;
    enhanceAiBtn.title = 'Please wait for analysis to complete';

    // Create preview content
    previewFrame.innerHTML = html;
    previewFrame.classList.add('has-content');
    previewContainer = previewFrame;

    // Clear the lists and show loading indicators
    announcementList.innerHTML = '<li class="loading">Analyzing screen reader output...</li>';
    issuesContent.innerHTML = '<p class="loading">Running accessibility checks...</p>';
    updateCounter();

    try {
        // Run Screen Reader analysis
        console.log('🔍 Starting analysis...');

        analysisResults = await analyzeContainer(previewFrame, (result, count) => {
            // Clear loading message on first result
            if (count === 1) {
                announcementList.innerHTML = '';
                announceToScreenReader('Analysis started. Please wait.');
            }
            // Add each announcement to the list as it's found
            addAnnouncementToList(result);
            elementCounter.textContent = `${count} found...`;
        });

        // If no results from VSR, use simple analysis as fallback
        if (analysisResults.length === 0) {
            console.log('⚠️ VSR returned no results, using fallback analysis');
            analysisResults = analyzeContainerSimple(previewFrame);
            updateAnnouncementList();
        }

        console.log('📊 SR Analysis complete:', analysisResults.length, 'items');
        announceToScreenReader(`Screen reader analysis complete. Found ${analysisResults.length} elements.`);

        // Update final counter
        updateCounter();

        // Highlight first element
        if (analysisResults.length > 0) {
            currentIndex = 0;
            updateCurrentElement();
        }

    } catch (error) {
        console.error('❌ SR Analysis failed:', error);

        // Fallback to simple analysis
        console.log('🔄 Using fallback analysis due to error');
        analysisResults = analyzeContainerSimple(previewFrame);
        updateAnnouncementList();
        updateCounter();

        if (analysisResults.length === 0) {
            announcementList.innerHTML = `<li class="error">Error: ${error.message}</li>`;
        }
    }

    // Run Axe-core analysis (in parallel with display updates)
    try {
        axeResults = await runAxeAnalysis(previewFrame);
        renderAxeResults(axeResults);

        const violationCount = axeResults.violations.length;
        announceToScreenReader(
            violationCount === 0
                ? 'No accessibility violations found.'
                : `Found ${violationCount} accessibility ${violationCount === 1 ? 'violation' : 'violations'}.`
        );

        // Enable AI Enhance button after analysis completes
        enhanceAiBtn.disabled = false;
        enhanceAiBtn.title = 'Enhance with AI';
    } catch (error) {
        console.error('❌ Axe analysis failed:', error);
        issuesContent.innerHTML = `<p class="error" style="color: var(--accent-red);">Axe analysis failed: ${error.message}</p>`;

        // Enable AI Enhance button even if axe analysis fails
        enhanceAiBtn.disabled = false;
        enhanceAiBtn.title = 'Enhance with AI';
    }
}

/**
 * Add a single announcement to the list (for streaming)
 */
function addAnnouncementToList(result) {
    const li = document.createElement('li');
    const colorIndex = result.index % 20; // Cycle through 20 colors
    li.innerHTML = `<span class="category-dot color-${colorIndex}"></span> ${result.announcement}`;
    li.dataset.index = result.index;
    li.addEventListener('click', () => {
        currentIndex = result.index;
        updateCurrentElement();
    });
    announcementList.appendChild(li);

    // Auto-scroll to show new item
    li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


/**
 * Update the announcement list with all results
 */
function updateAnnouncementList() {
    announcementList.innerHTML = '';

    if (analysisResults.length === 0) {
        announcementList.innerHTML = '<li class="placeholder-item">No announcements found</li>';
        return;
    }

    analysisResults.forEach((result, index) => {
        const li = document.createElement('li');
        const colorIndex = index % 20; // Cycle through 20 colors
        li.innerHTML = `<span class="category-dot color-${colorIndex}"></span> ${result.announcement}`;
        li.dataset.index = index;
        li.addEventListener('click', () => {
            currentIndex = index;
            updateCurrentElement();
        });
        announcementList.appendChild(li);
    });
}


/**
 * Update the currently highlighted element
 */
function updateCurrentElement() {
    if (analysisResults.length === 0) return;

    const currentResult = analysisResults[currentIndex];

    // Update announcement list highlighting
    announcementList.querySelectorAll('li').forEach((li, index) => {
        li.classList.toggle('active', index === currentIndex);
        if (index === currentIndex) {
            li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Highlight element in preview
    highlightElementInPreview(currentResult.element);

    // Update counter
    updateCounter();
}

/**
 * Update element counter display
 */
function updateCounter() {
    const total = analysisResults.length;
    const current = total > 0 ? currentIndex + 1 : 0;
    elementCounter.textContent = `${current} / ${total}`;
}

/**
 * Render Axe-core analysis results
 */
function renderAxeResults(results) {
    issuesContent.innerHTML = '';

    const violations = results.violations;
    const incomplete = results.incomplete;

    // No issues found
    if (violations.length === 0 && incomplete.length === 0) {
        issuesContent.innerHTML = `
            <div style="text-align: center; padding: 16px;">
                <span style="font-size: 2rem;">✅</span>
                <p style="margin: 8px 0 0; color: var(--text-secondary); font-size: 0.85rem;">
                    No WCAG violations detected!<br>
                    <small>Note: Always test with real screen readers too.</small>
                </p>
            </div>
        `;
        return;
    }

    // Summary
    const summary = document.createElement('div');
    summary.className = 'issues-summary';
    summary.innerHTML = `
        <span class="issues-summary-item">🔴 <strong>${violations.length}</strong> violations</span>
        <span class="issues-summary-item">🟡 <strong>${incomplete.length}</strong> needs review</span>
        <span class="issues-summary-item">✅ <strong>${results.passes}</strong> passed</span>
    `;
    issuesContent.appendChild(summary);

    // Create table
    const table = document.createElement('table');
    table.className = 'issues-table';

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th scope="col">Severity</th>
            <th scope="col">Issue</th>
            <th scope="col">Description</th>
            <th scope="col">WCAG</th>
            <th scope="col">Info</th>
        </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');

    // Add violations
    violations.forEach(violation => {
        const row = createIssueTableRow(violation, 'violation');
        tbody.appendChild(row);
    });

    // Add incomplete issues
    incomplete.forEach(issue => {
        const row = createIssueTableRow(issue, 'incomplete');
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    issuesContent.appendChild(table);
}

/**
 * Create a table row for an accessibility issue
 */
function createIssueTableRow(issue, type = 'violation') {
    const row = document.createElement('tr');
    row.className = `issue-row ${issue.impact || 'moderate'}`;
    row.dataset.issueId = issue.id;

    const tags = formatWcagTags(issue.tags);
    const icon = getImpactIcon(issue.impact);

    // Severity text (not just color)
    const severityText = {
        'critical': 'CRITICAL',
        'serious': 'SERIOUS',
        'moderate': 'MODERATE',
        'minor': 'MINOR'
    }[issue.impact] || 'UNKNOWN';

    // Extract unique fix messages from all nodes
    const allFixes = new Set();
    if (issue.nodes && Array.isArray(issue.nodes)) {
        issue.nodes.forEach(node => {
            if (node.fixes && Array.isArray(node.fixes)) {
                node.fixes.forEach(fix => {
                    if (fix.message) {
                        allFixes.add(fix.message);
                    }
                });
            }
        });
    }

    // Build fixes HTML if we have any
    const fixesHtml = allFixes.size > 0 ? `
        <div class="axe-fix-suggestions">
            <strong>💡 Axe Suggestions:</strong>
            <ul>
                ${Array.from(allFixes).map(fix => `<li>${fix}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    row.innerHTML = `
        <td class="severity-cell">
            <span class="severity-badge ${issue.impact || 'moderate'}">
                ${icon} ${severityText}
            </span>
        </td>
        <td class="issue-title-cell">
            <strong>${issue.help}</strong>
        </td>
        <td class="description-cell">
            ${issue.description}
            ${fixesHtml}
        </td>
        <td class="wcag-cell">
            ${tags.map(tag => `<span class="wcag-tag">${tag}</span>`).join(' ')}
        </td>
        <td class="info-cell">
            <a href="${issue.helpUrl}" target="_blank" rel="noopener" class="learn-more-link">
                Learn more →
            </a>
        </td>
    `;

    return row;
}

/**
 * Create an Axe issue card element
 */
function createAxeIssueCard(issue, type = 'violation') {
    const card = document.createElement('div');
    card.className = `axe-issue ${issue.impact || 'moderate'}`;
    card.dataset.issueId = issue.id;

    const tags = formatWcagTags(issue.tags);
    const icon = getImpactIcon(issue.impact);

    card.innerHTML = `
        <div class="axe-issue-header">
            <span>${icon}</span>
            <span class="axe-issue-impact">${issue.impact || 'unknown'}</span>
            <span class="axe-issue-title">${issue.help}</span>
        </div>
        <p class="axe-issue-description">${issue.description}</p>
        <div class="axe-issue-tags">
            ${tags.map(tag => `<span class="axe-tag">${tag}</span>`).join('')}
        </div>
        <div class="axe-issue-help">
            <a href="${issue.helpUrl}" target="_blank" rel="noopener">Learn more →</a>
        </div>
    `;

    return card;
}

/**
 * Run AI Enhancement on Axe results
 */
async function runAiEnhancement() {
    if (!axeResults || !previewContainer) {
        issuesContent.innerHTML += `
            <p style="color: var(--accent-orange); font-size: 0.85rem; margin-top: 12px;">
                ⚠️ Please analyze a page first before enhancing with AI.
            </p>
        `;
        return;
    }

    // Check for API key
    if (!hasApiKey()) {
        openApiKeyModal();
        return;
    }

    // Validate stored API key before using it
    enhanceAiBtn.disabled = true;
    enhanceAiBtn.innerHTML = '⏳ Validating...';

    try {
        const { testApiConnection } = await import('./ai-analyzer.js');
        await testApiConnection();
    } catch (error) {
        console.error('❌ Stored API key is invalid:', error);
        clearApiKey();
        enhanceAiBtn.disabled = false;
        enhanceAiBtn.innerHTML = '🤖 AI Enhance';
        openApiKeyModal('⚠️ Your stored API key is invalid. Please enter a new one.');
        return;
    }

    // Show loading state on button
    enhanceAiBtn.disabled = true;
    enhanceAiBtn.innerHTML = '⏳ Analyzing...';

    try {
        console.log('📸 Capturing screenshot for Gemini...');
        const imageBase64 = await capturePreview(previewContainer);

        // Build issues list for Gemini with complete context
        const issuesForAi = axeResults.violations.map(v => ({
            type: v.id,
            description: v.description,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            nodes: v.nodes.map(node => ({
                html: node.html,
                target: node.target.join(', '),
                failureSummary: node.failureSummary,
                axeFixes: node.fixes.map(f => f.message).join('; ')
            })),
            wcagTags: formatWcagTags(v.tags)
        }));

        console.log('🤖 Sending to Gemini API...');
        const aiAnalysis = await analyzeIssuesWithGemini(issuesForAi, imageBase64, analysisResults);

        console.log('✅ AI Analysis result:', aiAnalysis);

        // Add AI suggestions to existing cards
        renderAiSuggestions(aiAnalysis);

        enhanceAiBtn.innerHTML = '✅ AI Enhanced';

    } catch (error) {
        console.error('❌ AI enhancement failed:', error);

        // If API key is invalid, clear it and prompt again with modal
        if (error.message.includes('API key not valid') || error.message.includes('400') || error.message.includes('403')) {
            clearApiKey();
            openApiKeyModal('⚠️ The API key you entered is invalid. Please check and try again.');
            enhanceAiBtn.innerHTML = '🤖 AI Enhance';
            return;
        }

        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'margin-top: 12px; padding: 8px 12px; background: rgba(239,68,68,0.1); border-radius: 6px; border-left: 2px solid var(--accent-red);';
        errorMsg.innerHTML = `<p style="margin: 0; color: var(--accent-red); font-size: 0.8rem;">⚠️ AI enhancement failed: ${error.message}</p>`;
        issuesContent.appendChild(errorMsg);

        enhanceAiBtn.innerHTML = '🤖 Retry AI';
    } finally {
        enhanceAiBtn.disabled = false;
    }
}



/**
 * Render AI suggestions in the standalone AI section
 */
function renderAiSuggestions(aiAnalysis) {
    if (!aiAnalysis?.issues) return;

    // Show AI section
    aiSection.style.display = 'block';

    // Clear previous content
    aiSectionContent.innerHTML = '';

    // Add overall summary if available
    if (aiAnalysis.summary) {
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = 'padding: var(--space-md); background: rgba(255, 214, 10, 0.1); border-radius: var(--radius-sm); margin-bottom: var(--space-md); border-left: 3px solid var(--accent-yellow);';
        summaryDiv.innerHTML = `<strong>📊 Overall Assessment:</strong> ${aiAnalysis.summary}`;
        aiSectionContent.appendChild(summaryDiv);
    }

    // Render each AI suggestion
    aiAnalysis.issues.forEach((aiIssue, index) => {
        const suggestionCard = document.createElement('div');
        suggestionCard.className = 'ai-suggestion-card';
        suggestionCard.style.cssText = 'background: var(--bg-elevated); padding: var(--space-md) var(--space-lg); border-radius: var(--radius-md); border-left: 3px solid var(--accent-purple);';

        suggestionCard.innerHTML = `
            <div style="font-weight: 600; margin-bottom: var(--space-xs); color: var(--text-primary);">Issue ${index + 1}: ${aiIssue.type || 'Accessibility Issue'}</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">${aiIssue.aiSuggestion}</div>
            ${aiIssue.explanation ? `<div style="font-size: 0.85rem; color: var(--text-muted); padding-top: var(--space-xs); border-top: 1px solid var(--bg-tertiary);">${aiIssue.explanation}</div>` : ''}
        `;

        aiSectionContent.appendChild(suggestionCard);
    });
}

/**
 * Setup Text-to-Speech functionality
 */
function setupTextToSpeech() {
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Text-to-speech not supported in this browser');
        ttsToggleBtn.disabled = true;
        ttsToggleBtn.title = 'Text-to-speech not supported';
        return;
    }

    // Handle mode selection
    ttsModeSelect.addEventListener('change', (e) => {
        ttsMode = e.target.value;
        console.log(`🔊 TTS mode changed to: ${ttsMode}`);

        // Update data attribute for mode-specific styling
        document.querySelector('.tts-controls').dataset.mode = ttsMode;

        // Stop any ongoing narration when mode changes
        if (ttsPlaying) {
            stopNarration();
        }

        // Update button title based on mode
        updateTtsButtonTitle();
    });

    // Handle TTS button click
    ttsToggleBtn.addEventListener('click', () => {
        if (analysisResults.length === 0) {
            console.log('🔊 No announcements to narrate');
            return;
        }

        if (ttsMode === 'single') {
            // Single mode: speak current announcement only
            speakSingleAnnouncement();
        } else {
            // Continuous mode: play/pause continuous narration
            if (ttsPlaying) {
                stopNarration();
            } else {
                startNarration();
            }
        }
    });

    // Set initial button title
    updateTtsButtonTitle();
}

/**
 * Update TTS button title based on current mode
 */
function updateTtsButtonTitle() {
    if (ttsMode === 'single') {
        ttsToggleBtn.title = 'Read current announcement';
    } else {
        ttsToggleBtn.title = ttsPlaying ? 'Pause narration' : 'Play continuous narration';
    }
}

/**
 * Speak only the current announcement (single mode)
 */
function speakSingleAnnouncement() {
    if (currentIndex < 0 || currentIndex >= analysisResults.length) return;

    const currentResult = analysisResults[currentIndex];
    if (!currentResult || !currentResult.announcement) return;

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // Show indicator
    ttsIndicator.style.display = 'inline';
    ttsIndicator.textContent = 'Speaking...';
    ttsToggleBtn.classList.add('speaking');

    // Create and speak utterance
    currentUtterance = new SpeechSynthesisUtterance(currentResult.announcement);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    currentUtterance.onend = () => {
        ttsIndicator.style.display = 'none';
        ttsToggleBtn.classList.remove('speaking');
        currentUtterance = null;
    };

    currentUtterance.onerror = () => {
        ttsIndicator.style.display = 'none';
        ttsToggleBtn.classList.remove('speaking');
        currentUtterance = null;
    };

    window.speechSynthesis.speak(currentUtterance);
}

/**
 * Start continuous narration from current index
 */
function startNarration() {
    if (analysisResults.length === 0) return;

    ttsPlaying = true;
    ttsToggleBtn.classList.add('speaking');
    ttsIndicator.style.display = 'inline';
    ttsIndicator.textContent = 'Playing...';

    console.log('▶️ Starting narration from index', currentIndex);
    speakCurrentAndContinue();
}

/**
 * Stop continuous narration
 */
function stopNarration() {
    ttsPlaying = false;
    stopSpeech();
    ttsToggleBtn.classList.remove('speaking');
    ttsIndicator.style.display = 'none';

    console.log('⏸️ Narration stopped');
}

/**
 * Speak current announcement and continue to next
 */
function speakCurrentAndContinue() {
    if (!ttsPlaying || currentIndex >= analysisResults.length) {
        stopNarration();
        return;
    }

    const currentResult = analysisResults[currentIndex];
    if (!currentResult || !currentResult.announcement) {
        // Move to next if current has no announcement
        moveToNextAndSpeak();
        return;
    }

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // Create new utterance
    currentUtterance = new SpeechSynthesisUtterance(currentResult.announcement);

    // Configure utterance
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // When this announcement finishes, move to next
    currentUtterance.onend = () => {
        if (ttsPlaying) {
            moveToNextAndSpeak();
        }
    };

    currentUtterance.onerror = (event) => {
        console.error('TTS error:', event);
        if (ttsPlaying) {
            moveToNextAndSpeak();
        }
    };

    // Speak
    window.speechSynthesis.speak(currentUtterance);
}

/**
 * Move to next announcement and continue speaking
 */
function moveToNextAndSpeak() {
    if (!ttsPlaying) return;

    if (currentIndex < analysisResults.length - 1) {
        currentIndex++;
        updateCurrentElement();
        // Small delay before speaking next
        setTimeout(() => {
            if (ttsPlaying) {
                speakCurrentAndContinue();
            }
        }, 300);
    } else {
        // Reached the end
        console.log('✅ Narration complete');
        stopNarration();
    }
}

/**
 * Speak text using Web Speech API
 */
function speakText(text) {
    if (!ttsEnabled || !text) return;

    // Stop any ongoing speech
    stopSpeech();

    // Create new utterance
    currentUtterance = new SpeechSynthesisUtterance(text);

    // Configure utterance
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // Show indicator when speaking
    currentUtterance.onstart = () => {
        ttsIndicator.style.display = 'inline';
        ttsToggleBtn.classList.add('speaking');
    };

    // Hide indicator when done
    currentUtterance.onend = () => {
        ttsIndicator.style.display = 'none';
        ttsToggleBtn.classList.remove('speaking');
        currentUtterance = null;
    };

    currentUtterance.onerror = (event) => {
        console.error('TTS error:', event);
        ttsIndicator.style.display = 'none';
        ttsToggleBtn.classList.remove('speaking');
        currentUtterance = null;
    };

    // Speak
    window.speechSynthesis.speak(currentUtterance);
}

/**
 * Stop current speech
 */
function stopSpeech() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}

/**
 * Highlight element in preview
 */
function highlightElementInPreview(element) {
    if (!element || !previewFrame.contains(element)) return;

    // Remove previous highlight
    if (currentHighlight) {
        currentHighlight.remove();
        currentHighlight = null;
    }

    // Get element position relative to preview frame
    const previewRect = previewFrame.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Create highlight overlay
    const highlight = document.createElement('div');
    highlight.className = 'sr-element-highlight';

    // Position the highlight
    const top = elementRect.top - previewRect.top + previewFrame.scrollTop;
    const left = elementRect.left - previewRect.left + previewFrame.scrollLeft;

    highlight.style.top = `${top}px`;
    highlight.style.left = `${left}px`;
    highlight.style.width = `${elementRect.width}px`;
    highlight.style.height = `${elementRect.height}px`;

    // Add to preview
    previewFrame.appendChild(highlight);
    currentHighlight = highlight;

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
