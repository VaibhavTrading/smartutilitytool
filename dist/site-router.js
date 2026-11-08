/**
 * MONU COMPUTERS - Client Router, Hash Navigation, SEO & Privacy Controller
 * Uses window.MONU_SITE_CONFIG for dynamic base URL resolution
 * Support Email: vaibhav.dewangan499@gmail.com
 */

(function () {
    const config = window.MONU_SITE_CONFIG || {
        PRODUCTION_DOMAIN: 'YOUR_DOMAIN_HERE',
        SITE_NAME: 'MONU COMPUTERS',
        SUPPORT_EMAIL: 'vaibhav.dewangan499@gmail.com',
        getBaseUrl: function () {
            if (this.PRODUCTION_DOMAIN && 
                this.PRODUCTION_DOMAIN !== 'YOUR_DOMAIN_HERE' && 
                !this.PRODUCTION_DOMAIN.includes('YOUR_DOMAIN')) {
                return this.PRODUCTION_DOMAIN.replace(/\/+$/, '');
            }
            if (typeof window !== 'undefined' && window.location && window.location.origin) {
                return window.location.origin;
            }
            return '';
        },
        getCanonicalUrl: function (path) {
            const base = this.getBaseUrl();
            const cleanPath = (path || '/').startsWith('/') ? path : '/' + path;
            return base + cleanPath;
        }
    };

    window.MONU_CONFIG = config;

    const SUPPORT_EMAIL = config.SUPPORT_EMAIL || 'vaibhav.dewangan499@gmail.com';

    const ROUTES = {
        '/': {
            pageId: 'page-home',
            title: 'MONU COMPUTERS – Free Online Image Editing & Document Tools',
            description: 'Privacy-focused image and document tools. Edit supported files directly in your browser, with selected offline capabilities. Some advanced features require an internet connection.',
            path: '/'
        },
        '/document-studio': {
            pageId: 'page-doc-studio',
            title: 'Document Studio – Scanned Document Enhancement & Perspective Correction | MONU COMPUTERS',
            description: 'Enhance scanned documents, fix perspective distortion with OpenCV.js quad warping, remove shadows, adjust contrast, and export clean A4 prints directly in your browser with selected offline capabilities.',
            path: '/document-studio'
        },
        '/id-card-studio': {
            pageId: 'page-id-studio',
            title: 'ID Card Studio – Dual-Slot ID Card Framing & A4 Print Layout | MONU COMPUTERS',
            description: 'Frame front and back ID cards into standard 85.6x53.98mm dimensions with cutting trim marks directly in your browser with selected offline capabilities.',
            path: '/id-card-studio'
        },
        '/image-pdf-editor': {
            pageId: 'page-editor-studio',
            title: 'Image & PDF Editor – Compress, Resize, Crop, Convert & PDF Tools | MONU COMPUTERS',
            description: 'Complete online image & PDF studio. Compress to target KB, resize in pixels/inches/cm/mm, precision crop with angle presets, convert formats, and optimize multi-page PDFs directly in your browser with selected offline capabilities.',
            path: '/image-pdf-editor'
        },
        '/about': {
            pageId: 'page-about',
            title: 'About Us – MONU COMPUTERS Online Utility Platform',
            description: 'Learn about MONU COMPUTERS: our mission, hybrid browser + backend processing model, selected offline capabilities, and privacy-focused document processing.',
            path: '/about'
        },
        '/about-us': {
            pageId: 'page-about',
            title: 'About Us – MONU COMPUTERS Online Utility Platform',
            description: 'Learn about MONU COMPUTERS: our mission, hybrid browser + backend processing model, selected offline capabilities, and privacy-focused document processing.',
            path: '/about'
        },
        '/contact': {
            pageId: 'page-contact',
            title: 'Contact Us – MONU COMPUTERS Support & Feedback',
            description: 'Get in touch with the MONU COMPUTERS team for support, feature feedback, technical questions, or general inquiries regarding our utility suite.',
            path: '/contact'
        },
        '/contact-us': {
            pageId: 'page-contact',
            title: 'Contact Us – MONU COMPUTERS Support & Feedback',
            description: 'Get in touch with the MONU COMPUTERS team for support, feature feedback, technical questions, or general inquiries regarding our utility suite.',
            path: '/contact'
        },
        '/privacy-policy': {
            pageId: 'page-privacy',
            title: 'Privacy Policy – MONU COMPUTERS Data Protection Practices',
            description: 'Read our comprehensive privacy policy. Discover how MONU COMPUTERS processes supported files in-browser with selected offline capabilities, plus details on temporary server sessions, Google AdSense cookies, and local IndexedDB storage.',
            path: '/privacy-policy'
        },
        '/terms-and-conditions': {
            pageId: 'page-terms',
            title: 'Terms and Conditions – MONU COMPUTERS',
            description: 'Review the terms and conditions for using MONU COMPUTERS online image editing, scanned document enhancement, and PDF tools.',
            path: '/terms-and-conditions'
        },
        '/copyright-policy': {
            pageId: 'page-copyright',
            title: 'Copyright Policy – MONU COMPUTERS',
            description: 'Review our copyright policy, user ownership of uploaded files, DMCA notice procedures, and intellectual property guidelines.',
            path: '/copyright-policy'
        },
        '/disclaimer': {
            pageId: 'page-disclaimer',
            title: 'Disclaimer – MONU COMPUTERS',
            description: 'Important legal and utility disclaimer regarding document processing quality, non-affiliation with government entities, and user verification responsibilities.',
            path: '/disclaimer'
        }
    };

    let currentRoutePath = '/';

    function normalizePath(pathname) {
        if (!pathname) return '/';
        let p = pathname.trim();
        // Remove trailing slash if longer than 1 character
        if (p.length > 1 && p.endsWith('/')) {
            p = p.slice(0, -1);
        }
        return p || '/';
    }

    function parseUrl(rawUrl) {
        let urlStr = rawUrl || (window.location.pathname + window.location.hash);
        let [pathPart, hashPart] = urlStr.split('#');
        let pathname = normalizePath(pathPart || '/');
        let hash = hashPart ? '#' + hashPart : '';
        return { pathname, hash };
    }

    function updateMetaTags(routeInfo) {
        document.title = routeInfo.title;

        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = routeInfo.description;

        const canonicalUrl = config.getCanonicalUrl(routeInfo.path || routeInfo.canonical || '/');

        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = canonicalUrl;

        // OpenGraph
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = routeInfo.title;
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = routeInfo.description;
        let ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.content = canonicalUrl;

        // Twitter
        let twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle) twTitle.content = routeInfo.title;
        let twDesc = document.querySelector('meta[name="twitter:description"]');
        if (twDesc) twDesc.content = routeInfo.description;
    }

    function updateNavHighlights(path) {
        const links = document.querySelectorAll('.site-nav-link');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkPath = parseUrl(href).pathname;
            const isMatch = (linkPath === path) || 
                            (path === '/' && linkPath === '/') ||
                            ((path === '/about' || path === '/about-us') && (linkPath === '/about' || linkPath === '/about-us')) ||
                            ((path === '/contact' || path === '/contact-us') && (linkPath === '/contact' || linkPath === '/contact-us'));
            if (isMatch) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function scrollToHash(hash) {
        if (!hash) return;
        const targetId = hash.replace(/^#/, '');
        setTimeout(() => {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    }

    function mountStudioTool(targetPath) {
        const workspace = document.getElementById('shared-studio-workspace') || document.getElementById('page-studio-workspace');
        if (!workspace) return;

        let targetMountId = null;
        let mode = 'DOC';

        if (targetPath === '/document-studio') {
            targetMountId = 'tool-stage-doc';
            mode = 'DOC';
        } else if (targetPath === '/id-card-studio') {
            targetMountId = 'tool-stage-id';
            mode = 'ID';
        } else if (targetPath === '/image-pdf-editor') {
            targetMountId = 'tool-stage-editor';
            mode = 'EDITOR';
        }

        if (targetMountId) {
            const mountEl = document.getElementById(targetMountId);
            if (mountEl && workspace.parentElement !== mountEl) {
                mountEl.appendChild(workspace);
            }
            workspace.classList.remove('hidden');
            workspace.style.display = 'block';

            if (typeof window.switchMode === 'function') {
                window.switchMode(mode);
            }
            updateWorkspaceTopGuide(mode);

            // Synchronize temporary processing session for active tool
            if (window.MonuSessionManager && typeof window.MonuSessionManager.syncForCurrentTool === 'function') {
                window.MonuSessionManager.syncForCurrentTool(mode);
            }
        }
    }

    function navigateTo(url, push = true) {
        const { pathname, hash } = parseUrl(url);
        const route = ROUTES[pathname] || ROUTES['/'];

        // Hide all page views
        const pages = document.querySelectorAll('.page-view');
        pages.forEach(p => p.classList.add('hidden'));

        // Show target page
        const targetPage = document.getElementById(route.pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        } else {
            // Target page view not found in current DOM (e.g. multi-page static navigation)
            window.location.href = url;
            return;
        }

        // Mount tool directly into Section 3 if navigating to one of the 3 tool pages
        if (pathname === '/document-studio' || pathname === '/id-card-studio' || pathname === '/image-pdf-editor') {
            mountStudioTool(pathname);
        } else {
            // Non-tool view: Hide temporary session UI
            if (window.MonuSessionManager && typeof window.MonuSessionManager.syncForCurrentTool === 'function') {
                window.MonuSessionManager.syncForCurrentTool('NONE');
            }
        }

        // Update URL & Meta
        currentRoutePath = pathname;
        const fullTargetUrl = pathname + (hash || '');
        if (push && (window.location.pathname + window.location.hash) !== fullTargetUrl) {
            window.history.pushState({ path: pathname, hash: hash }, route.title, fullTargetUrl);
        }

        updateMetaTags(route);
        updateNavHighlights(pathname);

        // Close mobile drawer if open
        const mobileDrawer = document.getElementById('mobileNavDrawer');
        if (mobileDrawer) mobileDrawer.classList.remove('open');

        // Scroll to hash target if provided, otherwise scroll to top
        if (hash) {
            scrollToHash(hash);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // If navigating to privacy policy, refresh storage statistics
        if (pathname === '/privacy-policy') {
            setTimeout(refreshPrivacyStorageStats, 100);
        }
    }

    function openStudioWorkspace(mode) {
        const targetUrl = (mode === 'ID') ? '/id-card-studio' : (mode === 'EDITOR' ? '/image-pdf-editor' : '/document-studio');
        navigateTo(targetUrl, true);
        setTimeout(() => {
            const toolEl = document.getElementById('shared-studio-workspace') || document.querySelector('.tool-embed-wrapper');
            if (toolEl) {
                toolEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    function closeStudioWorkspace(shouldNavigate = true) {
        if (shouldNavigate) {
            navigateTo('/', true);
        }
    }

    function updateWorkspaceTopGuide(mode) {
        // Workspace mode badge & top tutorial link permanently removed per user request
        return;
    }

    // ═══ HONEST CONTACT FORM HANDLER ═══
    function initContactForm() {
        const form = document.getElementById('monuContactForm');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = (document.getElementById('cf-name')?.value || '').trim();
            const email = (document.getElementById('cf-email')?.value || '').trim();
            const subject = (document.getElementById('cf-subject')?.value || '').trim();
            const message = (document.getElementById('cf-message')?.value || '').trim();
            const honeypot = (document.getElementById('cf-honeypot')?.value || '').trim();
            const statusEl = document.getElementById('cf-status-msg');

            if (!statusEl) return;

            // Anti-spam honeypot detection
            if (honeypot.length > 0) {
                statusEl.innerHTML = '<div style="color:#ef4444; font-weight:700; padding:10px; background:#fef2f2; border-radius:8px;">Spam detected. Please retry.</div>';
                return;
            }

            if (!name || !email || !message) {
                statusEl.innerHTML = '<div style="color:#ef4444; font-weight:700; padding:10px; background:#fef2f2; border-radius:8px;">Please fill in your name, email address, and message.</div>';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                statusEl.innerHTML = '<div style="color:#ef4444; font-weight:700; padding:10px; background:#fef2f2; border-radius:8px;">Please enter a valid email address.</div>';
                return;
            }

            const basePlatformUrl = config.getBaseUrl() || 'https://YOUR_DOMAIN_HERE';
            const emailSubject = subject ? `[MONU COMPUTERS Inquiry] ${subject}` : `[MONU COMPUTERS Inquiry] from ${name}`;
            const emailBody = `Hello MONU COMPUTERS Support Team,\n\nFrom: ${name} (${email})\nSubject: ${subject || 'General Assistance'}\n\nMessage:\n${message}\n\n---\nSent via MONU COMPUTERS Web Platform (${basePlatformUrl})`;

            const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

            try {
                window.location.href = mailtoUrl;
            } catch (err) {
                console.warn('Mailto launch:', err);
            }

            window._lastContactMessage = `To: ${SUPPORT_EMAIL}\nSubject: ${emailSubject}\n\n${emailBody}`;

            statusEl.innerHTML = `
                <div class="contact-feedback-card">
                    <div class="contact-feedback-title">
                        <span>✉️ Action Required: Send via Email</span>
                    </div>
                    <div class="contact-feedback-desc">
                        Your default email client has been launched with your message pre-filled to <strong>${SUPPORT_EMAIL}</strong>. If your email application did not open automatically, click the button below or copy your message:
                    </div>
                    <div class="contact-feedback-actions">
                        <a href="${mailtoUrl}" class="btn-action-mail">✉️ Open Email App</a>
                        <button type="button" class="btn-action-copy" onclick="MonuRouter.copyContactMessage()">📋 Copy Formatted Message</button>
                    </div>
                    <div id="cf-copy-notice" style="display:none; margin-top:8px; font-size:12px; font-weight:700; color:#15803d;">
                        ✓ Message copied to clipboard! You can paste it into Gmail, Outlook, or any webmail provider.
                    </div>
                </div>
            `;
        });
    }

    function copyContactMessage() {
        if (!window._lastContactMessage) return;
        navigator.clipboard.writeText(window._lastContactMessage).then(() => {
            const notice = document.getElementById('cf-copy-notice');
            if (notice) notice.style.display = 'block';
        }).catch(err => {
            console.warn('Clipboard copy error:', err);
        });
    }

    // ═══ PRIVACY & LOCAL DATA MANAGEMENT ═══
    async function refreshPrivacyStorageStats() {
        if (!window.MonuStorageManager) return;
        const summary = await window.MonuStorageManager.getStorageSummary();
        const docEl = document.getElementById('privacy-doc-count');
        const idEl = document.getElementById('privacy-id-count');
        const editorEl = document.getElementById('privacy-editor-count');
        if (docEl) docEl.textContent = summary.docCount;
        if (idEl) idEl.textContent = summary.idSetCount;
        if (editorEl) editorEl.textContent = summary.editorProjectCount;
    }

    function promptClearAllData() {
        const modal = document.getElementById('confirmClearDataModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            if (confirm('Are you sure you want to delete all locally stored documents, ID cards, and editor projects from your browser? This action permanently removes local IndexedDB cache.')) {
                executeClearAllData();
            }
        }
    }

    function closeClearDataModal() {
        const modal = document.getElementById('confirmClearDataModal');
        if (modal) modal.style.display = 'none';
    }

    async function executeClearAllData() {
        closeClearDataModal();
        const statusEl = document.getElementById('privacy-clear-status');
        if (statusEl) {
            statusEl.innerHTML = '<span style="color:#b621fe; font-weight:700;">Clearing local IndexedDB storage...</span>';
        }
        if (window.MonuStorageManager) {
            const success = await window.MonuStorageManager.clearAllData();
            if (statusEl) {
                if (success) {
                    statusEl.innerHTML = '<span style="color:#10b981; font-weight:700;">✓ All locally stored documents, ID sets, and editor data have been successfully deleted from your browser.</span>';
                } else {
                    statusEl.innerHTML = '<span style="color:#ef4444; font-weight:700;">Failed to delete some local data. Please clear your browser cache manually.</span>';
                }
            }
            refreshPrivacyStorageStats();
        }
    }

    // ═══ INITIALIZE ROUTER & LISTENERS ═══
    function initRouter() {
        // Intercept internal link clicks with hash support
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a[data-link], a.site-nav-link, a.btn-tool-guide, a.footer-link, a.breadcrumb-link, a.hero-anchor');
            if (link) {
                const href = link.getAttribute('href');
                if (href && (href.startsWith('/') || href.startsWith('#')) && !href.startsWith('//')) {
                    const { pathname, hash } = parseUrl(href);

                    // If same page with hash anchor, scroll smoothly without full reload
                    if (pathname === currentRoutePath && hash) {
                        e.preventDefault();
                        scrollToHash(hash);
                        window.history.pushState({ path: pathname, hash: hash }, document.title, pathname + hash);
                        return;
                    }

                    // Internal route navigation
                    e.preventDefault();
                    navigateTo(href, true);
                }
            }
        });

        // Handle Browser Back / Forward buttons
        window.addEventListener('popstate', function () {
            navigateTo(window.location.pathname + window.location.hash, false);
        });

        // Handle URL hash changes
        window.addEventListener('hashchange', function () {
            scrollToHash(window.location.hash);
        });

        // Initialize FAQ accordions
        initFaqAccordions();

        // Initialize Contact Form
        initContactForm();

        // Dynamic Year in Footer
        const yearEl = document.getElementById('current-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }

        // Mobile Menu Button
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileDrawer = document.getElementById('mobileNavDrawer');
        if (mobileBtn && mobileDrawer) {
            mobileBtn.addEventListener('click', function () {
                mobileDrawer.classList.toggle('open');
            });
        }

        // Check for workspace URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('workspace')) {
            const requestedMode = urlParams.get('workspace') || 'DOC';
            openStudioWorkspace(requestedMode);
            return;
        }

        // Initial Route Resolution on Load
        const initialFullUrl = window.location.pathname + window.location.hash;
        const parsed = parseUrl(initialFullUrl);
        if (ROUTES[parsed.pathname]) {
            navigateTo(initialFullUrl, false);
        } else {
            navigateTo('/' + (parsed.hash || ''), false);
        }
    }

    function initFaqAccordions() {
        document.addEventListener('click', function (e) {
            const questionBtn = e.target.closest('.faq-question-btn');
            if (!questionBtn) return;

            const item = questionBtn.closest('.faq-item');
            if (!item) return;

            const isActive = item.classList.contains('active');

            // Close other items in the same container
            const container = item.closest('.faq-list');
            if (container) {
                container.querySelectorAll('.faq-item').forEach(el => {
                    if (el !== item) el.classList.remove('active');
                });
            }

            item.classList.toggle('active', !isActive);
            questionBtn.setAttribute('aria-expanded', !isActive);
        });
    }

    // Expose globals for onclick bindings in HTML
    window.MonuRouter = {
        navigateTo,
        openStudioWorkspace,
        closeStudioWorkspace,
        mountStudioTool,
        updateWorkspaceTopGuide,
        copyContactMessage,
        promptClearAllData,
        closeClearDataModal,
        executeClearAllData,
        refreshPrivacyStorageStats
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRouter);
    } else {
        initRouter();
    }
})();
