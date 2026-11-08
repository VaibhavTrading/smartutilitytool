/**
 * MONU COMPUTERS - Temporary Processing Session & Timer Manager
 * Implements Processing Location Indicator (Browser "On Your Device" vs "Temporary Server Processing"),
 * live MM:SS countdown, 2-minute warning, 10-minute inactivity & 20-minute absolute expiration,
 * Delete Now API, offline handling, and multi-tool session isolation.
 */

(function () {
    const STORAGE_KEY_PREFIX = 'monu_backend_session_';

    // Current session runtime state
    let state = {
        sessionId: null,
        token: null,
        toolType: 'DOC', // 'DOC', 'ID', 'EDITOR', or 'NONE'
        expiresAt: null,
        remainingSeconds: 0,
        status: 'IDLE', // 'IDLE', 'ACTIVE', 'WARNING', 'EXPIRED', 'DELETING', 'OFFLINE'
        locationMode: 'BROWSER', // 'BROWSER', 'COMPLETED_BROWSER', 'SERVER', 'COMPLETED_SERVER', 'MIXED', 'UPLOADING', 'UPLOAD_FAILED', 'EXPIRED', 'DELETED'
        timerInterval: null,
        pollInterval: null,
        warningShown: false,
        isSimulatedOffline: false
    };

    function getCurrentToolType() {
        const path = window.location.pathname;
        if (path.includes('id-card')) return 'ID';
        if (path.includes('editor')) return 'EDITOR';
        if (path.includes('document')) return 'DOC';

        // Check if a tool page view is currently visible
        const docPage = document.getElementById('page-doc-studio');
        const idPage = document.getElementById('page-id-studio');
        const editorPage = document.getElementById('page-editor-studio');
        if (docPage && !docPage.classList.contains('hidden')) return 'DOC';
        if (idPage && !idPage.classList.contains('hidden')) return 'ID';
        if (editorPage && !editorPage.classList.contains('hidden')) return 'EDITOR';

        return 'NONE';
    }

    // Save session to storage
    function saveSessionToStorage(sessionData) {
        if (!sessionData || !sessionData.toolType) return;
        try {
            sessionStorage.setItem(STORAGE_KEY_PREFIX + sessionData.toolType, JSON.stringify(sessionData));
        } catch (e) {
            console.warn('[Session] Failed to save session to storage:', e);
        }
    }

    // Load session from storage
    function loadSessionFromStorage(toolType) {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + toolType);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    // Clear session from storage
    function clearSessionFromStorage(toolType) {
        try {
            sessionStorage.removeItem(STORAGE_KEY_PREFIX + toolType);
        } catch (e) {}
    }

    // Initialize UI Elements in DOM
    function initUI() {
        if (document.getElementById('monu-session-ui-container')) return;

        const container = document.createElement('div');
        container.id = 'monu-session-ui-container';
        container.innerHTML = `
            <!-- Top Right Session & Processing Location Indicator Bar -->
            <div id="monu-session-indicator" class="monu-session-indicator" style="display:none;" role="status" aria-live="polite">
                <div class="session-indicator-pill browser" id="session-indicator-pill">
                    <div class="session-status-badge">
                        <span id="session-dot" class="status-dot browser-dot"></span>
                        <span id="session-location-icon" class="session-location-icon" aria-hidden="true">💻</span>
                        <span id="session-status-label" class="session-status-label">On Your Device</span>
                    </div>
                    <div class="session-timer-badge" id="session-timer-badge" style="display:none;" title="Remaining temporary session lifetime">
                        <span class="session-timer-icon" aria-hidden="true">⏱️</span>
                        <span id="session-timer-clock" class="session-timer-clock">20:00</span>
                    </div>
                    <button type="button" class="btn-session-delete" id="btn-session-delete" style="display:none;" onclick="MonuSessionManager.promptDeleteSession()" title="Delete temporary session and files">
                        🗑️ Delete Now
                    </button>
                </div>
                <div class="session-indicator-note" id="session-indicator-note" style="display:none;">
                    <span id="session-note-text"></span>
                </div>
            </div>

            <!-- In-UI Success Toast Notification -->
            <div id="session-toast" class="session-toast" style="display:none;" role="alert">
                <span class="session-toast-icon">✓</span>
                <span id="session-toast-text">Temporary session deleted successfully.</span>
            </div>

            <!-- Delete Confirmation Modal -->
            <div id="session-delete-modal" class="session-modal-backdrop" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                <div class="session-modal-box">
                    <div class="session-modal-icon warning">⚠️</div>
                    <h3 id="delete-modal-title">Delete Temporary Session?</h3>
                    <p>Are you sure you want to delete this temporary session and all its uploaded files and processing results?</p>
                    <div id="session-delete-error" class="session-error-message" style="display:none;"></div>
                    <div class="session-modal-actions">
                        <button type="button" class="btn-modal-cancel" onclick="MonuSessionManager.closeDeleteModal()">Cancel</button>
                        <button type="button" class="btn-modal-delete" id="btn-confirm-delete" onclick="MonuSessionManager.executeDeleteSession()">🗑️ Yes, Delete Now</button>
                    </div>
                </div>
            </div>

            <!-- Session Expired Modal -->
            <div id="session-expired-modal" class="session-modal-backdrop" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="expired-modal-title">
                <div class="session-modal-box">
                    <div class="session-modal-icon expired">⌛</div>
                    <h3 id="expired-modal-title" style="color:#b91c1c;">Session Expired</h3>
                    <p>Your temporary processing session has expired. Your uploaded files and temporary results are being deleted according to our temporary data retention policy.</p>
                    <p class="session-modal-subnote">Note: Your browser-local files, saved projects, and downloaded results remain completely safe on your device.</p>
                    <div class="session-modal-actions">
                        <button type="button" class="btn-modal-cancel" onclick="MonuSessionManager.closeExpiredModal()">Close</button>
                        <button type="button" class="btn-modal-primary" onclick="MonuSessionManager.startNewSession()">🚀 Start New Session</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        // Mount session indicator into active tool workspace
        mountIndicatorIntoWorkspace();
    }

    // Mount indicator inside tool workspace header
    // Mount indicator inside site-nav-container on the right side
    function mountIndicatorIntoWorkspace() {
        const indicator = document.getElementById('monu-session-indicator');
        if (!indicator) return;

        const navMount = document.getElementById('site-nav-session-mount');
        if (navMount) {
            if (indicator.parentElement !== navMount) {
                navMount.appendChild(indicator);
            }
            return;
        }

        const navActions = document.querySelector('.site-nav-actions') || document.querySelector('.site-nav-container');
        if (navActions) {
            const mobileBtn = navActions.querySelector('.mobile-menu-btn');
            if (mobileBtn && indicator.parentElement !== navActions) {
                navActions.insertBefore(indicator, mobileBtn);
            } else if (indicator.parentElement !== navActions) {
                navActions.appendChild(indicator);
            }
        }
    }

    // Set processing location mode explicitly (BROWSER, SERVER, MIXED, UPLOADING, etc.)
    function setProcessingLocation(mode, customNote) {
        state.locationMode = mode;
        const pill = document.getElementById('session-indicator-pill');
        const dot = document.getElementById('session-dot');
        const icon = document.getElementById('session-location-icon');
        const label = document.getElementById('session-status-label');
        const timerBadge = document.getElementById('session-timer-badge');
        const deleteBtn = document.getElementById('btn-session-delete');
        const noteText = document.getElementById('session-note-text');
        const noteContainer = document.getElementById('session-indicator-note');

        if (!pill || !dot || !label || !noteText) return;

        const policyLink = ' <a href="/privacy-policy#temporary-session-retention" class="session-policy-link">Policy ↗</a>';

        switch (mode) {
            case 'BROWSER':
                pill.className = 'session-indicator-pill browser';
                dot.className = 'status-dot browser-dot';
                if (icon) icon.textContent = '💻';
                label.textContent = 'On Your Device';
                if (timerBadge) timerBadge.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                noteText.innerHTML = customNote || '';
                if (noteContainer) noteContainer.style.display = customNote ? 'block' : 'none';
                break;

            case 'COMPLETED_BROWSER':
                pill.className = 'session-indicator-pill browser';
                dot.className = 'status-dot browser-dot';
                if (icon) icon.textContent = '✅';
                label.textContent = 'On Your Device';
                if (timerBadge) timerBadge.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                noteText.innerHTML = customNote || '';
                if (noteContainer) noteContainer.style.display = customNote ? 'block' : 'none';
                break;

            case 'UPLOADING':
                pill.className = 'session-indicator-pill uploading';
                dot.className = 'status-dot uploading-dot';
                if (icon) icon.textContent = '⬆️';
                label.textContent = 'Uploading...';
                if (timerBadge) timerBadge.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                noteText.innerHTML = customNote || 'Uploading file securely to temporary server storage...';
                if (noteContainer) noteContainer.style.display = 'block';
                break;

            case 'SERVER':
            case 'COMPLETED_SERVER':
                pill.className = state.status === 'WARNING' ? 'session-indicator-pill warning' : 'session-indicator-pill active';
                dot.className = state.status === 'WARNING' ? 'status-dot warning' : 'status-dot active';
                if (icon) icon.textContent = '☁️';
                label.textContent = mode === 'COMPLETED_SERVER' ? 'Temporary Server Processing (Completed)' : 'Temporary Server Processing';
                if (timerBadge) timerBadge.style.display = 'inline-flex';
                if (deleteBtn) deleteBtn.style.display = 'inline-flex';
                if (mode === 'COMPLETED_SERVER') {
                    noteText.innerHTML = customNote || ('Processing complete. Temporary files are stored on server and will auto-delete when timer expires.' + policyLink);
                } else {
                    noteText.innerHTML = customNote || ('Your file is temporarily stored on our server for processing.' + policyLink);
                }
                if (noteContainer) noteContainer.style.display = 'block';
                break;

            case 'MIXED':
                pill.className = 'session-indicator-pill mixed';
                dot.className = 'status-dot mixed-dot';
                if (icon) icon.textContent = '🔀';
                label.textContent = 'Mixed Processing';
                const hasSession = Boolean(state.sessionId && state.expiresAt);
                if (timerBadge) timerBadge.style.display = hasSession ? 'inline-flex' : 'none';
                if (deleteBtn) deleteBtn.style.display = hasSession ? 'inline-flex' : 'none';
                noteText.innerHTML = customNote || ('File canvas preview rendered on your device. Temporary server processing used for backend operations.' + policyLink);
                break;

            case 'UPLOAD_FAILED':
                pill.className = 'session-indicator-pill expired';
                dot.className = 'status-dot expired';
                if (icon) icon.textContent = '⚠️';
                label.textContent = 'Upload Failed';
                if (timerBadge) timerBadge.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                noteText.innerHTML = customNote || '<strong style="color:#ef4444;">Upload to temporary server storage failed. Please check connection and try again.</strong>';
                break;

            case 'EXPIRED':
                pill.className = 'session-indicator-pill expired';
                dot.className = 'status-dot expired';
                if (icon) icon.textContent = '⌛';
                label.textContent = 'Session Expired';
                if (timerBadge) timerBadge.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                noteText.textContent = customNote || 'Session expired. Uploaded temporary files have been deleted from server.';
                break;

            case 'DELETED':
                pill.className = 'session-indicator-pill expired';
                dot.className = 'status-dot expired';
                if (icon) icon.textContent = '🗑️';
                label.textContent = 'Session Deleted';
                if (timerBadge) timerBadge.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                noteText.textContent = customNote || 'Temporary session and files deleted from server.';
                break;
        }

        showIndicator(true);
    }

    // Show in-UI Toast Notification
    function showToast(message, isError = false) {
        const toast = document.getElementById('session-toast');
        const text = document.getElementById('session-toast-text');
        if (!toast || !text) return;

        text.textContent = message;
        toast.className = isError ? 'session-toast error' : 'session-toast success';
        toast.style.display = 'flex';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }

    // Automatically trigger or attach to temporary session after successful backend upload
    async function notifyBackendUpload(toolType, fileInfo = {}) {
        let targetTool = (toolType || getCurrentToolType()).toUpperCase();
        if (targetTool === 'NONE') targetTool = 'DOC';

        state.toolType = targetTool;
        setProcessingLocation('UPLOADING');

        try {
            const bodyPayload = {
                toolType: targetTool,
                sessionId: state.sessionId,
                token: state.token,
                fileName: fileInfo.name || 'uploaded_document',
                fileSize: fileInfo.size || 0
            };

            const res = await fetch('/api/session/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!res.ok) throw new Error('Server returned ' + res.status);

            const data = await res.json();
            if (data.success) {
                state.sessionId = data.sessionId;
                state.token = data.token;
                state.toolType = data.toolType;
                state.expiresAt = data.expiresAt;
                state.remainingSeconds = data.remainingSeconds;
                state.status = 'ACTIVE';
                state.warningShown = false;

                saveSessionToStorage({
                    sessionId: state.sessionId,
                    token: state.token,
                    toolType: state.toolType,
                    expiresAt: state.expiresAt
                });

                mountIndicatorIntoWorkspace();
                setProcessingLocation('SERVER');
                startCountdownTimer();
                startServerPolling();
                showToast(`Temporary backend processing session active (${formatTime(state.remainingSeconds)} remaining).`);
                return data;
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (err) {
            console.warn('[Session] Failed to establish backend session:', err);
            setProcessingLocation('UPLOAD_FAILED');
            showToast('Unable to establish temporary server session.', true);
        }
    }

    // Start a new backend temporary processing session
    async function startSession(toolType, durationSeconds, inactivitySeconds) {
        let targetTool = (toolType || getCurrentToolType()).toUpperCase();
        if (targetTool === 'NONE') {
            targetTool = 'DOC';
        }
        state.toolType = targetTool;
        setProcessingLocation('UPLOADING');

        try {
            const bodyPayload = { toolType: targetTool };
            if (durationSeconds) bodyPayload.durationSeconds = durationSeconds;
            if (inactivitySeconds) bodyPayload.inactivitySeconds = inactivitySeconds;

            const res = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!res.ok) throw new Error('Server returned ' + res.status);

            const data = await res.json();
            if (data.success) {
                state.sessionId = data.sessionId;
                state.token = data.token;
                state.toolType = data.toolType;
                state.expiresAt = data.expiresAt;
                state.remainingSeconds = data.remainingSeconds;
                state.status = 'ACTIVE';
                state.warningShown = false;

                saveSessionToStorage({
                    sessionId: state.sessionId,
                    token: state.token,
                    toolType: state.toolType,
                    expiresAt: state.expiresAt
                });

                mountIndicatorIntoWorkspace();
                setProcessingLocation('SERVER');
                startCountdownTimer();
                startServerPolling();
                showToast(`Temporary backend session started (${formatTime(state.remainingSeconds)}).`);
                return data;
            }
        } catch (err) {
            console.warn('[Session] Failed to create backend session:', err);
            setProcessingLocation('UPLOAD_FAILED');
            showToast('Unable to start temporary session. Please check your connection.', true);
        }
    }

    // Verify and synchronize active session for the current tool
    async function syncForCurrentTool(toolType) {
        let activeTool = (toolType || getCurrentToolType()).toUpperCase();

        if (activeTool === 'NONE') {
            hideIndicator();
            return;
        }

        mountIndicatorIntoWorkspace();

        const stored = loadSessionFromStorage(activeTool);
        if (!stored || !stored.sessionId || !stored.token) {
            // No active backend session for this tool -> display "On Your Device"
            setProcessingLocation('BROWSER');
            showIndicator(true);
            return;
        }

        // Verify with backend authority
        state.sessionId = stored.sessionId;
        state.token = stored.token;
        state.toolType = stored.toolType;
        state.expiresAt = stored.expiresAt;

        await pollServerStatus(true);
    }

    // Poll backend status to enforce backend authority
    async function pollServerStatus(isInitialSync = false) {
        if (!state.sessionId || !state.token) return;

        // If offline, display offline status and do not poll
        if (!navigator.onLine || state.isSimulatedOffline) {
            updateUIState('OFFLINE');
            return;
        }

        try {
            const res = await fetch(`/api/session/status?sessionId=${encodeURIComponent(state.sessionId)}&token=${encodeURIComponent(state.token)}`);
            
            if (res.status === 410 || res.status === 404) {
                // Session expired or deleted on backend authority
                const errData = await res.json().catch(() => ({}));
                handleSessionExpiration(errData.error);
                return;
            }

            if (!res.ok) {
                console.warn('[Session] Backend status check returned status:', res.status);
                return;
            }

            const data = await res.json();
            if (data.success) {
                state.expiresAt = data.expiresAt;
                state.remainingSeconds = data.remainingSeconds;

                if (state.remainingSeconds <= 0) {
                    handleSessionExpiration();
                    return;
                }

                mountIndicatorIntoWorkspace();
                setProcessingLocation('SERVER');
                if (state.remainingSeconds <= 120) {
                    updateUIState('WARNING');
                } else {
                    updateUIState('ACTIVE');
                }

                if (isInitialSync) {
                    startCountdownTimer();
                    startServerPolling();
                }
            }
        } catch (err) {
            console.warn('[Session] Poll status check failed:', err);
        }
    }

    // Local visual countdown timer (ticks every 1 second)
    function startCountdownTimer() {
        if (state.timerInterval) clearInterval(state.timerInterval);

        state.timerInterval = setInterval(() => {
            if (!navigator.onLine || state.isSimulatedOffline) {
                updateUIState('OFFLINE');
                if (state.expiresAt) {
                    state.remainingSeconds = Math.max(0, Math.floor((state.expiresAt - Date.now()) / 1000));
                    renderClock(state.remainingSeconds);
                }
                return;
            }

            if (!state.expiresAt) return;

            const now = Date.now();
            state.remainingSeconds = Math.max(0, Math.floor((state.expiresAt - now) / 1000));
            renderClock(state.remainingSeconds);

            if (state.remainingSeconds <= 0) {
                handleSessionExpiration();
            } else if (state.remainingSeconds <= 120) {
                if (state.status !== 'WARNING') {
                    updateUIState('WARNING');
                }
                if (!state.warningShown) {
                    state.warningShown = true;
                    showExpiryWarning();
                }
            } else {
                if (state.status !== 'ACTIVE') {
                    updateUIState('ACTIVE');
                }
            }
        }, 1000);
    }

    // Server authority polling (pings backend every 12 seconds)
    function startServerPolling() {
        if (state.pollInterval) clearInterval(state.pollInterval);
        state.pollInterval = setInterval(() => {
            pollServerStatus(false);
        }, 12000);
    }

    // Format seconds into MM:SS
    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function renderClock(seconds) {
        const clockEl = document.getElementById('session-timer-clock');
        if (clockEl) {
            clockEl.textContent = formatTime(seconds);
        }
    }

    // Update UI states for active server sessions
    function updateUIState(newStatus) {
        state.status = newStatus;
        const pill = document.getElementById('session-indicator-pill');
        const dot = document.getElementById('session-dot');
        const label = document.getElementById('session-status-label');
        const noteText = document.getElementById('session-note-text');
        const clockEl = document.getElementById('session-timer-clock');

        if (!pill || !dot || !label || !noteText) return;

        if (state.locationMode !== 'SERVER' && state.locationMode !== 'COMPLETED_SERVER' && state.locationMode !== 'MIXED') {
            return;
        }

        switch (newStatus) {
            case 'ACTIVE':
                pill.className = 'session-indicator-pill active';
                dot.className = 'status-dot active';
                label.textContent = state.locationMode === 'COMPLETED_SERVER' ? 'Temporary Server Processing (Completed)' : 'Temporary Server Processing';
                noteText.innerHTML = 'Your file is temporarily stored on our server for processing. Temporary files are automatically deleted when the session expires. <a href="/privacy-policy#temporary-session-retention" class="session-policy-link">Policy ↗</a>';
                if (clockEl) clockEl.style.color = '';
                break;

            case 'WARNING':
                pill.className = 'session-indicator-pill warning';
                dot.className = 'status-dot warning';
                label.textContent = 'Expiring Soon';
                noteText.innerHTML = '<strong style="color:#d97706;">⚠️ Your temporary session will expire soon. Please download your results before expiration.</strong>';
                if (clockEl) clockEl.style.color = '#c2410c';
                break;

            case 'OFFLINE':
                pill.className = 'session-indicator-pill offline';
                dot.className = 'status-dot offline';
                label.textContent = 'Offline';
                noteText.textContent = 'Internet connection unavailable. Server session status cannot currently be verified.';
                break;

            case 'DELETING':
                pill.className = 'session-indicator-pill deleting';
                dot.className = 'status-dot deleting';
                label.textContent = 'Deleting...';
                noteText.textContent = 'Purging temporary files and session data from server...';
                break;

            case 'EXPIRED':
                pill.className = 'session-indicator-pill expired';
                dot.className = 'status-dot expired';
                label.textContent = 'Expired';
                noteText.textContent = 'Session expired. Files are scheduled for deletion.';
                break;
        }
    }

    function showExpiryWarning() {
        const noteText = document.getElementById('session-note-text');
        if (noteText) {
            noteText.innerHTML = '<strong style="color:#d97706;">⚠️ Your temporary session will expire soon. Please download your results before expiration.</strong>';
        }
    }

    function showIndicator(show) {
        const ind = document.getElementById('monu-session-indicator');
        if (ind) {
            ind.style.display = show ? 'inline-flex' : 'none';
        }
    }

    function hideIndicator() {
        showIndicator(false);
        if (state.timerInterval) clearInterval(state.timerInterval);
        if (state.pollInterval) clearInterval(state.pollInterval);
        state.sessionId = null;
        state.token = null;
        state.expiresAt = null;
        state.status = 'IDLE';
        state.locationMode = 'BROWSER';
    }

    // Handle Session Expiration
    function handleSessionExpiration(reason) {
        if (state.timerInterval) clearInterval(state.timerInterval);
        if (state.pollInterval) clearInterval(state.pollInterval);

        const currentTool = state.toolType;
        clearSessionFromStorage(currentTool);
        setProcessingLocation('EXPIRED');

        // Display Session Expired Modal
        const modal = document.getElementById('session-expired-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        console.log('[Session] Session expired:', reason || 'Time elapsed');
    }

    function closeExpiredModal() {
        const modal = document.getElementById('session-expired-modal');
        if (modal) modal.style.display = 'none';
    }

    function startNewSession() {
        closeExpiredModal();
        startSession(state.toolType || getCurrentToolType());
    }

    // Manual Delete Now Prompts
    function promptDeleteSession() {
        const modal = document.getElementById('session-delete-modal');
        const errEl = document.getElementById('session-delete-error');
        if (errEl) errEl.style.display = 'none';
        if (modal) modal.style.display = 'flex';
    }

    function closeDeleteModal() {
        const modal = document.getElementById('session-delete-modal');
        if (modal) modal.style.display = 'none';
    }

    // Execute Delete Now on backend
    async function executeDeleteSession(simulateFailure = false) {
        if (!state.sessionId || !state.token) {
            closeDeleteModal();
            setProcessingLocation('DELETED');
            return;
        }

        const btn = document.getElementById('btn-confirm-delete');
        const errEl = document.getElementById('session-delete-error');

        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Deleting...';
        }
        updateUIState('DELETING');

        try {
            const res = await fetch('/api/session/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: state.sessionId,
                    token: state.token,
                    simulateFailure: Boolean(simulateFailure)
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Server error');
            }

            const data = await res.json();
            if (data.success) {
                // Backend confirmed deletion of files and metadata
                const toolDeleted = state.toolType;
                clearSessionFromStorage(toolDeleted);
                setProcessingLocation('DELETED');
                closeDeleteModal();
                showToast('Temporary session deleted successfully.');
            } else {
                throw new Error(data.error || 'Deletion failed');
            }
        } catch (err) {
            console.warn('[Session] Manual deletion failed:', err);
            updateUIState(state.remainingSeconds <= 120 ? 'WARNING' : 'ACTIVE');
            if (errEl) {
                errEl.textContent = 'Unable to delete the temporary session. Please try again.';
                errEl.style.display = 'block';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🗑️ Yes, Delete Now';
            }
        }
    }

    function toggleTestPanel() {
        const dd = document.getElementById('session-test-dropdown');
        if (dd) {
            dd.style.display = dd.style.display === 'none' ? 'flex' : 'none';
        }
    }

    // Activity Tracking for Inactivity Timeout (Throttled)
    let lastTouchTime = 0;
    function reportUserActivity() {
        if (!state.sessionId || !state.token) return;
        const now = Date.now();
        if (now - lastTouchTime < 30000) return; // throttle to once every 30s
        lastTouchTime = now;
        fetch('/api/session/touch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.sessionId, token: state.token })
        }).catch(() => {});
    }

    window.addEventListener('click', reportUserActivity, { passive: true });
    window.addEventListener('keydown', reportUserActivity, { passive: true });

    // Online/Offline Event Listeners
    window.addEventListener('online', () => {
        if (state.sessionId) {
            showToast('Connection restored. Revalidating temporary session...');
            pollServerStatus(false);
        }
    });

    window.addEventListener('offline', () => {
        if (state.sessionId) {
            updateUIState('OFFLINE');
        }
    });

    // Auto-initialize on load
    window.addEventListener('DOMContentLoaded', () => {
        initUI();
        const currentTool = getCurrentToolType();
        syncForCurrentTool(currentTool);
    });

    // Expose global interface
    window.MonuSessionManager = {
        setProcessingLocation,
        notifyBackendUpload,
        startSession,
        syncForCurrentTool,
        promptDeleteSession,
        closeDeleteModal,
        executeDeleteSession,
        closeExpiredModal,
        startNewSession,
        toggleTestPanel,
        showToast,
        getCurrentSession: () => ({ ...state })
    };
})();
