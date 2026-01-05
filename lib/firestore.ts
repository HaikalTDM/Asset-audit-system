import { api } from '@/lib/api';

export type UserRole = 'staff' | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  created_at: number;
  updated_at: number;
  isActive: boolean;
  photoUrl?: string;
};

export type Assessment = {
  id: string;
  userId: string;
  created_at: number;
  latitude: number | null;
  longitude: number | null;
  building?: string;
  floor?: string;
  room?: string;
  category: string;
  element: string;
  floorLevel?: string;
  condition: number;
  priority: number;
  damageCategory?: string;
  rootCause?: string;
  rootCauseDetails?: string;
  photo_uri: string;
  notes: string;
};

function mapAssessment(row: any): Assessment {
  return {
    id: row.id,
    userId: row.user_id,
    created_at: row.created_at,
    latitude: row.latitude,
    longitude: row.longitude,
    building: row.building || '',
    floor: row.floor || '',
    room: row.room || '',
    category: row.category,
    element: row.element,
    floorLevel: row.floorLevel || '',
    condition: row.condition_rating,
    priority: row.priority_rating,
    damageCategory: row.damage_category || '',
    rootCause: row.root_cause || '',
    rootCauseDetails: row.root_cause_details || '',
    photo_uri: row.photo_uri || row.photo_url || '',
    notes: row.notes || '',
  };
}

export class FirestoreService {
  static async listAssessments(userId: string) {
    const data = await api.listAssessments(userId);
    return (data.assessments || []).map(mapAssessment);
  }

  static async listAllAssessments(): Promise<Assessment[]> {
    const data = await api.listAssessments();
    return (data.assessments || []).map(mapAssessment);
  }

  static async getAssessment(id: string): Promise<Assessment> {
    const data = await api.getAssessment(id);
    return mapAssessment(data.assessment);
  }

  static async createAssessment(assessment: Omit<Assessment, 'id'>): Promise<Assessment> {
    const form = new FormData();
    form.append('created_at', String(assessment.created_at));
    form.append('building', assessment.building || '');
    form.append('floor', assessment.floor || '');
    form.append('room', assessment.room || '');
    form.append('category', assessment.category);
    form.append('element', assessment.element);
    form.append('condition', String(assessment.condition));
    form.append('priority', String(assessment.priority));
    form.append('damageCategory', assessment.damageCategory || '');
    form.append('rootCause', assessment.rootCause || '');
    form.append('rootCauseDetails', assessment.rootCauseDetails || '');
    form.append('notes', assessment.notes || '');
    if (assessment.latitude != null) form.append('latitude', String(assessment.latitude));
    if (assessment.longitude != null) form.append('longitude', String(assessment.longitude));
    if (assessment.photo_uri && assessment.photo_uri.startsWith('http')) {
      form.append('photo_uri', assessment.photo_uri);
    } else if (assessment.photo_uri) {
      form.append('photo', {
        uri: assessment.photo_uri,
        name: 'assessment.jpg',
        type: 'image/jpeg',
      } as any);
    }
    const data = await api.createAssessment(form);
    return mapAssessment(data.assessment);
  }

  static async createAssessmentWithImageUpload(assessment: Omit<Assessment, 'id'>) {
    return this.createAssessment(assessment);
  }

  static async updateAssessment(id: string, data: Partial<Assessment>) {
    const payload: Record<string, any> = {};
    if (data.notes !== undefined) payload.notes = data.notes;
    const res = await api.updateAssessment(id, payload);
    return mapAssessment(res.assessment);
  }

  static async deleteAssessment(id: string) {
    await api.deleteAssessment(id);
  }

  static async listAllUsers(): Promise<UserProfile[]> {
    const data = await api.listUsers();
    return (data.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      created_at: u.created_at,
      updated_at: u.updated_at,
      isActive: u.isActive,
      photoUrl: u.photoUrl || '',
    }));
  }

  static async createUserProfile(userId: string, email: string, displayName: string, role: UserRole = 'staff') {
    await api.adminCreateUser(email, 'Temp-ChangeMe', displayName, role);
    return { id: userId, email, displayName, role, created_at: Date.now(), updated_at: Date.now(), isActive: true };
  }

  static async updateUserRole(userId: string, role: UserRole) {
    await api.adminUpdateUser(userId, { role });
  }

  static async updateUserActiveStatus(userId: string, isActive: boolean) {
    await api.adminUpdateUser(userId, { isActive });
  }

  static async deleteUser(userId: string) {
    await api.adminDeleteUser(userId);
  }

  static async clearUserData(userId: string): Promise<void> {
    const data = await api.listAssessments(userId);
    const list = data.assessments || [];
    for (const a of list) {
      await api.deleteAssessment(a.id);
    }
  }

  static async clearAllSystemData(): Promise<void> {
    const data = await api.listAssessments();
    const list = data.assessments || [];
    for (const a of list) {
      await api.deleteAssessment(a.id);
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const users = await this.listAllUsers();
    return users.find((u) => u.id === userId) || null;
  }
}
