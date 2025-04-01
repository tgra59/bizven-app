import { auth, db } from '../config/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

/**
 * Service to handle all authentication-related functionality
 */
class AuthService {
  /**
   * Sign in with Google
   * @returns {Promise} Authentication result
   */
  async signInWithGoogle() {
    console.log('Starting Google Sign In process');
    
    // Create a Google auth provider
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    // Log auth domain for debugging
    console.log('Auth Domain:', auth.config.authDomain);
    
    if (Platform.OS === 'web') {
      try {
        // For simplicity, always use popup for now (more reliable for debugging)
        console.log('Attempting sign in with popup');
        const result = await signInWithPopup(auth, provider);
        console.log('Popup sign-in successful');
        
        const user = result.user;
        await this.saveUserToFirestore(user);
        return result;
      } catch (error) {
        console.error('Google sign-in error:', error);
        
        // If popup is blocked, try redirect as fallback
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
          console.log('Popup blocked or closed, trying redirect instead');
          try {
            await signInWithRedirect(auth, provider);
            return null; // Result will be handled by getRedirectResult
          } catch (redirectError) {
            console.error('Redirect sign-in error:', redirectError);
            throw redirectError;
          }
        }
        
        throw error;
      }
    } else {
      // For React Native, you'd use a library like expo-auth-session
      console.log('Native platform sign-in not yet implemented');
      throw new Error('Native platform sign-in not implemented');
    }
  }
  
  /**
   * Handle redirect result (for web platforms)
   * @returns {Promise} Authentication result
   */
  async handleRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        await this.saveUserToFirestore(result.user);
      }
      return result;
    } catch (error) {
      console.error('Error handling redirect result:', error);
      throw error;
    }
  }

  /**
   * Save user data to Firestore
   * @param {Object} user - The authenticated user object
   * @returns {Promise} Firestore result
   */
  async saveUserToFirestore(user) {
    try {
      // Check if user already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // If new user, create new document and mark as needing profile completion
      if (!userDoc.exists()) {
        console.log('Creating new user in Firestore');
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL,
          createdAt: new Date(),
          projects: [],
          profileCompleted: false, // Flag to indicate profile completion needed
          isNewUser: true
        });
        return true; // Return true to indicate this is a new user
      } else {
        console.log('User exists in Firestore');
        // Update photo URL if needed
        if (!userDoc.data().photoURL && user.photoURL) {
          await updateDoc(userDocRef, {
            photoURL: user.photoURL
          });
        }
        // Return whether profile is completed or not
        return userDoc.data().profileCompleted === false;
      }
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   * @returns {Promise} Sign out result
   */
  async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
  
  /**
   * Get the current authenticated user
   * @returns {Object|null} Current user or null if not authenticated
   */
  getCurrentUser() {
    return auth.currentUser;
  }
  
  /**
   * Check if the user needs to complete their profile
   * @returns {Promise<boolean>} True if profile completion is needed
   */
  async checkProfileCompletionNeeded() {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) return true;
      
      return userDoc.data().profileCompleted === false;
    } catch (error) {
      console.error('Error checking profile completion status:', error);
      return false;
    }
  }
}

export default new AuthService();