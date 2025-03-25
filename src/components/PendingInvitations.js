import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Title, Text, Button, Chip, List, Avatar, Dialog, Portal } from 'react-native-paper';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { acceptProjectInvitation } from '../services/projects';

const PendingInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch pending invitations for the current user
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        
        // Query the invitations collection for pending invitations for this user
        const invitationsQuery = query(
          collection(db, 'invitations'),
          where('inviteeId', '==', user.uid),
          where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(invitationsQuery);
        
        // Map the invitations to a more usable format
        const invitationsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setInvitations(invitationsList);
      } catch (err) {
        console.error('Error fetching invitations:', err);
        setError('Failed to load invitations. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    // Set up a real-time listener for auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) fetchInvitations();
    });
    
    // Fetch invitations initially and then every 30 seconds
    fetchInvitations();
    const refreshInterval = setInterval(fetchInvitations, 30000);
    
    // Cleanup on component unmount
    return () => {
      clearInterval(refreshInterval);
      unsubscribeAuth();
    };
  }, []);

  // Handle accepting an invitation
  const handleAcceptInvitation = async () => {
    if (!selectedInvitation) return;
    
    try {
      setProcessingAction(true);
      
      // Use the acceptProjectInvitation service
      await acceptProjectInvitation(selectedInvitation.id);
      
      // Update the local state
      setInvitations(invitations.filter(inv => inv.id !== selectedInvitation.id));
      setDialogVisible(false);
      setSelectedInvitation(null);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle rejecting an invitation
  const handleRejectInvitation = async () => {
    if (!selectedInvitation) return;
    
    try {
      setProcessingAction(true);
      
      // Update the invitation status in Firestore
      const invitationRef = doc(db, 'invitations', selectedInvitation.id);
      await updateDoc(invitationRef, {
        status: 'rejected',
        respondedAt: serverTimestamp()
      });
      
      // Update the local state
      setInvitations(invitations.filter(inv => inv.id !== selectedInvitation.id));
      setDialogVisible(false);
      setSelectedInvitation(null);
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      setError('Failed to reject invitation. Please try again.');
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