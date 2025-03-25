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
    
    console.log(`PROJECTS: Getting projects for user: ${user.uid}, email: ${user.email}`);
    
    // First approach: query projects where user is a member
    const projectsQuery = query(
      collection(db, 'projects'),
      where('members', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(projectsQuery);
    console.log(`PROJECTS: Found ${querySnapshot.docs.length} projects by membership`);
    
    const projectsById = {};
    
    // Add projects to the map
    querySnapshot.docs.forEach(doc => {
      projectsById[doc.id] = {
        id: doc.id,
        ...doc.data()
      };
    });
    
    // Second approach: query invitations where user email matched
    console.log(`PROJECTS: Checking for invitations with user email: ${user.email}`);
    const acceptedInvitationsQuery = query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', user.email),
      where('status', '==', 'accepted')
    );
    
    const acceptedInvitationsSnapshot = await getDocs(acceptedInvitationsQuery);
    console.log(`PROJECTS: Found ${acceptedInvitationsSnapshot.docs.length} accepted invitations`);
    
    // For each accepted invitation, fetch the project
    for (const inviteDoc of acceptedInvitationsSnapshot.docs) {
      const invite = inviteDoc.data();
      const projectId = invite.projectId;
      
      // Skip if we already have this project
      if (projectsById[projectId]) continue;
      
      try {
        console.log(`PROJECTS: Fetching project ${projectId} from invitation`);
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          
          // Add project to the map
          projectsById[projectId] = {
            id: projectId,
            ...projectData
          };
          
          // Check if user is in the members array
          if (!projectData.members || !projectData.members.includes(user.uid)) {
            console.log(`PROJECTS: Adding user to project members for ${projectId}`);
            
            // Update the project to include this user
            await updateDoc(doc(db, 'projects', projectId), {
              members: arrayUnion(user.uid),
              [`memberRoles.${user.uid}`]: invite.role || 'Member',
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.error(`PROJECTS: Error fetching project ${projectId} from invitation:`, err);
      }
    }
    
    // Third approach: check user document for projects array
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().projects && Array.isArray(userDoc.data().projects)) {
      const userProjects = userDoc.data().projects;
      console.log(`PROJECTS: Found ${userProjects.length} projects in user document`);
      
      // Load any projects that weren't found by the first query
      for (const projectId of userProjects) {
        if (!projectsById[projectId]) {
          try {
            console.log(`PROJECTS: Fetching project ${projectId} from user document`);
            const projectDoc = await getDoc(doc(db, 'projects', projectId));
            
            if (projectDoc.exists()) {
              projectsById[projectId] = {
                id: projectId,
                ...projectDoc.data()
              };
              
              // Update the project to include this user if they weren't in members
              if (!projectDoc.data().members || !projectDoc.data().members.includes(user.uid)) {
                console.log(`PROJECTS: Adding user to project members for ${projectId}`);
                await updateDoc(doc(db, 'projects', projectId), {
                  members: arrayUnion(user.uid)
                });
              }
            }
          } catch (err) {
            console.error(`PROJECTS: Error fetching project ${projectId} from user document:`, err);
          }
        }
      }
    } else {
      // Create projects array if it doesn't exist
      console.log('PROJECTS: Creating projects array in user document');
      await updateDoc(userRef, {
        projects: [],
        updatedAt: serverTimestamp()
      }).catch(err => {
        console.log('PROJECTS: Error creating projects array:', err);
      });
    }
    
    // Convert the map to an array
    const projects = Object.values(projectsById);
    console.log(`PROJECTS: Returning ${projects.length} total projects`);
    
    return projects;
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
export const inviteUserToProject = async (projectId, userEmail, role = 'Member') => {
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
    if (projectData.ownerId !== user.uid && projectData.memberRoles?.[user.uid] !== 'admin') {
      throw new Error('You do not have permission to invite users');
    }
    
    // Find the user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', userEmail)
    );
    
    const userSnapshot = await getDocs(usersQuery);
    
    let invitedUser, invitedUserId;
    
    if (userSnapshot.empty) {
      // No existing user with this email, create a placeholder document in pendingUsers collection
      console.log('User not found, creating placeholder for:', userEmail);
      
      // Generate a unique ID for the pending user
      invitedUserId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a document in pendingUsers collection
      const pendingUserRef = doc(db, 'pendingUsers', invitedUserId);
      await setDoc(pendingUserRef, {
        email: userEmail,
        createdAt: serverTimestamp(),
        invitedBy: user.uid
      });
      
      console.log('Created pending user document with ID:', invitedUserId);
    } else {
      invitedUser = userSnapshot.docs[0];
      invitedUserId = invitedUser.id;
      
      // Check if user is already a member
      if (projectData.members && projectData.members.includes(invitedUserId)) {
        throw new Error('User is already a member of this project');
      }
    }
    
    // Check if there's already a pending invitation
    const existingInvitations = query(
      collection(db, 'invitations'),
      where('projectId', '==', projectId),
      where('inviteeEmail', '==', userEmail),
      where('status', '==', 'pending')
    );
    
    const existingInviteSnapshot = await getDocs(existingInvitations);
    
    if (!existingInviteSnapshot.empty) {
      throw new Error('This user already has a pending invitation to this project');
    }
    
    // Create invitation in the invitations collection
    const invitationRef = await addDoc(collection(db, 'invitations'), {
      projectId,
      projectName: projectData.name,
      inviterId: user.uid,
      inviterName: user.displayName || 'A user',
      inviteeId: invitedUserId,
      inviteeEmail: userEmail,
      role: role,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    console.log('Created invitation with ID:', invitationRef.id);
    
    // Also update the project with a record of this invitation
    await updateDoc(projectRef, {
      pendingInvitations: arrayUnion({
        invitationId: invitationRef.id,
        email: userEmail,
        role: role,
        createdAt: Timestamp.now()
      }),
      updatedAt: serverTimestamp()
    });
    
    return { 
      success: true, 
      message: 'Invitation sent successfully',
      invitationId: invitationRef.id
    };
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
    
    // Get the role from the invitation, or use 'Member' as default
    const role = invitation.role || 'Member';
    
    // Update the project with the new member
    const projectRef = doc(db, 'projects', invitation.projectId);
    await updateDoc(projectRef, {
      members: arrayUnion(user.uid),
      [`memberRoles.${user.uid}`]: role,
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
