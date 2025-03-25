import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Get all projects for the current user
export const getUserProjects = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const projectsQuery = query(
      collection(db, 'projects'),
      where('members', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(projectsQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user projects:", error);
    throw error;
  }
};

// Get a single project by ID
export const getProject = async (projectId) => {
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Project not found');
    }
  } catch (error) {
    console.error("Error getting project:", error);
    throw error;
  }
};

// Create a new project
export const createProject = async (projectData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const newProject = {
      ...projectData,
      ownerId: user.uid,
      members: [user.uid],
      memberRoles: {
        [user.uid]: 'owner'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'projects'), newProject);
    
    // Also update the user document with this project
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      projects: arrayUnion(docRef.id)
    });
    
    return { id: docRef.id, ...newProject };
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

// Invite a user to a project
export const inviteUserToProject = async (projectId, userEmail) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // First, get the project to check permissions
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectSnap.data();
    if (projectData.ownerId !== user.uid && projectData.memberRoles[user.uid] !== 'admin') {
      throw new Error('You do not have permission to invite users');
    }
    
    // Find the user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', userEmail)
    );
    
    const userSnapshot = await getDocs(usersQuery);
    
    if (userSnapshot.empty) {
      throw new Error('User not found with that email');
    }
    
    const invitedUser = userSnapshot.docs[0];
    const invitedUserId = invitedUser.id;
    
    // Check if user is already a member
    if (projectData.members.includes(invitedUserId)) {
      throw new Error('User is already a member of this project');
    }
    
    // Create invitation in the invitations collection
    await addDoc(collection(db, 'invitations'), {
      projectId,
      projectName: projectData.name,
      inviterId: user.uid,
      inviterName: user.displayName || 'A user',
      inviteeId: invitedUserId,
      inviteeEmail: userEmail,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    return { success: true, message: 'Invitation sent successfully' };
  } catch (error) {
    console.error("Error inviting user:", error);
    throw error;
  }
};

// Accept an invitation to a project
export const acceptProjectInvitation = async (invitationId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // Get the invitation
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    
    if (!invitationSnap.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = invitationSnap.data();
    
    if (invitation.inviteeId !== user.uid) {
      throw new Error('This invitation is not for you');
    }
    
    if (invitation.status !== 'pending') {
      throw new Error('This invitation has already been processed');
    }
    
    // Update the project with the new member
    const projectRef = doc(db, 'projects', invitation.projectId);
    await updateDoc(projectRef, {
      members: arrayUnion(user.uid),
      [`memberRoles.${user.uid}`]: 'member',
      updatedAt: serverTimestamp()
    });
    
    // Update the user with the new project
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      projects: arrayUnion(invitation.projectId)
    });
    
    // Update the invitation status
    await updateDoc(invitationRef, {
      status: 'accepted',
      respondedAt: serverTimestamp()
    });
    
    return { success: true, message: 'Invitation accepted' };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw error;
  }
};

// Get all project members with activity data
export const getProjectMembersActivity = async (projectId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // First, get the project to check permissions
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectSnap.data();
    
    // Check if user is a member of the project
    if (!projectData.members.includes(user.uid)) {
      throw new Error('You do not have access to this project');
    }
    
    // Get all time sessions for this project
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('projectId', '==', projectId)
    );
    
    const sessionsSnapshot = await getDocs(sessionsQuery);
    
    // Group sessions by user and calculate total time
    const userActivity = {};
    
    sessionsSnapshot.forEach(doc => {
      const session = doc.data();
      const userId = session.userId;
      
      if (!userActivity[userId]) {
        userActivity[userId] = {
          userId,
          totalTimeSeconds: 0,
          sessionCount: 0
        };
      }
      
      // Parse duration string (HH:MM:SS) and convert to seconds
      const durationParts = session.duration.split(':').map(Number);
      const durationSeconds = (durationParts[0] * 3600) + (durationParts[1] * 60) + durationParts[2];
      
      userActivity[userId].totalTimeSeconds += durationSeconds;
      userActivity[userId].sessionCount += 1;
    });
    
    // Now get user details for each user ID
    const userDetails = await Promise.all(
      Object.keys(userActivity).map(async (userId) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          return {
            ...userActivity[userId],
            displayName: userData.displayName || 'Unknown User',
            email: userData.email,
            photoURL: userData.photoURL,
            role: projectData.memberRoles[userId] || 'member'
          };
        }
        
        return userActivity[userId];
      })
    );
    
    // Sort by total time (most active first)
    return userDetails.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);
  } catch (error) {
    console.error("Error getting member activity:", error);
    throw error;
  }
};

// Update user's preferred project for dashboard
export const updateUserDashboardProject = async (projectId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      dashboardProjectId: projectId,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating dashboard project:", error);
    throw error;
  }
};

// Get user's dashboard preferences
export const getUserDashboardPreferences = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User data not found');
    }
    
    const userData = userSnap.data();
    return {
      dashboardProjectId: userData.dashboardProjectId || null
    };
  } catch (error) {
    console.error("Error getting dashboard preferences:", error);
    throw error;
  }
};
