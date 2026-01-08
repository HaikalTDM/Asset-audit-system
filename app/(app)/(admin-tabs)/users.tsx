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
import { api } from '@/lib/api';

export default function UserManagement() {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = React.useState(false);
  const [menuVisibleUserId, setMenuVisibleUserId] = React.useState<string | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);
  const [newUserData, setNewUserData] = React.useState({
    displayName: '',
    email: '',
    password: '',
    role: 'staff' as UserRole,
  });
  const [userStats, setUserStats] = React.useState<{ [userId: string]: number }>({});
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const scheme = useColorScheme() ?? 'light';
  const { user, userProfile, adminCreateUser, signingOut } = useAuth();

  const load = React.useCallback(async () => {
    if (signingOut || !user || userProfile?.role !== 'admin') return;

    try {
      setLoading(true);
      setError(null);
      const allUsers = await FirestoreService.listAllUsers();
      if (signingOut) return;
      setUsers(allUsers);

      // Load assessment counts for each user
      const allAssessments = await FirestoreService.listAllAssessments();
      if (signingOut) return;
      const stats: { [userId: string]: number } = {};
      allAssessments.forEach(assessment => {
        stats[assessment.userId] = (stats[assessment.userId] || 0) + 1;
      });
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      if (!signingOut) setLoading(false);
    }
  }, [user, userProfile, signingOut]);

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
      setCreateError('Please enter a display name');
      return;
    }
    if (!newUserData.email.trim()) {
      setCreateError('Please enter an email');
      return;
    }
    if (!newUserData.password || newUserData.password.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      await adminCreateUser(
        newUserData.email.trim(),
        newUserData.password,
        newUserData.displayName.trim(),
        newUserData.role
      );
      
      // Optional: keep a subtle success toast or banner if desired
      
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
      setCreateError(error?.message || 'Failed to create user. Please try again.');
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
    setCreateError(null);
    setCreateModalVisible(true);
  };

  const handleSendPasswordResetEmail = async (targetUser: UserProfile) => {
    Alert.alert(
      'Reset Password',
      `Reset password for:\n\n${targetUser.email}\n\nA temporary password will be generated and shown to you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Password',
          onPress: async () => {
            try {
              const result = await api.adminResetPassword(targetUser.id);
              Alert.alert(
                'Temporary Password Created',
                `Temporary password for ${targetUser.email}:\n\n${result.tempPassword}\n\nAsk the user to sign in and change their password.`
              );
            } catch (error: any) {
              console.error('Error resetting password:', error);
              Alert.alert('Error', error?.message || 'Failed to reset password');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (targetUser: UserProfile) => {
    const newStatus = !targetUser.isActive;
    
    Alert.alert(
      newStatus ? 'Activate User' : 'Deactivate User',
      `${newStatus ? 'Activate' : 'Deactivate'} ${targetUser.displayName}?\n\n${newStatus ? 'User will be able to sign in.' : 'User will be unable to sign in.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Activate' : 'Deactivate',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await FirestoreService.updateUserActiveStatus(targetUser.id, newStatus);
              Alert.alert('Success', `User ${newStatus ? 'activated' : 'deactivated'} successfully`);
              await load();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to update user status');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    // Prevent deleting yourself
    if (targetUser.id === user?.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }

    const assessmentCount = userStats[targetUser.id] || 0;

    Alert.alert(
      'Delete User',
      `Permanently delete ${targetUser.displayName}?\n\nWARNING: This will also delete:\n- ${assessmentCount} assessment${assessmentCount !== 1 ? 's' : ''}\n- All associated photos\n- All user data\n\nThis action CANNOT be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirestoreService.deleteUser(targetUser.id);
              Alert.alert('Success', 'User and all associated data deleted successfully');
              await load();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete user');
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
              Joined: {new Date(item.created_at).toLocaleDateString()} | {userStats[item.id] || 0} assessment{(userStats[item.id] || 0) !== 1 ? 's' : ''}
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
            {/* Send Password Reset Email */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisibleUserId(null);
                handleSendPasswordResetEmail(item);
              }}
            >
              <Ionicons name="mail" size={20} color="#8b5cf6" />
              <ThemedText style={styles.menuItemText}>Reset Password (Email)</ThemedText>
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

            {/* Activate / Deactivate */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisibleUserId(null);
                handleToggleActive(item);
              }}
            >
              <Ionicons 
                name={item.isActive ? "ban-outline" : "checkmark-circle-outline"} 
                size={20} 
                color={item.isActive ? "#f59e0b" : "#10b981"} 
              />
              <ThemedText style={styles.menuItemText}>
                {item.isActive ? 'Deactivate User' : 'Activate User'}
              </ThemedText>
            </TouchableOpacity>

            {/* Delete User */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                styles.dangerMenuItem,
                { backgroundColor: '#7f1d1d', borderBottomColor: '#7f1d1d' }
              ]}
              onPress={() => {
                setMenuVisibleUserId(null);
                handleDeleteUser(item);
              }}
              disabled={item.id === user?.id}
            >
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
              <ThemedText style={[styles.menuItemText, { color: '#ffffff', fontWeight: '700' }]}>
                Delete User
              </ThemedText>
            </TouchableOpacity>
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
                title="Close"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.closeButton}
              />
            </View>

            <View style={styles.formContainer}>
            {createError && (
              <View style={[styles.inlineErrorBox, {
                backgroundColor: scheme === 'dark' ? '#7f1d1d' : '#fee2e2',
                borderColor: scheme === 'dark' ? '#ef4444' : '#ef4444',
              }]}>
                <Ionicons name="warning-outline" size={20} color={scheme === 'dark' ? '#fecaca' : '#b91c1c'} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.inlineErrorTitle, { color: scheme === 'dark' ? '#fecaca' : '#b91c1c' }]}>Cannot create user</ThemedText>
                  <ThemedText style={[styles.inlineErrorText, { color: scheme === 'dark' ? '#fecaca' : '#7f1d1d' }]}>{createError}</ThemedText>
                </View>
              </View>
            )}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Display Name</ThemedText>
                <TextInput
                  style={[styles.input, { 
                    color: Colors[scheme].text,
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                  }]}
                  value={newUserData.displayName}
                onChangeText={(text) => { setCreateError(null); setNewUserData({ ...newUserData, displayName: text }); }}
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
                onChangeText={(text) => { setCreateError(null); setNewUserData({ ...newUserData, email: text }); }}
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
                onChangeText={(text) => { setCreateError(null); setNewUserData({ ...newUserData, password: text }); }}
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
  dangerMenuItem: {
    backgroundColor: '#fef2f2',
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
  inlineErrorBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  inlineErrorTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineErrorText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
