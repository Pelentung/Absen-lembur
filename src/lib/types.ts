

export type GeoLocation = {
  latitude: number;
  longitude: number;
};

export type ValidationResult = {
  isPerson: boolean;
  confidence: number;
};

export type VerificationStatus = 'Pending' | 'Accepted' | 'Rejected';

export type UserRole = 'Admin' | 'User';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
};

export type OvertimeRecord = {
  id: string;
  employeeName: string;
  checkInTime: string | null; // Changed to string for Firestore compatibility
  checkOutTime: string | null; // Changed to string for Firestore compatibility
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInLocation: GeoLocation | null;
  checkOutLocation: GeoLocation | null;
  status: 'Checked In' | 'Checked Out' | 'Pending';
  purpose?: string; // Overtime purpose
  checkInValidation?: ValidationResult | { error: string };
  checkOutValidation?: ValidationResult | { error:string };
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  createdAt: string; // Added for sorting
};
