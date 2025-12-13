/**
 * Axe Analyzer - Axe-core Accessibility Testing Integration
 * Uses axe-core library for comprehensive WCAG violation detection
 */

// Dynamically import axe-core from CDN
let axe = null;

/**
 * Load axe-core library
 */
async function loadAxe() {
    if (axe) return axe;

    try {
        const module = await import('https://cdn.jsdelivr.net/npm/axe-core@4.8.4/+esm');
        axe = module.default;
        console.log('✅ Axe-core loaded successfully');
        return axe;
    } catch (error) {
        console.error('❌ Failed to load axe-core:', error);
        throw new Error('Could not load axe-core library');
    }
}

/**
 * Run axe-core analysis on a container element
 * @param {HTMLElement} container - The element to analyze
 * @returns {Promise<Object>} Analysis results with violations
 */
export async function runAxeAnalysis(container) {
    await loadAxe();

    console.log('🔍 Running axe-core analysis...');

    try {
        const results = await axe.run(container, {
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
            },
            resultTypes: ['violations', 'incomplete']
        });

        console.log(`📊 Axe found ${results.violations.length} violations, ${results.incomplete.length} incomplete`);

        return {
            violations: results.violations.map(formatViolation),
            incomplete: results.incomplete.map(formatViolation),
            passes: results.passes.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Axe analysis failed:', error);
        throw error;
    }
}

/**
 * Format a violation for display
 */
function formatViolation(violation) {
    return {
        id: violation.id,
        impact: violation.impact, // 'critical', 'serious', 'moderate', 'minor'
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        tags: violation.tags,
        nodes: violation.nodes.map(node => ({
            html: node.html,
            target: node.target,
            failureSummary: node.failureSummary,
            // Extract fix suggestions
            fixes: node.any.concat(node.all, node.none).map(check => ({
                message: check.message,
                data: check.data
            }))
        }))
    };
}

/**
 * Get severity color for impact level
 */
export function getImpactColor(impact) {
    const colors = {
        critical: 'var(--accent-red)',
        serious: 'var(--accent-orange)',
        moderate: 'var(--accent-yellow, #f59e0b)',
        minor: 'var(--accent-blue)'
    };
    return colors[impact] || 'var(--text-muted)';
}

/**
 * Get severity icon for impact level
 */
export function getImpactIcon(impact) {
    const icons = {
        critical: '🔴',
        serious: '🟠',
        moderate: '🟡',
        minor: '🔵'
    };
    return icons[impact] || '⚪';
}

/**
 * Format WCAG tags for display
 */
export function formatWcagTags(tags) {
    return tags
        .filter(tag => tag.startsWith('wcag') || tag === 'best-practice')
        .map(tag => {
            if (tag === 'best-practice') return 'Best Practice';
            // Format wcag2a, wcag21aa, etc.
            return tag.toUpperCase().replace('WCAG', 'WCAG ');
        });
}
