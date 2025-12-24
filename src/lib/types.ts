
export type GeoLocation = {
  latitude: number;
  longitude: number;
};

export type VerificationStatus = 'Pending' | 'Accepted' | 'Rejected';

export type UserRole = 'Admin' | 'User';

export type UserProfile = {
  id: string; // Document ID from Firestore
  uid: string;
  email: string;
  name: string;
  nip: string;
  pangkat?: string;
  jabatan: string;
  role: UserRole;
};

export type OvertimeRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  checkInTime: string; // Should always be a string now
  checkOutTime: string | null; // Null until checked out
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInLocation: GeoLocation | null;
  checkOutLocation: GeoLocation | null;
  status: 'Checked In' | 'Checked Out';
  purpose: string; // Should always exist on creation
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  createdAt: string; // Added for sorting
};

    