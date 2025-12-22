
"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDashboard } from "./UserDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { Logo } from "./Logo";
import type { OvertimeRecord, UserRole } from "@/lib/types";
import { useCollection, useUser, useAuth } from "@/firebase";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useFirestore } from "@/firebase";
import { Button } from "../ui/button";

type HomePageProps = {
  userRole: UserRole;
};

export function HomePage({ userRole }: HomePageProps) {
  const { db } = useFirestore();
  const { user, name: userName } = useUser();
  const auth = useAuth();
  const router = useRouter();
  
  const { data: records = [], loading, error } = useCollection<OvertimeRecord>(db ? collection(db, 'overtimeRecords') : null);

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
    localActiveRecord ?? sortedRecords.find(r => r.employeeName === userName && r.status === "Checked In") ?? null, 
    [sortedRecords, userName, localActiveRecord]
  );
  
  const userHistory = useMemo(() =>
    sortedRecords.filter(r => r.employeeName === userName),
    [sortedRecords, userName]
  );

  const uploadPhoto = async (photoDataUri: string, recordId: string, type: 'checkIn' | 'checkOut'): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `overtime_photos/${recordId}_${type}.jpg`);
    await uploadString(storageRef, photoDataUri, 'data_url');
    return getDownloadURL(storageRef);
  };

  const handleCheckIn = useCallback(async (newRecordData: Omit<OvertimeRecord, 'id' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation' | 'verificationStatus' | 'createdAt'>) => {
    if (!db) return;
    const docRef = await addDoc(collection(db, 'overtimeRecords'), { ...newRecordData, status: 'Pending' });
    const checkInPhotoUrl = newRecordData.checkInPhoto ? await uploadPhoto(newRecordData.checkInPhoto, docRef.id, 'checkIn') : null;
    
    const createdAt = new Date().toISOString();
    const finalRecord: OvertimeRecord = {
      id: docRef.id,
      ...newRecordData,
      checkInPhoto: checkInPhotoUrl,
      status: 'Checked In',
      checkOutTime: null,
      checkOutPhoto: null,
      checkOutLocation: null,
      verificationStatus: 'Pending',
      createdAt: createdAt,
    };
    await updateDoc(docRef, finalRecord);
    setLocalActiveRecord(finalRecord);
  }, [db]);

  const handleCheckOut = useCallback(async ({ id, checkOutTime, checkOutPhoto, checkOutLocation }: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => {
    if (!db || !checkOutTime || !checkOutPhoto) return;

    const checkOutPhotoUrl = await uploadPhoto(checkOutPhoto, id, 'checkOut');

    const recordRef = doc(db, 'overtimeRecords', id);
    await updateDoc(recordRef, {
      status: 'Checked Out',
      checkOutTime: new Date(checkOutTime).toISOString(),
      checkOutPhoto: checkOutPhotoUrl,
      checkOutLocation,
    });
    setLocalActiveRecord(null);
  }, [db]);

  const handleUpdateRecord = useCallback(async (updatedRecord: Partial<OvertimeRecord> & { id: string }) => {
    if (!db) return;
    const { id, ...dataToUpdate } = updatedRecord;
    const recordRef = doc(db, 'overtimeRecords', id);
    await updateDoc(recordRef, { ...dataToUpdate });
  }, [db]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const defaultTab = userRole === 'Admin' ? 'admin' : 'user';

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <Logo className="h-16 w-16 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">ABSENSI LEMBUR</h1>
                    <p className="text-muted-foreground">Dinas Perumahan Kawasan Permukiman Cipta Karya dan Tata Ruang Kota Medan</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden sm:inline">Halo, {userName}!</span>
                <Button variant="outline" onClick={handleLogout}>Keluar</Button>
            </div>
        </header>

        <Tabs defaultValue={defaultTab} className="w-full">
          {userRole === 'Admin' ? (
            <TabsList className="grid w-full grid-cols-2 md:w-96">
              <TabsTrigger value="user">Pengguna</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
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
            <TabsContent value="admin" className="mt-6">
              <AdminDashboard 
                records={sortedRecords}
                onUpdateRecord={handleUpdateRecord}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}
