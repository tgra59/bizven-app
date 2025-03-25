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
    // Create a Google auth provider
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    if (Platform.OS === 'web') {
      const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        typeof navigator !== 'undefined' ? navigator.userAgent : ''
      );
      
      if (isMobileBrowser) {
        // For mobile browsers, use redirect because popups are often blocked
        try {
          await signInWithRedirect(auth, provider);
          // The result will be handled in the getRedirectResult
          return null;
        } catch (error) {
          console.error('Redirect sign-in error:', error);
          throw error;
        }
      } else {
        // For desktop browsers, popups work better
        try {
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          await this.saveUserToFirestore(user);
          return result;
        } catch (error) {
          console.error('Popup sign-in error:', error);
          throw error;
        }
      }
    } else {
      // For React Native, you'd use a library like expo-auth-session
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
      
      // If new user, create new document
      if (!userDoc.exists()) {
        console.log('Creating new user in Firestore');
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL,
          createdAt: new Date(),
          projects: []
        });
      } else {
        console.log('User exists in Firestore');
        // Update photo URL if needed
        if (!userDoc.data().photoURL && user.photoURL) {
          await updateDoc(userDocRef, {
            photoURL: user.photoURL
          });
        }
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
}

export default new AuthService();