/**
 * Debug Tool for JobNavigator Application
 * 
 * This script provides debugging and repair functionality for common issues:
 * - Missing notifications for pending follow requests
 * - Broken user relationships (following/followers)
 * - Missing or corrupt user data
 */

// Track authentication state
let debugAuthUser = null;

// Initialize Firebase (should be done by the including page)
// const firebaseConfig = { ... };
// firebase.initializeApp(firebaseConfig);

document.addEventListener('DOMContentLoaded', () => {
    // Setup auth listener
    firebase.auth().onAuthStateChanged((user) => {
        debugAuthUser = user;
        console.log("Debug tool: Auth state changed, user:", user ? user.uid : "none");
        
        // Update UI if we're on the debug page
        if (window.location.pathname.includes('debug.html')) {
            updateDebugUI();
        }
    });
    
    // Check if we're on the debug page
    if (window.location.pathname.includes('debug.html')) {
        initDebugUI();
    }
    
    // Always attach the global debug function
    window.debugJobNavigator = debugJobNavigator;
});

// Initialize debug UI
function initDebugUI() {
    const container = document.getElementById('debug-container');
    if (!container) return;
    
    container.innerHTML = `
        <h1>JobNavigator Debug Tools</h1>
        
        <div class="debug-card">
            <h2>Fix Notifications</h2>
            <p>Repair missing notifications for follow requests and other activities.</p>
            <button id="fix-notifications" class="btn-primary">Fix Notifications</button>
            <div id="notifications-result" class="result-area"></div>
        </div>
        
        <div class="debug-card">
            <h2>Repair User Relationships</h2>
            <p>Fix inconsistencies in following/followers lists.</p>
            <button id="fix-relationships" class="btn-primary">Fix Relationships</button>
            <div id="relationships-result" class="result-area"></div>
        </div>
        
        <div class="debug-card">
            <h2>Validate User Data</h2>
            <p>Check and repair user profile data.</p>
            <button id="validate-user" class="btn-primary">Validate User Data</button>
            <div id="validate-result" class="result-area"></div>
        </div>
        
        <div id="auth-status" class="auth-status">
            Checking authentication status...
        </div>
    `;
    
    updateDebugUI();
}

