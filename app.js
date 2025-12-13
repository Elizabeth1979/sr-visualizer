/**
 * SR Visualizer - Main Application
 */

import {
    analyzeContainer,
    analyzeContainerSimple
} from './sr-visualizer.js';

import {
    detectPotentialIssues,
    formatIssue
} from './issue-detector.js';

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
let detectedIssues = [];

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
const analyzeAiBtn = document.getElementById('analyze-ai-btn');
const aiPanel = document.getElementById('ai-panel');
const closeAiPanelBtn = document.getElementById('close-ai-panel');
const aiResults = document.getElementById('ai-results');
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
    setupAiPanel();
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
 * AI Panel toggle
 */
function setupAiPanel() {
    analyzeAiBtn.addEventListener('click', () => {
        aiPanel.classList.add('open');
        runAiAnalysis();
    });

    closeAiPanelBtn.addEventListener('click', () => {
        aiPanel.classList.remove('open');
    });
}

/**
 * Load HTML into preview and run analysis
 */
async function loadAndAnalyze(html) {
    // Clear previous state
    analysisResults = [];
    currentIndex = 0;
    detectedIssues = [];

    // Create preview content
    previewFrame.innerHTML = html;
    previewFrame.classList.add('has-content');
    previewContainer = previewFrame;

    // Clear the list and show streaming indicator
    announcementList.innerHTML = '';
    updateCounter();

    try {
        // Stream results as they're discovered
        console.log('🔍 Starting analysis...');

        analysisResults = await analyzeContainer(previewFrame, (result, count) => {
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

        console.log('📊 Analysis complete:', analysisResults.length, 'items');

        // Update final counter
        updateCounter();

        // Highlight first element
        if (analysisResults.length > 0) {
            currentIndex = 0;
            updateCurrentElement();
        }

    } catch (error) {
        console.error('❌ Analysis failed:', error);

        // Fallback to simple analysis
        console.log('🔄 Using fallback analysis due to error');
        analysisResults = analyzeContainerSimple(previewFrame);
        updateAnnouncementList();
        updateCounter();

        if (analysisResults.length === 0) {
            announcementList.innerHTML = `<li class="error">Error: ${error.message}</li>`;
        }
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
 * Run AI analysis on detected issues
 */
async function runAiAnalysis() {
    // Detect potential issues using improved detection
    detectedIssues = detectPotentialIssues(analysisResults, previewContainer);

    console.log('🔍 Detected issues:', detectedIssues);

    if (detectedIssues.length === 0) {
        aiResults.innerHTML = `
            <div class="ai-success" style="text-align: center; padding: 24px;">
                <span style="font-size: 3rem;">✅</span>
                <h4 style="margin: 16px 0 8px;">No Obvious Issues Found</h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    This doesn't guarantee full WCAG compliance.<br>
                    Always test with real screen readers and users.
                </p>
            </div>
        `;
        return;
    }

    // Show issues first with basic suggestions
    renderIssues(detectedIssues);

    // Then try to enhance with AI
    if (hasApiKey()) {
        await enhanceWithAI();
    }
}

/**
 * Render detected issues
 */
function renderIssues(issues, aiAnalysis = null) {
    aiResults.innerHTML = '';

    // Summary
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    const header = document.createElement('div');
    header.className = 'ai-summary';
    header.style.cssText = 'margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;';

    let scoreHtml = '';
    if (aiAnalysis?.overallScore !== undefined && aiAnalysis.overallScore !== null) {
        const score = aiAnalysis.overallScore;
        const scoreColor = score >= 80 ? 'var(--accent-green)' : score >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)';
        scoreHtml = `<div style="margin-top: 8px; font-size: 1.2rem;"><strong style="color: ${scoreColor};">Accessibility Score: ${score}/100</strong></div>`;
    }

    header.innerHTML = `
        <strong>Found ${issues.length} issue${issues.length !== 1 ? 's' : ''}:</strong>
        <span style="color: var(--accent-red); margin-left: 12px;">🔴 ${errorCount} error${errorCount !== 1 ? 's' : ''}</span>
        <span style="color: var(--accent-orange); margin-left: 8px;">🟠 ${warningCount} warning${warningCount !== 1 ? 's' : ''}</span>
        ${scoreHtml}
    `;
    aiResults.appendChild(header);

    // AI summary if available
    if (aiAnalysis?.summary) {
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = 'margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(34,197,94,0.1)); border-radius: 8px; border-left: 3px solid var(--accent-blue);';
        summaryDiv.innerHTML = `<p style="margin: 0; color: var(--text-primary);"><strong>🤖 AI Summary:</strong> ${aiAnalysis.summary}</p>`;
        aiResults.appendChild(summaryDiv);
    }

    // Issue cards
    issues.forEach((issue, idx) => {
        const formatted = formatIssue(issue);

        // Check if AI provided enhanced suggestion for this issue
        const aiIssue = aiAnalysis?.issues?.find(ai => ai.issueIndex === idx);

        const card = document.createElement('div');
        card.className = `ai-issue ${issue.severity === 'error' ? '' : 'warning'}`;

        let suggestionHtml = `<strong>💡 Suggested fix:</strong><br><code>${formatted.suggestion}</code>`;

        if (aiIssue) {
            const confidenceColor = aiIssue.confidence === 'high' ? 'var(--accent-green)' :
                aiIssue.confidence === 'medium' ? 'var(--accent-orange)' : 'var(--text-muted)';
            suggestionHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <strong>🤖 AI Suggestion:</strong>
                    <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; background: ${confidenceColor}; color: white;">${aiIssue.confidence} confidence</span>
                </div>
                <code>${aiIssue.aiSuggestion}</code>
                ${aiIssue.explanation ? `<p style="margin: 8px 0 0; font-size: 0.8rem; color: var(--text-secondary);">${aiIssue.explanation}</p>` : ''}
            `;
        }

        card.innerHTML = `
            <div class="ai-issue-header">
                <span style="font-size: 1.2rem;">${formatted.icon}</span>
                <span class="ai-issue-type">${formatted.label}</span>
                <span style="margin-left: auto; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; background: ${issue.severity === 'error' ? 'var(--accent-red)' : 'var(--accent-orange)'}; color: white;">
                    ${issue.severity}
                </span>
            </div>
            <p class="ai-issue-explanation">${issue.description}</p>
            <div class="ai-issue-fix">
                ${suggestionHtml}
            </div>
        `;

        aiResults.appendChild(card);
    });

    // API key configuration section
    const apiSection = document.createElement('div');
    apiSection.style.cssText = 'margin-top: 20px; padding: 16px; background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(59,130,246,0.1)); border-radius: 8px; border: 1px solid rgba(168,85,247,0.2);';

    if (hasApiKey()) {
        apiSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 1.2rem;">🤖</span>
                <strong>Gemini AI Connected</strong>
                <span style="margin-left: auto; color: var(--accent-green);">✓ Active</span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
                AI is analyzing your page for contextual suggestions.
            </p>
            <button id="clear-api-key" style="margin-top: 8px; padding: 4px 12px; background: transparent; border: 1px solid var(--text-muted); border-radius: 4px; color: var(--text-muted); cursor: pointer; font-size: 0.8rem;">
                Clear API Key
            </button>
        `;
    } else {
        apiSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 1.2rem;">🤖</span>
                <strong>Enable AI Enhancement</strong>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 12px;">
                Connect Gemini API for intelligent suggestions based on visual context.
            </p>
            <div style="display: flex; gap: 8px;">
                <input type="password" id="api-key-input" placeholder="Enter Gemini API Key" 
                    style="flex: 1; padding: 8px 12px; background: var(--bg-tertiary); border: 1px solid var(--bg-elevated); border-radius: 6px; color: var(--text-primary); font-size: 0.9rem;">
                <button id="save-api-key" style="padding: 8px 16px; background: var(--accent-purple); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 500;">
                    Connect
                </button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.75rem; margin: 8px 0 0;">
                Get a free API key at <a href="https://aistudio.google.com/apikey" target="_blank" style="color: var(--accent-blue);">aistudio.google.com/apikey</a>
            </p>
        `;
    }

    aiResults.appendChild(apiSection);

    // Add event listeners for API key management
    const saveBtn = document.getElementById('save-api-key');
    const clearBtn = document.getElementById('clear-api-key');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const input = document.getElementById('api-key-input');
            const key = input.value.trim();
            if (key) {
                setApiKey(key);
                // Re-render and enhance with AI
                renderIssues(detectedIssues);
                await enhanceWithAI();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearApiKey();
            location.reload();
        });
    }
}

/**
 * Enhance issues with Gemini AI analysis
 */
async function enhanceWithAI() {
    if (!previewContainer || detectedIssues.length === 0) return;

    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-loading';
    loadingDiv.style.cssText = 'position: fixed; bottom: 20px; right: 420px; padding: 12px 20px; background: var(--bg-elevated); border-radius: 8px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    loadingDiv.innerHTML = '<div class="loading" style="padding: 0;"></div><span>Gemini analyzing...</span>';
    document.body.appendChild(loadingDiv);

    try {
        console.log('📸 Capturing screenshot for Gemini...');
        const imageBase64 = await capturePreview(previewContainer);

        console.log('🤖 Sending to Gemini API...');
        const aiAnalysis = await analyzeIssuesWithGemini(detectedIssues, imageBase64, analysisResults);

        console.log('✅ AI Analysis result:', aiAnalysis);

        // Re-render with AI enhancements
        renderIssues(detectedIssues, aiAnalysis);

    } catch (error) {
        console.error('❌ AI enhancement failed:', error);

        // Show error but keep existing issues
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-top: 12px; padding: 12px; background: rgba(239,68,68,0.1); border-radius: 8px; border-left: 3px solid var(--accent-red);';
        errorDiv.innerHTML = `<p style="margin: 0; color: var(--accent-red); font-size: 0.85rem;">⚠️ AI enhancement failed: ${error.message}</p>`;
        aiResults.insertBefore(errorDiv, aiResults.querySelector('[style*="linear-gradient"]'));
    } finally {
        loadingDiv.remove();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

