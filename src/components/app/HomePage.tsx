
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDashboard } from "./UserDashboard";
import { ManageUsers } from "./ManageUsers";
import { ManageOvertime } from "./ManageOvertime";
import { AdminReport } from "./AdminReport";
import { Logo } from "./Logo";
import type { OvertimeRecord, UserRole, UserProfile, VerificationStatus } from "@/lib/types";
import { useCollection, useUser, useAuth } from "@/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useFirestore } from "@/firebase";
import { Button } from "../ui/button";
import { InstallPWAButton } from "./InstallPWAButton";


type HomePageProps = {
  userRole: UserRole;
};

export function HomePage({ userRole }: HomePageProps) {
  const { db } = useFirestore();
  const { user, name: userName, role } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const [recordsLoading, setRecordsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const overtimeQuery = useMemo(() => {
    // Crucially wait for `role` to be determined to avoid incorrect queries
    if (!db || !user?.uid || !role) return null;

    if (role === 'Admin') {
      return query(collection(db, 'overtimeRecords'));
    }
    
    return query(collection(db, 'overtimeRecords'), where('employeeId', '==', user.uid));
  }, [db, user?.uid, role]);

  const usersQuery = useMemo(() => {
    if (!db || role !== 'Admin') return null;
    return query(collection(db, 'users'));
  }, [db, role]);

  const { data: records = [], loading: recordsAreLoading, refetch: refetchRecords } = useCollection<OvertimeRecord>(overtimeQuery);
  const { data: users = [], loading: usersAreLoading, refetch: refetchUsers } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    setRecordsLoading(recordsAreLoading);
  }, [recordsAreLoading]);

  useEffect(() => {
    setUsersLoading(usersAreLoading);
  }, [usersAreLoading]);

  const sortedRecords = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [records]);
  
  const activeUserRecord = useMemo(() => {
    if (recordsLoading || !records) return null;
    return sortedRecords.find(r => r.status === "Checked In") ?? null;
  }, [sortedRecords, recordsLoading]);
  
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
    
    setIsActionLoading(true);
    const createdAt = new Date().toISOString();
    const temporaryPhotoForUpload = newRecordData.checkInPhoto;
    
    const initialRecord = {
      ...newRecordData,
      employeeId: user.uid,
      employeeName: userName,
      checkInPhoto: null, // Will be updated by background upload
      status: 'Checked In' as const,
      checkOutTime: null,
      checkOutPhoto: null,
      checkOutLocation: null,
      verificationStatus: 'Pending' as const,
      createdAt: createdAt,
    };
    
    try {
      const docRef = await addDoc(collection(db, 'overtimeRecords'), initialRecord);
      
      if (temporaryPhotoForUpload) {
        uploadPhotoAndUpdateRecord(temporaryPhotoForUpload, docRef.id, 'checkIn');
      }
      await refetchRecords();
    } catch (error) {
      console.error("Error during check-in:", error);
      throw error;
    } finally {
      setIsActionLoading(false);
    }

  }, [db, user, userName, uploadPhotoAndUpdateRecord, refetchRecords]);

  const handleCheckOut = useCallback(async ({ id, checkOutTime, checkOutPhoto, checkOutLocation }: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => {
    if (!db || !checkOutTime || !checkOutPhoto) return;

    setIsActionLoading(true);
    const recordRef = doc(db, 'overtimeRecords', id);
    
    try {
      await updateDoc(recordRef, {
        status: 'Checked Out',
        checkOutTime: new Date(checkOutTime).toISOString(),
        checkOutLocation,
        checkOutPhoto: null, // Will be updated by background upload
      });

      uploadPhotoAndUpdateRecord(checkOutPhoto, id, 'checkOut');
      await refetchRecords();
    } catch (error) {
      console.error("Error during check-out:", error);
      throw error;
    } finally {
      setIsActionLoading(false);
    }

  }, [db, uploadPhotoAndUpdateRecord, refetchRecords]);


  const handleUpdateUser = useCallback(async (updatedUser: Partial<UserProfile> & { id: string }) => {
    if (!db) return;
    const { id, ...dataToUpdate } = updatedUser;
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, dataToUpdate);
    await refetchUsers();
  }, [db, refetchUsers]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    await refetchUsers();
  }, [db, refetchUsers]);
  
  const handleUpdateOvertimeStatus = useCallback(async (recordId: string, status: VerificationStatus, notes?: string) => {
    if (!db) return;
    const recordRef = doc(db, 'overtimeRecords', recordId);
    await updateDoc(recordRef, {
        verificationStatus: status,
        verificationNotes: notes || ""
    });
    await refetchRecords();
  }, [db, refetchRecords]);


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
              isLoading={recordsLoading}
              isActionLoading={isActionLoading}
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

    