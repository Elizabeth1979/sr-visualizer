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
const inputSection = document.getElementById('input-section');
const collapseToggle = document.getElementById('collapse-toggle');
const mainContainer = document.querySelector('.main');

/**
 * Initialize the application
 */
function init() {
    setupTabSwitching();
    setupSampleCards();
    setupAnalyzeButton();
    setupNavigation();
    setupAiEnhanceButton();
    setupCollapseToggle();
    console.log('🚀 SR Visualizer initialized');
}

/**
 * Setup collapse/expand toggle for input panel
 */
function setupCollapseToggle() {
    collapseToggle.addEventListener('click', () => {
        inputSection.classList.toggle('collapsed');
        mainContainer.classList.toggle('input-collapsed');
    });
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
 * Setup AI Enhance button
 */
function setupAiEnhanceButton() {
    enhanceAiBtn.addEventListener('click', () => {
        runAiEnhancement();
    });
}

/**
 * Load HTML into preview and run analysis
 */
async function loadAndAnalyze(html) {
    // Clear previous state
    analysisResults = [];
    currentIndex = 0;
    axeResults = null;

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
    } catch (error) {
        console.error('❌ Axe analysis failed:', error);
        issuesContent.innerHTML = `<p class="error" style="color: var(--accent-red);">Axe analysis failed: ${error.message}</p>`;
    }
}

/**
 * Add a single announcement to the list (for streaming)
 */
function addAnnouncementToList(result) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="category-dot ${result.category}"></span> ${result.announcement}`;
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
        li.innerHTML = `<span class="category-dot ${result.category}"></span> ${result.announcement}`;
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
    // Update announcement list highlighting
    announcementList.querySelectorAll('li').forEach((li, index) => {
        li.classList.toggle('active', index === currentIndex);
        if (index === currentIndex) {
            li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

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

    // Violations
    violations.forEach(violation => {
        const card = createAxeIssueCard(violation, 'violation');
        issuesContent.appendChild(card);
    });

    // Incomplete (needs review)
    if (incomplete.length > 0) {
        const reviewHeader = document.createElement('p');
        reviewHeader.style.cssText = 'margin: 12px 0 8px; font-size: 0.8rem; color: var(--text-muted);';
        reviewHeader.textContent = '⚠️ Needs manual review:';
        issuesContent.appendChild(reviewHeader);

        incomplete.forEach(issue => {
            const card = createAxeIssueCard(issue, 'incomplete');
            issuesContent.appendChild(card);
        });
    }
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
        showApiKeyPrompt();
        return;
    }

    // Show loading state on button
    enhanceAiBtn.disabled = true;
    enhanceAiBtn.innerHTML = '⏳ Analyzing...';

    try {
        console.log('📸 Capturing screenshot for Gemini...');
        const imageBase64 = await capturePreview(previewContainer);

        // Build issues list for Gemini
        const issuesForAi = axeResults.violations.map(v => ({
            type: v.id,
            description: v.description,
            impact: v.impact
        }));

        console.log('🤖 Sending to Gemini API...');
        const aiAnalysis = await analyzeIssuesWithGemini(issuesForAi, imageBase64, analysisResults);

        console.log('✅ AI Analysis result:', aiAnalysis);

        // Add AI suggestions to existing cards
        renderAiSuggestions(aiAnalysis);

        enhanceAiBtn.innerHTML = '✅ AI Enhanced';

    } catch (error) {
        console.error('❌ AI enhancement failed:', error);

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
 * Show API key prompt in issues panel
 */
function showApiKeyPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'ai-key-prompt';
    promptDiv.style.cssText = 'margin-top: 12px; padding: 12px; background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(59,130,246,0.1)); border-radius: 8px; border: 1px solid rgba(168,85,247,0.2);';
    promptDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span>🤖</span>
            <strong style="font-size: 0.85rem;">Enter Gemini API Key</strong>
        </div>
        <div style="display: flex; gap: 8px;">
            <input type="password" id="inline-api-key" placeholder="API Key" 
                style="flex: 1; padding: 6px 10px; background: var(--bg-tertiary); border: 1px solid var(--bg-elevated); border-radius: 4px; color: var(--text-primary); font-size: 0.85rem;">
            <button id="inline-save-key" class="btn btn-sm btn-ai">Connect</button>
        </div>
        <p style="color: var(--text-muted); font-size: 0.7rem; margin: 6px 0 0;">
            Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" style="color: var(--accent-blue);">aistudio.google.com/apikey</a>
        </p>
    `;

    // Remove existing prompt if any
    const existingPrompt = issuesContent.querySelector('.ai-key-prompt');
    if (existingPrompt) existingPrompt.remove();

    issuesContent.appendChild(promptDiv);

    // Handle save
    document.getElementById('inline-save-key').addEventListener('click', async () => {
        const key = document.getElementById('inline-api-key').value.trim();
        if (key) {
            setApiKey(key);
            promptDiv.remove();
            await runAiEnhancement();
        }
    });
}

/**
 * Render AI suggestions on existing issue cards
 */
function renderAiSuggestions(aiAnalysis) {
    if (!aiAnalysis?.issues) return;

    // Add overall summary
    if (aiAnalysis.summary) {
        const summaryEl = document.querySelector('.issues-summary');
        if (summaryEl) {
            const aiSummary = document.createElement('div');
            aiSummary.style.cssText = 'margin-top: 12px; padding: 10px; background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(59,130,246,0.1)); border-radius: 6px; font-size: 0.8rem;';
            aiSummary.innerHTML = `<strong>🤖 AI Summary:</strong> ${aiAnalysis.summary}`;
            summaryEl.after(aiSummary);
        }
    }

    // Add suggestions to each issue card
    aiAnalysis.issues.forEach((aiIssue, index) => {
        const cards = issuesContent.querySelectorAll('.axe-issue');
        const card = cards[index];
        if (!card) return;

        // Remove existing AI suggestion if any
        const existingSuggestion = card.querySelector('.ai-suggestion');
        if (existingSuggestion) existingSuggestion.remove();

        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'ai-suggestion';
        suggestionDiv.innerHTML = `
            <div class="ai-suggestion-header">🤖 AI Suggestion</div>
            <p class="ai-suggestion-text">${aiIssue.aiSuggestion}</p>
            ${aiIssue.explanation ? `<p style="margin-top: 4px; font-size: 0.75rem; color: var(--text-secondary);">${aiIssue.explanation}</p>` : ''}
        `;
        card.appendChild(suggestionDiv);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