// Update debug UI based on auth state
function updateDebugUI() {
    const authStatus = document.getElementById('auth-status');
    const fixNotificationsBtn = document.getElementById('fix-notifications');
    const fixRelationshipsBtn = document.getElementById('fix-relationships');
    const validateUserBtn = document.getElementById('validate-user');
    
    if (!authStatus) return;
    
    if (debugAuthUser) {
        authStatus.innerHTML = `
            <div class="auth-success">
                Authenticated as: ${debugAuthUser.email || debugAuthUser.uid}
            </div>
        `;
        
        // Enable buttons
        if (fixNotificationsBtn) fixNotificationsBtn.disabled = false;
        if (fixRelationshipsBtn) fixRelationshipsBtn.disabled = false;
        if (validateUserBtn) validateUserBtn.disabled = false;
        
        // Add event listeners
        if (fixNotificationsBtn && !fixNotificationsBtn.hasListener) {
            fixNotificationsBtn.hasListener = true;
            fixNotificationsBtn.addEventListener('click', async () => {
                const resultArea = document.getElementById('notifications-result');
                resultArea.innerHTML = '<p>Working...</p>';
                
                try {
                    const results = await fixNotifications();
                    resultArea.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
                } catch (error) {
                    resultArea.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            });
        }
        
        if (fixRelationshipsBtn && !fixRelationshipsBtn.hasListener) {
            fixRelationshipsBtn.hasListener = true;
            fixRelationshipsBtn.addEventListener('click', async () => {
                const resultArea = document.getElementById('relationships-result');
                resultArea.innerHTML = '<p>Working...</p>';
                
                try {
                    const results = await fixRelationships();
                    resultArea.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
                } catch (error) {
                    resultArea.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            });
        }
        
        if (validateUserBtn && !validateUserBtn.hasListener) {
            validateUserBtn.hasListener = true;
            validateUserBtn.addEventListener('click', async () => {
                const resultArea = document.getElementById('validate-result');
                resultArea.innerHTML = '<p>Working...</p>';
                
                try {
                    const results = await validateUserData();
                    resultArea.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
                } catch (error) {
                    resultArea.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                }
            });
        }
    } else {
        authStatus.innerHTML = `
            <div class="auth-error">
                Not authenticated. Please sign in first.
            </div>
        `;
        
        // Disable buttons
        if (fixNotificationsBtn) fixNotificationsBtn.disabled = true;
        if (fixRelationshipsBtn) fixRelationshipsBtn.disabled = true;
        if (validateUserBtn) validateUserBtn.disabled = true;
    }
}

// Global debug function that can be called from console
async function debugJobNavigator(action, params = {}) {
    // Wait for authentication if needed
    if (!debugAuthUser) {
        console.log("Debug tool: Waiting for authentication...");
        // Wait up to 5 seconds for authentication
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (debugAuthUser) break;
        }
    }
    
    if (!debugAuthUser) {
        console.error("Debug tool: No user logged in after waiting");
        return { error: "No user logged in", message: "Please login first and try again" };
    }
    
    console.log("Debug tool: Running action", action, "for user", debugAuthUser.uid);
    
    switch (action) {
        case 'fixNotifications':
            return await fixNotifications(params);
        case 'fixRelationships':
            return await fixRelationships(params);
        case 'validateUserData':
            return await validateUserData(params);
        case 'listUsers':
            return await listUsers(params);
        default:
            return { 
                error: "Unknown action", 
                availableActions: [
                    'fixNotifications', 
                    'fixRelationships', 
                    'validateUserData',
                    'listUsers'
                ] 
            };
    }
}

// Fix notifications function
async function fixNotifications(params = {}) {
    if (!debugAuthUser) {
        throw new Error("No user logged in");
    }
    
    const results = {
        fixed: 0,
        errors: 0,
        details: []
    };
    
    // Get all users with pending follow requests to current user
    const usersSnapshot = await firebase.firestore().collection('users').get();
    
    // Check for pending follow requests to me
    const myUserDoc = await firebase.firestore().collection('users').doc(debugAuthUser.uid).get();
    if (myUserDoc.exists) {
        const myData = myUserDoc.data();
        const pendingRequests = myData.pendingFollowRequests || [];
        
        if (pendingRequests.length > 0) {
            for (const senderId of pendingRequests) {
                try {
                    // Check if notification already exists
                    const existingNotifications = await firebase.firestore()
                        .collection('users')
                        .doc(debugAuthUser.uid)
                        .collection('notifications')
                        .where('type', '==', 'follow_request')
                        .where('senderId', '==', senderId)
                        .get();
                    
                    if (existingNotifications.empty) {
                        // Get sender info
                        const senderDoc = await firebase.firestore().collection('users').doc(senderId).get();
                        if (senderDoc.exists) {
                            const senderData = senderDoc.data();
                            const senderName = senderData.name || senderData.fullName || senderData.displayName || 'A user';
                            
                            // Create notification
                            const notificationData = {
                                type: 'follow_request',
                                senderId: senderId,
                                senderName: senderName,
                                senderPhoto: senderData.photoURL || null,
                                title: 'New Follow Request',
                                text: `${senderName} wants to follow you`,
                                actions: ['accept', 'reject'],
                                read: false,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp()
                            };
                            
                            await firebase.firestore()
                                .collection('users')
                                .doc(debugAuthUser.uid)
                                .collection('notifications')
                                .add(notificationData);
                            
                            results.fixed++;
                            results.details.push({
                                action: 'created',
                                type: 'inbound_follow_request',
                                sender: senderId,
                                senderName: senderName
                            });
                        }
                    }
                } catch (error) {
                    results.errors++;
                    results.details.push({
                        error: error.message,
                        senderId: senderId
                    });
                }
            }
        }
    }
    
    return results;
}

// Fix relationships function
async function fixRelationships(params = {}) {
    // Implementation will go here
    return { status: "Not implemented yet" };
}

// Validate user data function
async function validateUserData(params = {}) {
    // Implementation will go here
    return { status: "Not implemented yet" };
}

// List users function
async function listUsers(params = {}) {
    // Implementation will go here
    return { status: "Not implemented yet" };
}

// Expose debug functions globally
window.debugJobNavigator = debugJobNavigator; 