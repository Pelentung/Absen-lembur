
"use client";

import { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDashboard } from "./UserDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { Logo } from "./Logo";
import type { OvertimeRecord } from "@/lib/types";
import { useCollection, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useFirestore } from "@/firebase";

export function HomePage() {
  const { db } = useFirestore();
  const { data: records = [], loading, error } = useCollection<OvertimeRecord>(db ? collection(db, 'overtimeRecords') : null);

  const sortedRecords = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [records]);

  const activeUserRecord = useMemo(() => 
    sortedRecords.find(r => r.employeeName === "Pengguna Demo" && r.status === "Checked In") ?? null, 
    [sortedRecords]
  );
  
  const userHistory = useMemo(() =>
    sortedRecords.filter(r => r.employeeName === "Pengguna Demo"),
    [sortedRecords]
  );

  const uploadPhoto = async (photoDataUri: string, recordId: string, type: 'checkIn' | 'checkOut'): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `overtime_photos/${recordId}_${type}.jpg`);
    await uploadString(storageRef, photoDataUri, 'data_url');
    return getDownloadURL(storageRef);
  };

  const handleCheckIn = useCallback(async (newRecordData: Omit<OvertimeRecord, 'id' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation' | 'verificationStatus' | 'createdAt'>) => {
    if (!db) return;
    const tempId = `rec-${Date.now()}`;
    const checkInPhotoUrl = newRecordData.checkInPhoto ? await uploadPhoto(newRecordData.checkInPhoto, tempId, 'checkIn') : null;
    
    const newRecord = {
      ...newRecordData,
      checkInPhoto: checkInPhotoUrl,
      status: 'Checked In' as const,
      checkOutTime: null,
      checkOutPhoto: null,
      checkOutLocation: null,
      verificationStatus: 'Pending' as const,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'overtimeRecords'), newRecord);
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
  }, [db]);

  const handleUpdateRecord = useCallback(async (updatedRecord: OvertimeRecord) => {
    if (!db) return;
    const { id, ...dataToUpdate } = updatedRecord;
    const recordRef = doc(db, 'overtimeRecords', id);
    await updateDoc(recordRef, { ...dataToUpdate });
  }, [db]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex items-center gap-4 mb-8">
          <Logo className="h-16 w-16 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">ABSENSI LEMBUR</h1>
            <p className="text-muted-foreground">Dinas Perumahan Kawasan Permukiman Cipta Karya dan Tata Ruang Kota Medan</p>
          </div>
        </header>

        <Tabs defaultValue="user" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-96">
            <TabsTrigger value="user">Pengguna</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="user" className="mt-6">
            <UserDashboard 
              activeRecord={activeUserRecord}
              historyRecords={userHistory}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          </TabsContent>
          <TabsContent value="admin" className="mt-6">
            <AdminDashboard 
              records={sortedRecords}
              onUpdateRecord={handleUpdateRecord}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
