import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput as RNTextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  Title,
  Subheading,
  Button,
  Card,
  Chip,
  Divider,
  Avatar,
  List,
  TextInput,
  Menu,
  IconButton
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { 
  getUserProjects, 
  createProject, 
  inviteUserToProject,
  getProjectMembersActivity 
} from '../services/projects';
import PendingInvitations from '../components/PendingInvitations';

const ProfileScreen = ({ navigation }) => {
  // User state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Projects state
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Team state
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Modal states
  const [createProjectModalVisible, setCreateProjectModalVisible] = useState(false);
  const [inviteTeamModalVisible, setInviteTeamModalVisible] = useState(false);
  
  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUser({
              id: currentUser.uid,
              ...userDoc.data(),
              createdAt: userDoc.data().createdAt?.toDate() || new Date(),
            });
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Simple direct Firestore query for projects - called on component mount and user state changes
  useEffect(() => {
    // Define function to fetch projects directly
    const fetchProjectsDirectly = async () => {
      console.log('DIRECT FETCH: Starting direct project fetch');
      
      // Ensure user is authenticated
      if (!auth.currentUser) {
        console.error('DIRECT FETCH: No authenticated user');
        return;
      }
      
      try {
        console.log(`DIRECT FETCH: Getting projects for user ${auth.currentUser.uid}`);
        
        // Create direct query against Firestore
        const projectsCollection = collection(db, 'projects');
        const projectsFilter = where('members', 'array-contains', auth.currentUser.uid);
        const projectsOrder = orderBy('createdAt', 'desc');
        const projectsQuery = query(projectsCollection, projectsFilter, projectsOrder);
        
        // Execute query
        console.log('DIRECT FETCH: Executing Firestore query');
        const querySnapshot = await getDocs(projectsQuery);
        console.log(`DIRECT FETCH: Found ${querySnapshot.docs.length} projects`);
        
        // Process results
        if (querySnapshot.empty) {
          console.log('DIRECT FETCH: No projects found for user');
          setProjects([]);
          setSelectedProject(null);
          return;
        }
        
        // Map document data to projects array
        const fetchedProjects = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          };
        });
        
        console.log('DIRECT FETCH: Mapped project data:', fetchedProjects.map(p => p.name));
        
        // Update state with fetched projects
        setProjects(fetchedProjects);
        
        // Set selected project if needed
        if (fetchedProjects.length > 0) {
          // If no project is currently selected, select the first one
          if (!selectedProject) {
            console.log('DIRECT FETCH: No project selected, selecting first one:', fetchedProjects[0].name);
            setSelectedProject(fetchedProjects[0]);
          } else {
            // If project is selected, ensure it exists in the fetched list
            const currentProject = fetchedProjects.find(p => p.id === selectedProject.id);
            if (currentProject) {
              console.log('DIRECT FETCH: Keeping current selection:', currentProject.name);
              setSelectedProject(currentProject); // Update with fresh data
            } else {
              console.log('DIRECT FETCH: Current selection not found, selecting first project');
              setSelectedProject(fetchedProjects[0]);
            }
          }
        }
      } catch (error) {
        console.error('DIRECT FETCH: Error fetching projects:', error);
        Alert.alert('Error', 'Failed to load projects. Please try again.');
      }
    };
    
    // Run the fetch function immediately
    fetchProjectsDirectly();
    
    // Set up interval to refresh projects
    const refreshInterval = setInterval(fetchProjectsDirectly, 5000); // Check every 5 seconds
    
    // Set up auth state change listener
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      if (user) fetchProjectsDirectly();
    });
    
    // Clean up on unmount
    return () => {
      clearInterval(refreshInterval);
      unsubscribeAuth();
    };
  }, []);
  
  // Simple save of selected project ID
  useEffect(() => {
    if (selectedProject && auth.currentUser) {
      console.log('Project selected:', selectedProject.name, selectedProject.id);
      
      // Save to local storage as backup
      try {
        AsyncStorage.setItem('selectedProjectId', selectedProject.id);
      } catch (e) {
        console.error('Error saving to AsyncStorage:', e);
      }
      
      // Save to Firestore
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        updateDoc(userRef, {
          dashboardProjectId: selectedProject.id,
          lastActive: serverTimestamp()
        }).then(() => {
          console.log('Saved project selection to Firestore');
        }).catch(err => {
          console.error('Error updating user doc:', err);
        });
      } catch (error) {
        console.error('Error in project selection save:', error);
      }
    }
  }, [selectedProject]);
  
  // Fetch team members when selected project changes using direct Firestore queries
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedProject) return;
      
      try {
        console.log(`TEAM: Fetching team members for project ${selectedProject.id}`);
        
        // 1. First get the project document to get current members
        const projectRef = doc(db, 'projects', selectedProject.id);
        const projectSnap = await getDoc(projectRef);
        
        if (!projectSnap.exists()) {
          console.error('TEAM: Project not found');
          return;
        }
        
        const projectData = projectSnap.data();
        const memberIds = projectData.members || [];
        console.log(`TEAM: Project has ${memberIds.length} members`);
        
        // 2. Fetch user data for each member
        const memberPromises = memberIds.map(async (userId) => {
          try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              return {
                id: userId,
                name: userData.displayName || 'Unknown User',
                email: userData.email || 'No Email',
                role: projectData.memberRoles?.[userId] || 'Member',
                photoURL: userData.photoURL,
                pending: false
              };
            }
            
            return {
              id: userId,
              name: 'Unknown User',
              email: 'No Email',
              role: projectData.memberRoles?.[userId] || 'Member',
              photoURL: null,
              pending: false
            };
          } catch (err) {
            console.error(`TEAM: Error fetching user data for ${userId}:`, err);
            return null;
          }
        });
        
        // 3. Fetch pending invitations for this project
        const invitationsQuery = query(
          collection(db, 'invitations'),
          where('projectId', '==', selectedProject.id),
          where('status', '==', 'pending')
        );
        
        const invitationsSnap = await getDocs(invitationsQuery);
        console.log(`TEAM: Project has ${invitationsSnap.docs.length} pending invitations`);
        
        // 4. Transform invitation data to team member format
        const pendingMembers = invitationsSnap.docs.map(doc => {
          const inviteData = doc.data();
          return {
            id: doc.id, // Use invitation ID
            name: inviteData.inviteeEmail.split('@')[0], // Use email username as name
            email: inviteData.inviteeEmail,
            role: inviteData.role || 'Member',
            photoURL: null,
            pending: true
          };
        });
        
        // 5. Combine active members and pending invitations
        const activeMembers = (await Promise.all(memberPromises)).filter(Boolean);
        const allMembers = [...activeMembers, ...pendingMembers];
        
        console.log(`TEAM: Total team members (including pending): ${allMembers.length}`);
        setTeamMembers(allMembers);
      } catch (error) {
        console.error('TEAM: Error fetching team members:', error);
      }
    };
    
    fetchTeamMembers();
    
    // Set up a listener for real-time updates to invitations
    if (selectedProject) {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('projectId', '==', selectedProject.id)
      );
      
      const unsubscribeInvitations = onSnapshot(invitationsQuery, () => {
        console.log("TEAM: Invitation changes detected, refreshing team members");
        fetchTeamMembers();
      });
      
      return () => unsubscribeInvitations();
    }
  }, [selectedProject]);
  
  // Handle creating a new project using the projects service
  const handleCreateProject = async () => {
    if (!newProjectName) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the createProject service
      const newProject = await createProject({
        name: newProjectName,
        description: newProjectDescription,
      });
      
      setProjects([...projects, newProject]);
      setSelectedProject(newProject);
      setCreateProjectModalVisible(false);
      setNewProjectName('');
      setNewProjectDescription('');
      
      setLoading(false);
    } catch (error) {
      console.error('Error creating project:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    }
  };
  
  // Handle inviting a team member using direct Firestore operations
  const handleInviteTeamMember = async () => {
    if (!inviteEmail) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }
    
    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project first');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    // Check if a role is selected
    if (!inviteRole) {
      Alert.alert('Error', 'Please select a role for the team member');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`INVITE: Starting invitation for ${inviteEmail} with role ${inviteRole} to project ${selectedProject.id}`);
      
      // Get current project data
      const projectRef = doc(db, 'projects', selectedProject.id);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        throw new Error('Project not found');
      }
      
      const projectData = projectSnap.data();
      
      // Check if current user has permission to invite
      const user = auth.currentUser;
      const isOwner = projectData.ownerId === user.uid;
      const isAdmin = projectData.memberRoles?.[user.uid] === 'admin';
      
      if (!isOwner && !isAdmin) {
        throw new Error('You do not have permission to invite users');
      }
      
      // Look for user by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', inviteEmail)
      );
      
      const userSnapshot = await getDocs(usersQuery);
      
      let invitedUserId;
      
      if (userSnapshot.empty) {
        // No existing user with this email, create a placeholder
        console.log('INVITE: User not found, creating placeholder for:', inviteEmail);
        
        // Generate a unique ID for the pending user
        invitedUserId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Create a document in pendingUsers collection
        const pendingUserRef = doc(db, 'pendingUsers', invitedUserId);
        await setDoc(pendingUserRef, {
          email: inviteEmail,
          createdAt: serverTimestamp(),
          invitedBy: user.uid
        });
        
        console.log('INVITE: Created pending user document with ID:', invitedUserId);
      } else {
        // Found existing user
        const invitedUser = userSnapshot.docs[0];
        invitedUserId = invitedUser.id;
        
        // Check if user is already a member
        if (projectData.members && projectData.members.includes(invitedUserId)) {
          throw new Error('User is already a member of this project');
        }
      }
      
      // Check for existing pending invitations
      const existingInvitations = query(
        collection(db, 'invitations'),
        where('projectId', '==', selectedProject.id),
        where('inviteeEmail', '==', inviteEmail),
        where('status', '==', 'pending')
      );
      
      const existingInviteSnapshot = await getDocs(existingInvitations);
      
      if (!existingInviteSnapshot.empty) {
        console.log('INVITE: Found existing invitation, offering to resend');
        
        // User already has invitation, offer options instead of throwing error
        return new Promise((resolve, reject) => {
          Alert.alert(
            'Invitation Exists',
            `${inviteEmail} already has a pending invitation to this project.`,
            [
              {
                text: 'Close',
                style: 'cancel',
                onPress: () => {
                  // Close the invite modal
                  setInviteTeamModalVisible(false);
                  reject(new Error('Invitation already exists'));
                }
              }
            ]
          );
        });
      }
      
      // Create invitation document
      const invitationData = {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        inviterId: user.uid,
        inviterName: user.displayName || 'A user',
        inviteeId: invitedUserId,
        inviteeEmail: inviteEmail,
        role: inviteRole,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      console.log('INVITE: Creating invitation with data:', JSON.stringify(invitationData));
      
      const invitationRef = await addDoc(collection(db, 'invitations'), invitationData);
      
      console.log('INVITE: Created invitation with ID:', invitationRef.id);
      
      // Update project with invitation record
      await updateDoc(projectRef, {
        pendingInvitations: arrayUnion({
          invitationId: invitationRef.id,
          email: inviteEmail,
          role: inviteRole,
          createdAt: new Date() // Use client-side date for immediate display
        }),
        updatedAt: serverTimestamp()
      });
      
      // Verify the invitation was created by fetching it back
      const verifyInvitation = await getDoc(invitationRef);
      if (verifyInvitation.exists()) {
        console.log('INVITE: Verified invitation exists:', verifyInvitation.data());
      } else {
        console.error('INVITE: Failed to verify invitation creation!');
        Alert.alert('Warning', 'Invitation may not have been saved correctly.');
      }
      
      console.log('INVITE: Updated project with invitation record');
      
      // Add to local state for immediate UI update
      const newTeamMember = {
        id: `team-${Date.now()}`,
        name: inviteEmail.split('@')[0], // Just for display until they accept
        email: inviteEmail,
        role: inviteRole,
        photoURL: null,
        pending: true,
      };
      
      setTeamMembers([...teamMembers, newTeamMember]);
      
      // Reset and close the modal
      setInviteEmail('');
      setInviteRole('Member');
      setInviteTeamModalVisible(false);
      
      Alert.alert('Success', `Invitation sent to ${inviteEmail} with role: ${inviteRole}`);
    } catch (error) {
      console.error('INVITE: Error inviting team member:', error);
      Alert.alert('Error', error.message || 'Failed to send invitation. Please try again.');
      // Don't close the modal if there's an error, so user can try again
    } finally {
      setLoading(false);
    }
  };
  
  // Handle log out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigation will be handled by the onAuthStateChanged listener in App.js
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Pending Invitations Section (will only show if there are any) */}
        <PendingInvitations />
        
        {/* User Info Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <Title>{user?.displayName || 'User'}</Title>
                <Subheading>{user?.email || 'email@example.com'}</Subheading>
              </View>
              
              <Avatar.Image
                size={80}
                source={user?.photoURL ? { uri: user.photoURL } : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=random` }}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.userDetails}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="phone" size={20} color="#777" />
                <Text style={styles.detailText}>{user?.phoneNumber || 'No phone number'}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar" size={20} color="#777" />
                <Text style={styles.detailText}>
                  Account created on {user?.createdAt.toDateString() || 'Unknown date'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Projects Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title>My Projects</Title>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => setCreateProjectModalVisible(true)}
                style={styles.addButton}
              >
                New Project
              </Button>
            </View>
            
            {projects.length === 0 ? (
              <Text style={styles.emptyText}>No projects yet. Create one to get started!</Text>
            ) : (
              <View style={styles.projectsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      onPress={() => setSelectedProject(project)}
                      style={[
                        styles.projectCard,
                        selectedProject?.id === project.id && styles.selectedProjectCard,
                      ]}
                    >
                      <Text style={styles.projectTitle}>{project.name}</Text>
                      <Chip style={styles.roleChip}>{project.role || 'Creator'}</Chip>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {selectedProject && (
                  <View style={styles.projectDetails}>
                    <Title>{selectedProject.name}</Title>
                    <Text>{selectedProject.description || 'No description'}</Text>
                    
                    <View style={styles.projectStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {selectedProject.progress ? `${Math.round(selectedProject.progress * 100)}%` : '0%'}
                        </Text>
                        <Text style={styles.statLabel}>Progress</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {selectedProject.timeSpent || '0h'}
                        </Text>
                        <Text style={styles.statLabel}>Time Spent</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {teamMembers.length}
                        </Text>
                        <Text style={styles.statLabel}>Team Size</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Team Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title>Team</Title>
              {selectedProject && (
                <Button
                  mode="contained"
                  icon="account-plus"
                  onPress={() => setInviteTeamModalVisible(true)}
                  style={styles.addButton}
                >
                  Invite
                </Button>
              )}
            </View>
            
            {!selectedProject ? (
              <Text style={styles.emptyText}>Select a project to see team members</Text>
            ) : teamMembers.length === 0 ? (
              <Text style={styles.emptyText}>No team members yet. Invite someone to collaborate!</Text>
            ) : (
              <View>
                {teamMembers.map((member) => (
                  <List.Item
                    key={member.id}
                    title={member.name}
                    description={member.email}
                    left={() => (
                      <Avatar.Image
                        size={40}
                        source={member.photoURL ? { uri: member.photoURL } : require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}
                      />
                    )}
                    right={() => (
                      <View style={styles.memberRole}>
                        <Chip mode="outlined">{member.role}</Chip>
                        {member.pending && <Chip mode="outlined" style={styles.pendingChip}>Pending</Chip>}
                      </View>
                    )}
                  />
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Logout Button */}
        <Button
          mode="outlined"
          icon="logout"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Log Out
        </Button>
      </ScrollView>
      
      {/* Create Project Modal */}
      <Modal
        visible={createProjectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateProjectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title style={styles.modalTitle}>Create New Project</Title>
            
            <TextInput
              label="Project Name"
              value={newProjectName}
              onChangeText={setNewProjectName}
              style={styles.input}
              mode="outlined"
            />
            
            <TextInput
              label="Description (Optional)"
              value={newProjectDescription}
              onChangeText={setNewProjectDescription}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setCreateProjectModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                onPress={handleCreateProject}
                style={styles.modalButton}
                loading={loading}
              >
                Create
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Invite Team Modal */}
      <Modal
        visible={inviteTeamModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteTeamModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Title style={styles.modalTitle}>Invite Team Member</Title>
            
            <TextInput
              label="Email"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.roleSelector}>
              <Text style={styles.roleLabel}>Role:</Text>
              
              {/* Replace Menu with a simple dropdown for better compatibility */}
              <View style={styles.roleDropdown}>
                <Button
                  mode="outlined"
                  onPress={() => setInviteRole('Admin')}
                  style={[styles.roleOption, inviteRole === 'Admin' && styles.selectedRole]}
                >
                  Admin
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setInviteRole('Member')}
                  style={[styles.roleOption, inviteRole === 'Member' && styles.selectedRole]}
                >
                  Member
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setInviteRole('Viewer')}
                  style={[styles.roleOption, inviteRole === 'Viewer' && styles.selectedRole]}
                >
                  Viewer
                </Button>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setInviteTeamModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                onPress={handleInviteTeamMember}
                style={styles.modalButton}
                loading={loading}
              >
                Invite
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  divider: {
    marginVertical: 12,
  },
  userDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#555',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 20,
  },
  projectsContainer: {
    marginTop: 8,
  },
  projectCard: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 12,
    minWidth: 150,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedProjectCard: {
    backgroundColor: '#e6f2ff',
    borderColor: '#007BFF',
    borderWidth: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roleChip: {
    alignSelf: 'flex-start',
  },
  projectDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  projectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingChip: {
    marginLeft: 8,
    backgroundColor: '#FFE0B2',
  },
  logoutButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleLabel: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roleOption: {
    flex: 1,
    marginHorizontal: 4,
  },
  selectedRole: {
    backgroundColor: '#e6f2ff',
    borderColor: '#007BFF',
    borderWidth: 1,
  },
});

export default ProfileScreen;
