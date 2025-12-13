/**
 * SR Visualizer - Screen Reader Visualization Engine
 * Uses @guidepup/virtual-screen-reader to traverse DOM and create overlays
 */

// Import Virtual Screen Reader from CDN
let virtual = null;

export async function initVirtualScreenReader() {
    if (virtual) return virtual;

    try {
        const module = await import(
            'https://unpkg.com/@guidepup/virtual-screen-reader/lib/esm/index.browser.js'
        );
        virtual = module.virtual;
        console.log('✅ Virtual Screen Reader loaded successfully');
        return virtual;
    } catch (error) {
        console.error('❌ Failed to load Virtual Screen Reader:', error);
        throw error;
    }
}

/**
 * Element category detection based on role/tag
 */
const CATEGORY_PATTERNS = {
    landmark: ['navigation', 'banner', 'main', 'contentinfo', 'region', 'complementary', 'search', 'article', 'document'],
    heading: ['heading'],
    interactive: ['button', 'link', 'menu', 'image', 'img', 'graphic'],
    form: ['textbox', 'checkbox', 'radio', 'combobox', 'listbox', 'spinbutton', 'slider', 'switch', 'group', 'form']
};

function getElementCategory(announcement) {
    const lower = announcement.toLowerCase();
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        if (patterns.some(p => lower.includes(p))) return category;
    }
    return 'content';
}

/**
 * Analyze a container and return screen reader announcements
 * Returns array of { announcement, category }
 * @param {HTMLElement} container - The DOM container to analyze
 * @param {Function} onProgress - Optional callback called with each new announcement
 */
export async function analyzeContainer(container, onProgress = null) {
    const vsr = await initVirtualScreenReader();

    console.log('🎬 Starting Virtual Screen Reader analysis...');

    const results = [];
    const seen = new Set();

    try {
        // Start virtual screen reader on the container
        await vsr.start({ container });
        console.log('✅ VSR started');

        // Navigate through the entire document, streaming results
        let safetyCounter = 0;
        const maxIterations = 500;

        while (safetyCounter < maxIterations) {
            const phrase = await vsr.lastSpokenPhrase();

            // Stop if we've reached the end
            if (phrase === 'end of document') {
                break;
            }

            // Add this phrase if not seen and not a marker
            if (phrase &&
                !seen.has(phrase) &&
                phrase !== 'document' &&
                !phrase.startsWith('end of ')) {

                seen.add(phrase);
                const result = {
                    index: results.length,
                    announcement: phrase,
                    category: getElementCategory(phrase)
                };
                results.push(result);

                // Stream to UI immediately
                if (onProgress) {
                    onProgress(result, results.length);
                }
            }

            await vsr.next();
            safetyCounter++;
        }

        console.log(`📊 Found ${results.length} unique announcements`);

    } catch (error) {
        console.error('❌ Error during VSR traversal:', error);
    } finally {
        // Always stop the VSR
        try {
            await vsr.stop();
            console.log('🛑 VSR stopped');
        } catch (e) {
            console.warn('Warning stopping VSR:', e);
        }
    }

    return results;
}

/**
 * Simple analysis without VSR - fallback that scans DOM directly
 * This provides results even if VSR fails
 */
export function analyzeContainerSimple(container) {
    const results = [];

    // Scan for key elements
    const selectors = [
        { selector: 'nav, [role="navigation"]', category: 'landmark', label: 'navigation' },
        { selector: 'header, [role="banner"]', category: 'landmark', label: 'banner' },
        { selector: 'main, [role="main"]', category: 'landmark', label: 'main' },
        { selector: 'footer, [role="contentinfo"]', category: 'landmark', label: 'contentinfo' },
        { selector: 'h1', category: 'heading', labelFn: el => `heading, ${el.textContent.trim()}, level 1` },
        { selector: 'h2', category: 'heading', labelFn: el => `heading, ${el.textContent.trim()}, level 2` },
        { selector: 'h3', category: 'heading', labelFn: el => `heading, ${el.textContent.trim()}, level 3` },
        {
            selector: 'button, [role="button"]', category: 'interactive', labelFn: el => {
                const name = el.getAttribute('aria-label') || el.textContent.trim();
                return name ? `button, ${name}` : 'button';
            }
        },
        {
            selector: 'a[href]', category: 'interactive', labelFn: el => {
                const name = el.getAttribute('aria-label') || el.textContent.trim();
                return name ? `link, ${name}` : 'link';
            }
        },
        {
            selector: 'img', category: 'interactive', labelFn: el => {
                const alt = el.getAttribute('alt');
                return alt ? `image, ${alt}` : 'image';
            }
        },
        {
            selector: 'input[type="text"], input:not([type]), textarea', category: 'form', labelFn: el => {
                const label = el.getAttribute('aria-label') ||
                    document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ||
                    el.placeholder;
                return label ? `textbox, ${label}` : 'textbox';
            }
        },
        {
            selector: 'input[type="email"]', category: 'form', labelFn: el => {
                const label = el.getAttribute('aria-label') ||
                    document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim();
                return label ? `textbox, ${label}` : 'textbox';
            }
        },
        {
            selector: 'input[type="checkbox"]', category: 'form', labelFn: el => {
                const label = el.getAttribute('aria-label') ||
                    el.closest('label')?.textContent?.trim();
                return label ? `checkbox, ${label}` : 'checkbox';
            }
        },
        {
            selector: 'input[type="radio"]', category: 'form', labelFn: el => {
                const label = el.getAttribute('aria-label') ||
                    el.closest('label')?.textContent?.trim();
                return label ? `radio button, ${label}` : 'radio button';
            }
        },
    ];

    let index = 0;
    selectors.forEach(({ selector, category, label, labelFn }) => {
        container.querySelectorAll(selector).forEach(el => {
            const announcement = labelFn ? labelFn(el) : label;
            results.push({
                index: index++,
                announcement,
                category,
                element: el
            });
        });
    });

    return results;
}
