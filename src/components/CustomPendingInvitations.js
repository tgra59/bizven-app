
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Card, Title, Text, Button, Chip, List, Avatar, Dialog, Portal } from 'react-native-paper';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, serverTimestamp, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const CustomPendingInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch pending invitations for the current user using real-time listener
  useEffect(() => {
    console.log("INVITATIONS: Setting up invitation listener");
    
    let unsubscribeInvitations = null;
    
    const setupInvitationsListener = (user) => {
      if (!user) {
        console.log("INVITATIONS: No authenticated user");
        setInvitations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log(`INVITATIONS: Setting up listener for user ${user.email} (${user.uid})`);
      
      // First check if there are invitations by email
      const emailInvitationsQuery = query(
        collection(db, 'invitations'),
        where('inviteeEmail', '==', user.email),
        where('status', '==', 'pending')
      );
      
      // Set up real-time listener for invitations
      unsubscribeInvitations = onSnapshot(emailInvitationsQuery, 
        (snapshot) => {
          try {
            console.log(`INVITATIONS: Received invitation update, count: ${snapshot.docs.length}`);
            
            // Map the invitations to a more usable format
            const invitationsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            
            console.log("INVITATIONS: Retrieved invitations:", invitationsList.length);
            
            // Sort by creation date (newest first)
            invitationsList.sort((a, b) => b.createdAt - a.createdAt);
            
            setInvitations(invitationsList);
            setLoading(false);
          } catch (err) {
            console.error('INVITATIONS: Error processing invitations:', err);
            setError('Failed to process invitations. Please try again.');
            setLoading(false);
          }
        },
        (error) => {
          console.error('INVITATIONS: Error in invitation listener:', error);
          setError('Failed to load invitations. Please try again.');
          setLoading(false);
        }
      );
    };
    
    // Set up auth state listener
    const unsubscribeAuth = auth.onAuthStateChanged(setupInvitationsListener);
    
    // Cleanup on component unmount
    return () => {
      console.log("INVITATIONS: Cleaning up listeners");
      if (unsubscribeInvitations) unsubscribeInvitations();
      unsubscribeAuth();
    };
  }, []);

  // Simple, direct function to accept invitation
  const handleAcceptInvitation = async () => {
    if (!selectedInvitation) return;
    
    try {
      setProcessingAction(true);
      console.log(`INVITATIONS: Accepting invitation ${selectedInvitation.id}`);
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log(`INVITATIONS: Current user: ${user.email} (${user.uid})`);
      
      // First, update the invitation with the current user ID to claim it
      const invitationRef = doc(db, 'invitations', selectedInvitation.id);
      await updateDoc(invitationRef, {
        inviteeId: user.uid,
        status: 'accepted',
        respondedAt: serverTimestamp()
      });
      
      console.log('INVITATIONS: Updated invitation status to accepted');
      
      // Get the project reference
      const projectRef = doc(db, 'projects', selectedInvitation.projectId);
      
      // Update the project with the new member
      await updateDoc(projectRef, {
        members: arrayUnion(user.uid),
        [`memberRoles.${user.uid}`]: selectedInvitation.role || 'Member',
        updatedAt: serverTimestamp()
      });
      
      console.log('INVITATIONS: Updated project with new member');
      
      // Make sure the user document exists and has the projects array
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      try {
        if (!userSnap.exists()) {
          console.log('INVITATIONS: Creating new user document with project');
          await setDoc(userRef, {
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            projects: [selectedInvitation.projectId]
          });
        } else {
          console.log('INVITATIONS: Updating existing user document with new project');
          // Update the user document with the new project
          await updateDoc(userRef, {
            projects: arrayUnion(selectedInvitation.projectId)
          });
          
          // Verify the update worked
          const updatedUserSnap = await getDoc(userRef);
          const userData = updatedUserSnap.data();
          console.log('INVITATIONS: Updated user projects:', userData.projects);
          
          if (!userData.projects || !userData.projects.includes(selectedInvitation.projectId)) {
            console.log('INVITATIONS: Project not added to user document, trying alternative approach');
            // If the project wasn't added, try a different approach
            const currentProjects = userData.projects || [];
            await updateDoc(userRef, {
              projects: [...currentProjects, selectedInvitation.projectId]
            });
          }
        }
      } catch (userUpdateErr) {
        console.error('INVITATIONS: Error updating user document:', userUpdateErr);
        // Continue with the invitation acceptance even if user update fails
        // We'll try to fix the user-project link later
      }
      
      console.log('INVITATIONS: Updated user with new project');
      
      // Update the local state
      setInvitations(invitations.filter(inv => inv.id !== selectedInvitation.id));
      setDialogVisible(false);
      setSelectedInvitation(null);
      
      // Show success message
      Alert.alert('Success', `You have joined the project "${selectedInvitation.projectName}" as a ${selectedInvitation.role || 'Member'}`, 
      [
        {
          text: "OK",
          onPress: () => {
            // Force a page refresh to show the new project
            console.log("INVITATIONS: Reloading page to show new project");
            window.location.reload();
          }
        }
      ]);
    } catch (err) {
      console.error('INVITATIONS: Error accepting invitation:', err);
      setError('Failed to accept invitation: ' + (err.message || 'Unknown error'));
      Alert.alert('Error', err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Simple, direct function to reject invitation
  const handleRejectInvitation = async () => {
    if (!selectedInvitation) return;
    
    try {
      setProcessingAction(true);
      console.log(`INVITATIONS: Rejecting invitation ${selectedInvitation.id}`);
      
      // Get the invitation details
      const invitationRef = doc(db, 'invitations', selectedInvitation.id);
      
      // Update the invitation status directly
      await updateDoc(invitationRef, {
        status: 'rejected',
        respondedAt: serverTimestamp()
      });
      
      console.log(`INVITATIONS: Successfully rejected invitation ${selectedInvitation.id}`);
      
      // Update the local state
      setInvitations(invitations.filter(inv => inv.id !== selectedInvitation.id));
      setDialogVisible(false);
      setSelectedInvitation(null);
      
      // Show success message
      Alert.alert('Success', 'Invitation rejected');
    } catch (err) {
      console.error('INVITATIONS: Error rejecting invitation:', err);
      setError('Failed to reject invitation. Please try again.');
      Alert.alert('Error', err.message || 'Failed to reject invitation. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={() => {
            setError(null);
            setLoading(true);
            // Force a refresh by triggering auth state change
            const user = auth.currentUser;
            if (user) {
              console.log("INVITATIONS: Manually refreshing invitations");
              // Get invitations by email
              const emailInvitationsQuery = query(
                collection(db, 'invitations'),
                where('inviteeEmail', '==', user.email),
                where('status', '==', 'pending')
              );
              
              getDocs(emailInvitationsQuery).then(snapshot => {
                const invitationsList = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate() || new Date()
                }));
                
                setInvitations(invitationsList);
                setLoading(false);
              }).catch(err => {
                console.error('Error refreshing invitations:', err);
                setError('Failed to refresh invitations. Please try again.');
                setLoading(false);
              });
            } else {
              setLoading(false);
            }
          }}>
            Retry
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show anything if there are no pending invitations
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Pending Invitations</Title>
        
        {invitations.map(invitation => (
          <List.Item
            key={invitation.id}
            title={invitation.projectName}
            description={`Invited by ${invitation.inviterName} on ${invitation.createdAt.toDateString()}`}
            left={props => (
              <Avatar.Icon {...props} icon="account-group" style={styles.avatarIcon} />
            )}
            right={props => (
              <View style={styles.actionButtons}>
                <Button 
                  mode="contained" 
                  onPress={() => {
                    setSelectedInvitation(invitation);
                    setDialogVisible(true);
                  }}
                  style={styles.viewButton}
                >
                  View
                </Button>
              </View>
            )}
            style={styles.listItem}
          />
        ))}
      </Card.Content>
      
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Project Invitation</Dialog.Title>
          <Dialog.Content>
            {selectedInvitation && (
              <>
                <Text style={styles.dialogText}>
                  You've been invited to join the project: 
                </Text>
                <Text style={styles.projectName}>{selectedInvitation.projectName}</Text>
                <Text style={styles.dialogText}>
                  Invited by: {selectedInvitation.inviterName}
                </Text>
                <Chip style={styles.roleChip}>
                  Role: {selectedInvitation.role || 'Member'}
                </Chip>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setDialogVisible(false)} 
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleRejectInvitation} 
              disabled={processingAction}
              color="#FF5252"
            >
              Decline
            </Button>
            <Button 
              onPress={handleAcceptInvitation} 
              disabled={processingAction}
              loading={processingAction}
              mode="contained"
            >
              Accept
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  listItem: {
    paddingLeft: 0,
  },
  avatarIcon: {
    backgroundColor: '#007BFF',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButton: {
    marginLeft: 8,
    borderRadius: 20,
  },
  dialogText: {
    marginBottom: 8,
    fontSize: 16,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});

export default CustomPendingInvitations;
