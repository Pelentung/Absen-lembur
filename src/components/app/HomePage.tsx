
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

  const { data: records } = useCollection<OvertimeRecord>(recordsQuery, { isRealtime: true });
  const { data: usersData } = useCollection<UserProfile>(usersQuery, { isRealtime: true });
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

  const activeUserRecord = useMemo(() => 
    localActiveRecord ?? sortedRecords.find(r => r.employeeId === user?.uid && r.status === "Checked In") ?? null, 
    [sortedRecords, user, localActiveRecord]
  );
  
  const userHistory = useMemo(() =>
    sortedRecords.filter(r => r.employeeId === user?.uid),
    [sortedRecords, user]
  );

  const uploadPhotoAndUpdateRecord = useCallback(async (photoDataUri: string, recordId: string, type: 'checkIn' | 'checkOut') => {
    if (!db) return;
    const storage = getStorage();
    const storageRef = ref(storage, `overtime_photos/${recordId}_${type}.jpg`);
    
    try {
        await uploadString(storageRef, photoDataUri, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        const recordRef = doc(db, 'overtimeRecords', recordId);
        const fieldToUpdate = type === 'checkIn' ? { checkInPhoto: downloadURL } : { checkOutPhoto: downloadURL };
        await updateDoc(recordRef, fieldToUpdate);

        return downloadURL;
    } catch(error) {
        console.error(`Error uploading ${type} photo and updating record:`, error);
    }
  }, [db]);

  const handleCheckIn = useCallback(async (newRecordData: Omit<OvertimeRecord, 'id' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation' | 'verificationStatus' | 'createdAt'>) => {
    if (!db || !user || !userName) return;
    
    const createdAt = new Date().toISOString();
    const temporaryPhoto = newRecordData.checkInPhoto; // The data URI
    
    const initialRecord: Omit<OvertimeRecord, 'id' | 'checkInPhoto'> = {
      ...newRecordData,
      employeeId: user.uid,
      employeeName: userName,
      checkInPhoto: null, // Set to null initially
      status: 'Checked In',
      checkOutTime: null,
      checkOutPhoto: null,
      checkOutLocation: null,
      verificationStatus: 'Pending',
      createdAt: createdAt,
    };
    
    const docRef = await addDoc(collection(db, 'overtimeRecords'), initialRecord);
    
    const finalRecord: OvertimeRecord = {
      ...initialRecord,
      id: docRef.id,
      checkInPhoto: temporaryPhoto, // Show local photo immediately
    };
    setLocalActiveRecord(finalRecord);

    // Upload photo in the background and update firestore doc
    if (temporaryPhoto) {
      await uploadPhotoAndUpdateRecord(temporaryPhoto, docRef.id, 'checkIn');
    }

  }, [db, user, userName, uploadPhotoAndUpdateRecord]);

  const handleCheckOut = useCallback(async ({ id, checkOutTime, checkOutPhoto, checkOutLocation }: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => {
    if (!db || !checkOutTime || !checkOutPhoto) return;

    const recordRef = doc(db, 'overtimeRecords', id);
    
    // Optimistically update the local state to show it's checked out
    setLocalActiveRecord(null);
    
    // Update the document with checkout time, location, and a temporary status. Photo URL will be updated in the background.
    await updateDoc(recordRef, {
      status: 'Checked Out',
      checkOutTime: new Date(checkOutTime).toISOString(),
      checkOutLocation,
    });

    // Upload photo in the background and update the doc with the final URL
    await uploadPhotoAndUpdateRecord(checkOutPhoto, id, 'checkOut');

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
            <div className="flex flex-col items-center text-center md:flex-row md:text-left gap-4">
                <Logo className="h-16 w-16 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">ABSENSI LEMBUR</h1>
                    <p className="text-muted-foreground">Dinas Perumahan Kawasan Permukiman Cipta Karya dan Tata Ruang Kota Medan</p>
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
                />
              </TabsContent>
              <TabsContent value="admin-report" className="mt-6">
                <AdminReport 
                  records={sortedRecords}
                  users={users}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </main>
  );
}
