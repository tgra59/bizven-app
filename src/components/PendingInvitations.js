import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Card, Title, Text, Button, Chip, List, Avatar, Dialog, Portal } from 'react-native-paper';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp, onSnapshot, writeBatch, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const PendingInvitations = () => {
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

  // Handle accepting an invitation with direct Firestore operations
  const handleAcceptInvitation = async () => {
    if (!selectedInvitation) return;
    
    try {
      setProcessingAction(true);
      console.log(`INVITATIONS: Accepting invitation ${selectedInvitation.id}`);
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get the invitation details
      const invitationRef = doc(db, 'invitations', selectedInvitation.id);
      const invitationSnap = await getDoc(invitationRef);
      
      if (!invitationSnap.exists()) {
        throw new Error('Invitation not found');
      }
      
      const invitation = invitationSnap.data();
      
      // Get the project
      const projectRef = doc(db, 'projects', invitation.projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        throw new Error('Project not found');
      }
      
      // Get the role from the invitation
      const role = invitation.role || 'Member';
      
      // Batch write to ensure atomic updates
      const batch = writeBatch(db);
      
      // Update the project with the new member
      batch.update(projectRef, {
        members: arrayUnion(user.uid),
        [`memberRoles.${user.uid}`]: role,
        updatedAt: serverTimestamp()
      });
      
      // Update the user document
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        projects: arrayUnion(invitation.projectId)
      });
      
      // Update the invitation status
      batch.update(invitationRef, {
        status: 'accepted',
        respondedAt: serverTimestamp()
      });
      
      // Commit the batch
      await batch.commit();
      
      console.log(`INVITATIONS: Successfully accepted invitation ${selectedInvitation.id}`);
      
      // Update the local state
      setInvitations(invitations.filter(inv => inv.id !== selectedInvitation.id));
      setDialogVisible(false);
      setSelectedInvitation(null);
      
      // Show success message
      Alert.alert('Success', `You have joined the project "${invitation.projectName}" as a ${role}`);
    } catch (err) {
      console.error('INVITATIONS: Error accepting invitation:', err);
      setError('Failed to accept invitation. Please try again.');
      Alert.alert('Error', err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle rejecting an invitation with direct Firestore operations
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
            // Fetch invitations again
            const fetchInvitations = async () => {
              try {
                const user = auth.currentUser;
                if (!user) return;
                
                // Query the invitations collection
                const invitationsQuery = query(
                  collection(db, 'invitations'),
                  where('inviteeId', '==', user.uid),
                  where('status', '==', 'pending')
                );
                
                const querySnapshot = await getDocs(invitationsQuery);
                
                const invitationsList = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate() || new Date()
                }));
                
                setInvitations(invitationsList);
                setLoading(false);
              } catch (err) {
                console.error('Error fetching invitations:', err);
                setError('Failed to load invitations. Please try again.');
                setLoading(false);
              }
            };
            fetchInvitations();
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

export default PendingInvitations;