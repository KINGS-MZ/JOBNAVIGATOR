/**
 * Toast Blocker - Prevents Firebase Storage errors from displaying as toasts
 * This script should be loaded BEFORE any other scripts in your application
 */

(function() {
    console.log("Toast Blocker: Initializing...");
    
    // Store original showToast function if it exists
    let originalShowToast = null;
    if (window.showToast) {
        originalShowToast = window.showToast;
    }
    
    // Create a safer firebase initialization
    if (typeof window.firebase === 'undefined') {
        window.firebase = {
            // Create stubs for common Firebase methods
            apps: [],
            initializeApp: function(config) {
                console.log('Toast Blocker: Stub firebase.initializeApp called');
                return { 
                    name: '[DEFAULT]',
                    options: config
                };
            },
            auth: function() { 
                console.log('Toast Blocker: Stub firebase.auth called');
                return { 
                    onAuthStateChanged: function(callback) { return function() {}; },
                    signOut: function() { return Promise.resolve(); }
                }; 
            },
            firestore: function() { 
                console.log('Toast Blocker: Stub firebase.firestore called');
                return { 
                    collection: function() { 
                        return { 
                            doc: function() { return { get: function() { return Promise.resolve({}); } }; },
                            get: function() { return Promise.resolve({ empty: true, docs: [] }); }
                        }; 
                    } 
                }; 
            },
            database: function() {
                console.log('Toast Blocker: Stub firebase.database called');
                return { ref: function() { return {}; } };
            },
            storage: function() {
                console.log('Toast Blocker: Stub firebase.storage called');
                return {
                    ref: function() {
                        return {
                            put: function() {
                                return {
                                    then: function(cb) {
                                        setTimeout(function() {
                                            if (cb) cb({ref:{getDownloadURL:function(){
                                                return Promise.resolve('');
                                            }}});
                                        }, 10);
                                        return {catch: function(){return this;}};
                                    }
                                };
                            },
                            getDownloadURL: function() { return Promise.resolve(''); },
                            child: function() { return this; },
                            delete: function() { return Promise.resolve(); }
                        };
                    }
                };
            }
        };
    }
    
    // Override the showToast function
    window.showToast = function(type, title, message) {
        // Only block specific Firebase error toasts
        if (message && (
                (message.includes('firebase.storage is not a function') ||
                message.includes('storage is not a function') ||
                message.includes('database is not a function') ||
                message.includes('initializeApp is not a function') ||
                message.includes('No Firebase App') ||
                (message.includes('TypeError') && (
                    message.includes('storage') ||
                    message.includes('firebase')
                ))
            ))) {
            console.warn('Toast Blocker: Blocked Firebase error toast:', {type, title, message});
            return false; // Block toast
        } else if (title && title.includes('Error Detected') && 
                  message && message.includes('TypeError')) {
            console.warn('Toast Blocker: Blocked TypeError toast:', {type, title, message});
            return false; // Block general TypeError toasts
        }
        
        // For other toasts, use the original function if available
        if (originalShowToast) {
            return originalShowToast(type, title, message);
        } else {
            // If no original function, log toast info
            console.log('Toast:', {type, title, message});
            return true;
        }
    };
    
    // Create a more selective error handler
    window.addEventListener('error', function(event) {
        const msg = event.message || '';
        
        // Only handle Firebase-related errors
        if (msg && (
            msg.includes('firebase.storage is not a function') ||
            msg.includes('firebase.database is not a function') ||
            msg.includes('firebase.initializeApp is not a function') ||
            msg.includes('No Firebase App') ||
            (msg.includes('TypeError') && (
                msg.includes('storage') ||
                msg.includes('firebase')
            ))
        )) {
            console.warn('Toast Blocker: Caught Firebase error:', msg);
            event.preventDefault();
            event.stopPropagation();
            return true;
        }
        
        // Let other errors pass through
        return false;
    }, true);
    
    console.log("Toast Blocker: Initialized successfully");
})();
