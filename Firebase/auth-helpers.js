import { 
  auth, 
  db, 
  doc, 
  setDoc,
  getDoc,
  updateDoc
} from './firebase-config.js';

// Function to ensure a Firestore user document exists for the authenticated user
export async function ensureUserInFirestore(user) {
  if (!user) return null;
  
  try {
    // Check if user document exists
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // User document doesn't exist, create it with complete fields
      const userData = {
        id: user.uid,
        uid: user.uid, // Include both id and uid for compatibility
        name: user.displayName || 'User',
        fullName: user.displayName || 'User',
        email: user.email,
        photoURL: user.photoURL,
        status: 'online',
        lastActive: new Date(),
        createdAt: new Date(),
        // Initialize empty arrays for social connections
        following: [],
        followers: [],
        pendingFollowRequests: [],
        // Additional user profile fields
        bio: '',
        title: '',
        location: '',
        skills: [],
        interests: [],
        // Stats and metrics
        messageCount: 0,
        postCount: 0
      };
      
      // Save user data to Firestore
      await setDoc(userDocRef, userData);
      console.log("Created new user document in Firestore");
      return userData;
    } else {
      // User document exists, ensure fields are up to date
      const userData = userDoc.data();
      let needsUpdate = false;
      const updates = {};
      
      // Check for missing or outdated fields
      // Name fields
      if (!userData.name && user.displayName) {
        updates.name = user.displayName;
        updates.fullName = user.displayName;
        needsUpdate = true;
      }
      
      // Photo URL
      if (!userData.photoURL && user.photoURL) {
        updates.photoURL = user.photoURL;
        needsUpdate = true;
      }
      
      // Make sure arrays exist
      if (!userData.following) {
        updates.following = [];
        needsUpdate = true;
      }
      
      if (!userData.followers) {
        updates.followers = [];
        needsUpdate = true;
      }
      
      if (!userData.pendingFollowRequests) {
        updates.pendingFollowRequests = [];
        needsUpdate = true;
      }
      
      // Add other missing fields
      ['bio', 'title', 'location', 'skills', 'interests', 'messageCount', 'postCount'].forEach(field => {
        if (userData[field] === undefined) {
          updates[field] = field.endsWith('Count') ? 0 : (Array.isArray(userData[field]) ? [] : '');
          needsUpdate = true;
        }
      });
      
      // Update status to online
      if (userData.status !== 'online') {
        updates.status = 'online';
        updates.lastActive = new Date();
        needsUpdate = true;
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        await updateDoc(userDocRef, updates);
        console.log("Updated user document in Firestore");
        return { ...userData, ...updates };
      }
      
      return userData;
    }
  } catch (error) {
    console.error("Error ensuring user in Firestore:", error);
    return null;
  }
}

// Function to set up auth state change listener with Firestore sync
export function setupAuthStateListener(callback) {
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      // User is signed in, ensure they have a Firestore document
      const userData = await ensureUserInFirestore(user);
      
      // Call the callback with both the auth user and Firestore user data
      if (callback) callback(user, userData);
    } else {
      // User is signed out
      if (callback) callback(null, null);
    }
  });
}

// Add event listener to set user offline on page unload
export function setupOfflineStatus() {
  window.addEventListener('beforeunload', async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          status: 'offline',
          lastActive: new Date()
        });
      } catch (error) {
        console.error("Error updating status on page unload:", error);
      }
    }
  });
} 