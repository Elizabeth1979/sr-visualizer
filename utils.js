/**
 * Shared utility functions for SR Visualizer
 */

/**
 * Validate Axe results structure
 * @param {Object} results - Raw Axe results
 * @returns {Object} Validated results
 * @throws {Error} If results completely invalid
 */
export function validateAxeResults(results) {
    if (!results || typeof results !== 'object') {
        throw new Error('Invalid Axe results: not an object');
    }

    // Ensure arrays exist
    if (!Array.isArray(results.violations)) {
        console.warn('⚠️ Axe results missing violations array, using empty array');
        results.violations = [];
    }

    if (!Array.isArray(results.incomplete)) {
        console.warn('⚠️ Axe results missing incomplete array, using empty array');
        results.incomplete = [];
    }

    // Validate each violation has required fields
    results.violations = results.violations.filter((v, idx) => {
        const valid = v.id && v.impact && v.description && v.help && v.helpUrl;
        if (!valid) {
            console.warn(`⚠️ Filtering invalid violation at index ${idx}:`, v);
        }
        return valid;
    });

    // Same for incomplete
    results.incomplete = results.incomplete.filter((i, idx) => {
        const valid = i.id && i.description && i.help;
        if (!valid) {
            console.warn(`⚠️ Filtering invalid incomplete issue at index ${idx}:`, i);
        }
        return valid;
    });

    // Ensure passes count exists
    if (!Array.isArray(results.passes)) {
        results.passes = [];
    }

    console.log(`✅ Validated Axe results: ${results.violations.length} violations, ${results.incomplete.length} incomplete`);

    return results;
}

/**
 * Display user-friendly error with optional retry
 * @param {string} location - Where the error occurred
 * @param {Error|string} error - The error
 * @param {Function} retryCallback - Optional retry function
 * @returns {HTMLElement} Error element
 */
export function showError(location, error, retryCallback = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';

    const message = error.message || String(error);

    errorDiv.innerHTML = `
        <div class="error-header">
            <span class="error-icon">⚠️</span>
            <strong>Error in ${location}</strong>
        </div>
        <p class="error-detail">${message}</p>
        ${retryCallback ? '<button class="btn btn-sm btn-secondary error-retry-btn">Retry</button>' : ''}
        <button class="btn btn-sm error-dismiss-btn" aria-label="Dismiss error">✕</button>
    `;

    // Retry handler
    if (retryCallback) {
        errorDiv.querySelector('.error-retry-btn').addEventListener('click', () => {
            errorDiv.remove();
            retryCallback();
        });
    }

    // Dismiss handler
    errorDiv.querySelector('.error-dismiss-btn').addEventListener('click', () => {
        errorDiv.remove();
    });

    return errorDiv;
}

/**
 * Categorize error type for better messaging
 * @param {Error} error - The error
 * @returns {Object} { type, userMessage }
 */
export function categorizeError(error) {
    const message = error.message || String(error);

    if (error.name === 'TypeError' && message.includes('fetch')) {
        return {
            type: 'network',
            userMessage: 'Network error: Please check your internet connection and try again.'
        };
    }

    if (message.includes('timeout')) {
        return {
            type: 'timeout',
            userMessage: 'Request timed out: The service is slow or unreachable. Please try again.'
        };
    }

    if (message.includes('API key')) {
        return {
            type: 'auth',
            userMessage: 'Invalid API key: Please check your Gemini API key and try again.'
        };
    }

    if (message.includes('JSON') || message.includes('parse')) {
        return {
            type: 'parse',
            userMessage: 'Response parsing error: Received invalid data from the service.'
        };
    }

    return {
        type: 'unknown',
        userMessage: message
    };
}
