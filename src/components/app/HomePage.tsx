
"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDashboard } from "./UserDashboard";
import { ManageUsers } from "./ManageUsers";
import { ManageOvertime } from "./ManageOvertime";
import { AdminReport } from "./AdminReport";
import { Logo } from "./Logo";
import type { OvertimeRecord, UserRole, UserProfile, VerificationStatus } from "@/lib/types";
import { useCollection, useUser, useAuth } from "@/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useFirestore } from "@/firebase";
import { Button } from "../ui/button";
import { InstallPWAButton } from "./InstallPWAButton";


type HomePageProps = {
  userRole: UserRole;
};

export function HomePage({ userRole }: HomePageProps) {
  const { db } = useFirestore();
  const { user, name: userName } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const recordsQuery = useMemo(() => {
    if (!db || !user) return null;
    if (userRole === 'Admin') {
      return query(collection(db, 'overtimeRecords'));
    }
    return query(collection(db, 'overtimeRecords'), where('employeeId', '==', user.uid));
  }, [db, user, userRole]);

  const usersQuery = useMemo(() => {
    if (!db || userRole !== 'Admin') return null;
    return query(collection(db, 'users'));
  }, [db, userRole]);

  const { data: records, loading: recordsLoading } = useCollection<OvertimeRecord>(recordsQuery, { isRealtime: true });
  const { data: usersData, loading: usersLoading } = useCollection<UserProfile>(usersQuery, { isRealtime: true });
  const users = usersData ?? [];


  const [localActiveRecord, setLocalActiveRecord] = useState<OvertimeRecord | null>(null);

  const sortedRecords = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [records]);
  
  // This logic ensures the UI is immediately responsive.
  const activeUserRecord = useMemo(() => {
    if (localActiveRecord) return localActiveRecord;
    if (recordsLoading) return null; // Wait for records to load initially
    return sortedRecords.find(r => r.status === "Checked In") ?? null;
  }, [localActiveRecord, sortedRecords, recordsLoading]);
  
  const userHistory = useMemo(() =>
    sortedRecords,
    [sortedRecords]
  );

  const uploadPhotoAndUpdateRecord = useCallback((photoDataUri: string, recordId: string, type: 'checkIn' | 'checkOut') => {
    if (!db) return;

    // This whole process runs in the background without blocking the UI.
    (async () => {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `overtime_photos/${recordId}_${type}.jpg`);
        
        await uploadString(storageRef, photoDataUri, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        const recordRef = doc(db, 'overtimeRecords', recordId);
        const fieldToUpdate = type === 'checkIn' 
            ? { checkInPhoto: downloadURL } 
            : { checkOutPhoto: downloadURL };
            
        await updateDoc(recordRef, fieldToUpdate);
        console.log(`Background photo upload for ${type} successful.`);
      } catch (error) {
        console.error(`Error in background photo upload for ${type}:`, error);
        // This error happens in the background. We could add a retry mechanism or logging.
      }
    })();
  }, [db]);

  const handleCheckIn = useCallback(async (newRecordData: Omit<OvertimeRecord, 'id' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation' | 'verificationStatus' | 'createdAt'>) => {
    if (!db || !user || !userName) return;
    
    const createdAt = new Date().toISOString();
    const temporaryPhotoForUpload = newRecordData.checkInPhoto; // The data URI
    
    // 1. Prepare the initial record for Firestore (without the photo URL)
    const initialRecord: Omit<OvertimeRecord, 'id'> = {
      ...newRecordData,
      employeeId: user.uid,
      employeeName: userName,
      checkInPhoto: null, // Firestore will store null initially
      status: 'Checked In',
      checkOutTime: null,
      checkOutPhoto: null,
      checkOutLocation: null,
      verificationStatus: 'Pending',
      createdAt: createdAt,
    };
    
    try {
      // 2. This is the only part the user's device waits for. It's very fast.
      const docRef = await addDoc(collection(db, 'overtimeRecords'), initialRecord);
      
      // 3. Immediately update the UI with an "optimistic" local record.
      // Use the temporary photo data URI for immediate visual feedback if needed, even though it's null in Firestore.
      const optimisticRecord: OvertimeRecord = {
        ...initialRecord,
        id: docRef.id,
        checkInPhoto: temporaryPhotoForUpload, // For UI display only
      };
      setLocalActiveRecord(optimisticRecord);

      // 4. Start the photo upload in the background. Note the absence of 'await'.
      if (temporaryPhotoForUpload) {
        uploadPhotoAndUpdateRecord(temporaryPhotoForUpload, docRef.id, 'checkIn');
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      setLocalActiveRecord(null); // Rollback optimistic update on error
      throw error; // Re-throw to be caught by the UI
    }

  }, [db, user, userName, uploadPhotoAndUpdateRecord]);

  const handleCheckOut = useCallback(async ({ id, checkOutTime, checkOutPhoto, checkOutLocation }: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => {
    if (!db || !checkOutTime || !checkOutPhoto) return;

    const recordRef = doc(db, 'overtimeRecords', id);
    
    // 1. Optimistically update the UI to show it's checked out
    setLocalActiveRecord(null);
    
    try {
      // 2. This part is very fast. Update the record with text-based data.
      await updateDoc(recordRef, {
        status: 'Checked Out',
        checkOutTime: new Date(checkOutTime).toISOString(),
        checkOutLocation,
        checkOutPhoto: null, // Set to null initially in Firestore
      });

      // 3. Start photo upload in the background. Note the absence of 'await'.
      uploadPhotoAndUpdateRecord(checkOutPhoto, id, 'checkOut');
    } catch (error) {
      console.error("Error during check-out:", error);
      // If the update fails, we should ideally revert the local state.
      // However, the real-time listener will eventually correct the UI.
      throw error; // Re-throw to be caught by the UI
    }

  }, [db, uploadPhotoAndUpdateRecord]);


  const handleUpdateUser = useCallback(async (updatedUser: Partial<UserProfile> & { id: string }) => {
    if (!db) return;
    const { id, ...dataToUpdate } = updatedUser;
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, dataToUpdate);
  }, [db]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!db) return;
    // Note: This only deletes the Firestore document, not the Firebase Auth user.
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  }, [db]);
  
  const handleUpdateOvertimeStatus = useCallback(async (recordId: string, status: VerificationStatus, notes?: string) => {
    if (!db) return;
    const recordRef = doc(db, 'overtimeRecords', recordId);
    await updateDoc(recordRef, {
        verificationStatus: status,
        verificationNotes: notes || ""
    });
  }, [db]);


  const handleLogout = async () => {
    if(auth) {
        await auth.signOut();
    }
    router.push('/login');
  };

  const defaultTab = userRole === 'Admin' ? 'admin-overtime' : 'user';

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex flex-col items-center text-center gap-4">
                <Logo className="h-16 w-16 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">ABSENSI LEMBUR</h1>
                    <p className="font-bold text-primary">Dinas Perumahan Kawasan Permukiman Cipta Karya dan Tata Ruang Kota Medan</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <InstallPWAButton />
                <span className="text-sm text-muted-foreground hidden sm:inline">Halo, {userName}!</span>
                <Button variant="outline" onClick={handleLogout}>Keluar</Button>
            </div>
        </header>

        <Tabs defaultValue={defaultTab} className="w-full">
          {userRole === 'Admin' ? (
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 md:w-auto">
              <TabsTrigger value="user">Absensi Pribadi</TabsTrigger>
              <TabsTrigger value="admin-overtime">Kelola Absensi</TabsTrigger>
              <TabsTrigger value="admin-users">Kelola Pengguna</TabsTrigger>
              <TabsTrigger value="admin-report">Laporan</TabsTrigger>
            </TabsList>
          ) : (
            <div />
          )}

          <TabsContent value="user" className="mt-6">
            <UserDashboard 
              activeRecord={activeUserRecord}
              historyRecords={userHistory}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              userName={userName ?? 'Pengguna'}
            />
          </TabsContent>
          {userRole === 'Admin' && (
            <>
               <TabsContent value="admin-overtime" className="mt-6">
                <ManageOvertime 
                  records={sortedRecords}
                  onUpdateStatus={handleUpdateOvertimeStatus}
                />
              </TabsContent>
              <TabsContent value="admin-users" className="mt-6">
                <ManageUsers 
                  users={users}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  isLoading={usersLoading}
                />
              </TabsContent>
              <TabsContent value="admin-report" className="mt-6">
                <AdminReport 
                  records={sortedRecords}
                  users={users}
                  isLoading={recordsLoading || usersLoading}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </main>
  );
}
