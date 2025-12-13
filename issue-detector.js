/**
 * Issue Detector - Accessibility Issue Detection Module
 * Detects and formats accessibility issues from screen reader analysis
 */

/**
 * Detect potential accessibility issues from analysis results
 */
export function detectPotentialIssues(analysisResults, container) {
    const issues = [];

    // Check for issues in announcements
    analysisResults.forEach(({ announcement }) => {
        const lower = announcement.toLowerCase().trim();

        const announcementIssues = {
            'button': { type: 'unlabeled_button', description: 'Button has no accessible name - screen readers will just say "button"' },
            'link': { type: 'empty_link', description: 'Link has no accessible name - screen readers will just say "link"' },
            'image': { type: 'missing_alt', description: 'Image has no alt text - screen readers cannot describe it' },
            'img': { type: 'missing_alt', description: 'Image has no alt text - screen readers cannot describe it' },
            'textbox': { type: 'unlabeled_input', description: "Form field has no label - users won't know what to enter" },
            'edit': { type: 'unlabeled_input', description: "Form field has no label - users won't know what to enter" },
            'checkbox': { type: 'unlabeled_checkbox', description: 'Checkbox has no label' }
        };

        if (announcementIssues[lower]) {
            issues.push({ ...announcementIssues[lower], announcement, severity: 'error' });
        }
    });

    // Scan container for common DOM issues
    if (container) {
        scanContainerForIssues(container, issues);
    }

    // Deduplicate
    const seen = new Set();
    return issues.filter(issue => {
        const key = `${issue.type}-${issue.description}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Scan container for common accessibility issues
 */
function scanContainerForIssues(container, issues) {
    // Images without alt
    container.querySelectorAll('img:not([alt])').forEach(img => {
        if (!issues.some(i => i.type === 'missing_alt')) {
            issues.push({ type: 'missing_alt', element: img, severity: 'error', description: 'Image missing alt attribute' });
        }
    });

    // Icon buttons without accessible name
    container.querySelectorAll('button, [role="button"]').forEach(btn => {
        const hasName = btn.textContent.trim() || btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby');
        if (!hasName && (btn.querySelector('svg, i, img'))) {
            issues.push({ type: 'unlabeled_icon_button', element: btn, severity: 'error', description: 'Icon button has no accessible name' });
        }
    });

    // Empty links
    container.querySelectorAll('a[href]').forEach(link => {
        if (!link.textContent.trim() && !link.hasAttribute('aria-label')) {
            issues.push({ type: 'empty_link', element: link, severity: 'error', description: 'Link has no text content' });
        }
    });

    // Fake buttons
    container.querySelectorAll('div[onclick], span[onclick]').forEach(el => {
        if (!el.hasAttribute('role') && !el.hasAttribute('tabindex')) {
            issues.push({ type: 'fake_button', element: el, severity: 'warning', description: 'Clickable element is not a button - not keyboard accessible' });
        }
    });

    // Missing main landmark
    if (!container.querySelector('main, [role="main"]') && container.querySelectorAll('p, h1, h2, form').length > 2) {
        issues.push({ type: 'missing_main', severity: 'warning', description: 'No main landmark - screen reader users cannot skip to main content' });
    }

    // Heading hierarchy
    let lastLevel = 0;
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        const level = parseInt(h.tagName[1]);
        if (level > lastLevel + 1 && lastLevel > 0) {
            issues.push({ type: 'heading_skip', element: h, severity: 'warning', description: `Heading level skipped from h${lastLevel} to h${level}` });
        }
        lastLevel = level;
    });

    // Unlabeled form inputs
    container.querySelectorAll('input, textarea, select').forEach(input => {
        if (['hidden', 'submit', 'button'].includes(input.type)) return;
        const hasLabel = (input.id && container.querySelector(`label[for="${input.id}"]`)) ||
            input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby') || input.closest('label');
        if (!hasLabel) {
            issues.push({ type: 'unlabeled_input', element: input, severity: 'error', description: `Form ${input.type || 'input'} has no associated label` });
        }
    });
}

/**
 * Format issue for display
 */
const ISSUE_CONFIG = {
    'missing_alt': { icon: '🖼️', label: 'Missing Alt Text', suggestion: 'Add alt="Description of image" to the &lt;img&gt; tag' },
    'unlabeled_button': { icon: '🔘', label: 'Unlabeled Button', suggestion: 'Add aria-label="Purpose" or visible text to the button' },
    'unlabeled_icon_button': { icon: '🔘', label: 'Unlabeled Icon Button', suggestion: 'Add aria-label="Icon meaning" (e.g., "Edit", "Close", "Search")' },
    'empty_link': { icon: '🔗', label: 'Empty Link', suggestion: 'Add aria-label="Destination" or visible text to the link' },
    'unlabeled_input': { icon: '📝', label: 'Unlabeled Form Field', suggestion: 'Add a &lt;label for="inputId"&gt; element or aria-label' },
    'unlabeled_checkbox': { icon: '☑️', label: 'Unlabeled Checkbox', suggestion: 'Wrap in &lt;label&gt; or add aria-label' },
    'fake_button': { icon: '⚠️', label: 'Inaccessible Interactive Element', suggestion: 'Use &lt;button&gt; instead, or add role="button" and tabindex="0"' },
    'missing_main': { icon: '🏠', label: 'Missing Main Landmark', suggestion: 'Add &lt;main&gt; wrapper around primary content' },
    'heading_skip': { icon: '📊', label: 'Heading Hierarchy Issue', suggestion: 'Use sequential heading levels (h1 → h2 → h3)' }
};

export function formatIssue(issue) {
    const config = ISSUE_CONFIG[issue.type] || { icon: '⚠️', label: issue.type, suggestion: 'Review accessibility guidelines' };
    return { ...config, severity: issue.severity || 'warning' };
}
