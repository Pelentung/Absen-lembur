export type GeoLocation = {
  latitude: number;
  longitude: number;
};

export type ValidationResult = {
  isPerson: boolean;
  confidence: number;
};

export type OvertimeRecord = {
  id: string;
  employeeName: string;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInLocation: GeoLocation | null;
  checkOutLocation: GeoLocation | null;
  status: 'Checked In' | 'Checked Out';
  checkInValidation?: ValidationResult | { error: string };
  checkOutValidation?: ValidationResult | { error:string };
};
