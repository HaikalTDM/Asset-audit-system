import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type UserProfile, UserRole } from '@/lib/firestore';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View, FlatList, Alert, Modal, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function UserManagement() {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = React.useState(false);
  const [emailModalVisible, setEmailModalVisible] = React.useState(false);
  const [menuVisibleUserId, setMenuVisibleUserId] = React.useState<string | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);
  const [newUserData, setNewUserData] = React.useState({
    displayName: '',
    email: '',
    password: '',
    role: 'staff' as UserRole,
  });
  const [newEmail, setNewEmail] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const scheme = useColorScheme() ?? 'light';
  const { user, userProfile, signUp } = useAuth();

  const load = React.useCallback(async () => {
    if (!user || userProfile?.role !== 'admin') return;

    try {
      setLoading(true);
      setError(null);
      const allUsers = await FirestoreService.listAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  useFocusEffect(React.useCallback(() => {
    load();
  }, [load]));

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await FirestoreService.updateUserRole(userId, newRole);
      await load(); // Reload users
      Alert.alert('Success', 'User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const confirmRoleChange = (user: UserProfile, newRole: UserRole) => {
    Alert.alert(
      'Confirm Role Change',
      `Change ${user.displayName}'s role from ${user.role} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleRoleChange(user.id, newRole) }
      ]
    );
  };

  const getRoleColor = (role: UserRole) => {
    // More professional, vibrant colors with better contrast
    return role === 'admin' ? '#ef4444' : '#10b981'; // Red for admin, green for staff
  };

  const getRoleIcon = (role: UserRole) => {
    return role === 'admin' ? 'shield-checkmark' : 'person';
  };

  const handleCreateUser = async () => {
    // Validate inputs
    if (!newUserData.displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }
    if (!newUserData.email.trim()) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }
    if (!newUserData.password || newUserData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      await signUp(
        newUserData.email.trim(),
        newUserData.password,
        newUserData.displayName.trim(),
        newUserData.role
      );
      
      Alert.alert('Success', 'User created successfully');
      
      // Reset form
      setNewUserData({
        displayName: '',
        email: '',
        password: '',
        role: 'staff',
      });
      setCreateModalVisible(false);
      
      // Reload users list
      await load();
    } catch (error: any) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setNewUserData({
      displayName: '',
      email: '',
      password: '',
      role: 'staff',
    });
    setCreateModalVisible(true);
  };

  const openEmailModal = (targetUser: UserProfile) => {
    setSelectedUser(targetUser);
    setNewEmail(targetUser.email);
    setMenuVisibleUserId(null);
    setEmailModalVisible(true);
  };

  const handleUpdateEmail = async () => {
    if (!selectedUser) return;

    // Validation
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (newEmail.trim() === selectedUser.email) {
      Alert.alert('Info', 'Email is the same as current email');
      return;
    }

    Alert.alert(
      'Confirm Email Change',
      `Change ${selectedUser.displayName}'s email from:\n\n${selectedUser.email}\n\nto:\n\n${newEmail.trim()}\n\nThis will require the user to sign in again with their new email.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Email',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              
              // Update in Firestore
              await FirestoreService.updateUserEmail(selectedUser.id, newEmail.trim());
              
              Alert.alert(
                'Success',
                'Email updated successfully.\n\nNote: If this user is currently signed in, they will need to sign in again with the new email.'
              );
              
              setEmailModalVisible(false);
              setNewEmail('');
              setSelectedUser(null);
              await load(); // Reload users list
            } catch (error: any) {
              if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Error', 'This email is already in use by another account');
              } else if (error.code === 'auth/invalid-email') {
                Alert.alert('Error', 'Invalid email address');
              } else {
                Alert.alert('Error', error?.message || 'Failed to update email');
              }
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }: { item: UserProfile }) => {
    const isMenuVisible = menuVisibleUserId === item.id;
    
    return (
      <Card style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            {/* Name with Status Indicator */}
            <View style={styles.nameWithStatus}>
              <View style={[styles.statusIndicator, { 
                backgroundColor: item.isActive ? '#10b981' : '#ef4444' 
              }]} />
              <ThemedText style={styles.userName}>{item.displayName}</ThemedText>
            </View>
            
            {/* Role Badge and Email Row */}
            <View style={styles.userNameRow}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
                <Ionicons name={getRoleIcon(item.role)} size={14} color="white" style={{ marginRight: 4 }} />
                <ThemedText style={styles.roleText}>
                  {item.role === 'admin' ? 'Admin' : 'Staff'}
                </ThemedText>
              </View>
              <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
            </View>
            
            <ThemedText style={styles.userDate}>
              Joined: {new Date(item.created_at).toLocaleDateString()}
            </ThemedText>
          </View>
          
          {/* Three-dot menu button only */}
          <TouchableOpacity
            onPress={() => setMenuVisibleUserId(isMenuVisible ? null : item.id)}
            style={[styles.menuButton, { backgroundColor: Colors[scheme].background }]}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors[scheme].text} />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {isMenuVisible && (
          <View style={[styles.menuDropdown, { 
            backgroundColor: Colors[scheme].card,
            borderColor: Colors[scheme].border,
          }]}>
            {/* Change Email */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => openEmailModal(item)}
            >
              <Ionicons name="mail-outline" size={20} color="#3b82f6" />
              <ThemedText style={styles.menuItemText}>Change Email</ThemedText>
            </TouchableOpacity>

            {/* Promote / Demote */}
            {item.role === 'staff' ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisibleUserId(null);
                  confirmRoleChange(item, 'admin');
                }}
              >
                <Ionicons name="arrow-up-circle-outline" size={20} color="#10b981" />
                <ThemedText style={styles.menuItemText}>Promote to Admin</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisibleUserId(null);
                  confirmRoleChange(item, 'staff');
                }}
              >
                <Ionicons name="arrow-down-circle-outline" size={20} color="#f59e0b" />
                <ThemedText style={styles.menuItemText}>Demote to Staff</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText>Loading users...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText style={{ color: 'red', marginBottom: 8 }}>{error}</ThemedText>
        <Button title="Retry" onPress={load} variant="secondary" />
      </View>
    );
  }

  const adminUsers = users.filter(u => u.role === 'admin');
  const staffUsers = users.filter(u => u.role === 'staff');

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <ThemedText style={styles.summaryTitle}>User Summary</ThemedText>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{adminUsers.length}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Admins</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{staffUsers.length}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Staff</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{users.filter(u => u.isActive).length}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Active</ThemedText>
          </View>
        </View>
      </Card>

      {/* Users List */}
      <View style={styles.listHeader}>
        <ThemedText style={styles.listTitle}>All Users ({users.length})</ThemedText>
        <Button
          title="Add New User"
          onPress={openCreateModal}
          style={styles.addButton}
        />
      </View>

      {users.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText style={{ opacity: 0.7 }}>No users found.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Create User Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create New User</ThemedText>
              <Button
                title="✕"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.closeButton}
              />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Display Name</ThemedText>
                <TextInput
                  style={[styles.input, { 
                    color: Colors[scheme].text,
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                  }]}
                  value={newUserData.displayName}
                  onChangeText={(text) => setNewUserData({ ...newUserData, displayName: text })}
                  placeholder="Enter full name"
                  placeholderTextColor={Colors[scheme].text + '60'}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Email</ThemedText>
                <TextInput
                  style={[styles.input, { 
                    color: Colors[scheme].text,
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                  }]}
                  value={newUserData.email}
                  onChangeText={(text) => setNewUserData({ ...newUserData, email: text })}
                  placeholder="email@example.com"
                  placeholderTextColor={Colors[scheme].text + '60'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <TextInput
                  style={[styles.input, { 
                    color: Colors[scheme].text,
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                  }]}
                  value={newUserData.password}
                  onChangeText={(text) => setNewUserData({ ...newUserData, password: text })}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={Colors[scheme].text + '60'}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Role</ThemedText>
                <View style={styles.roleButtons}>
                  <Button
                    title="Staff"
                    onPress={() => setNewUserData({ ...newUserData, role: 'staff' })}
                    variant={newUserData.role === 'staff' ? 'primary' : 'secondary'}
                    style={{ flex: 1 }}
                  />
                  <View style={{ width: 8 }} />
                  <Button
                    title="Admin"
                    onPress={() => setNewUserData({ ...newUserData, role: 'admin' })}
                    variant={newUserData.role === 'admin' ? 'primary' : 'secondary'}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <View style={{ width: 8 }} />
              <Button
                title={creating ? "Creating..." : "Create User"}
                onPress={handleCreateUser}
                disabled={creating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={styles.modalHeader}>
              <View>
                <ThemedText style={styles.modalTitle}>Change User Email</ThemedText>
                <ThemedText style={styles.modalSubtitle}>
                  {selectedUser?.displayName}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setEmailModalVisible(false)}
                style={[styles.closeIconButton, { backgroundColor: Colors[scheme].background }]}
              >
                <Ionicons name="close" size={24} color={Colors[scheme].text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Current Email</ThemedText>
                <View style={[styles.readOnlyInput, { 
                  backgroundColor: Colors[scheme].background,
                  borderColor: Colors[scheme].border,
                }]}>
                  <ThemedText style={styles.readOnlyText}>
                    {selectedUser?.email}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>New Email</ThemedText>
                <TextInput
                  style={[styles.input, { 
                    color: Colors[scheme].text,
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                  }]}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="new.email@example.com"
                  placeholderTextColor={Colors[scheme].text + '60'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.warningBox, {
                backgroundColor: '#fef3c7',
                borderColor: '#f59e0b',
              }]}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.warningTitle, { color: '#92400e' }]}>
                    Important Notice
                  </ThemedText>
                  <ThemedText style={[styles.warningText, { color: '#92400e' }]}>
                    • User will need to sign in with the new email{'\n'}
                    • Password remains the same{'\n'}
                    • Update will be immediate{'\n'}
                    • Cannot be undone easily
                  </ThemedText>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setEmailModalVisible(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <View style={{ width: 8 }} />
              <Button
                title={updating ? "Updating..." : "Change Email"}
                onPress={handleUpdateEmail}
                disabled={updating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 16,
  },
  userCard: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  nameWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 70,
    justifyContent: 'center',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
  },
  userDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuDropdown: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  formContainer: {
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  roleButtons: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    opacity: 0.7,
  },
  readOnlyText: {
    fontSize: 14,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    marginTop: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
