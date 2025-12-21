"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDashboard } from "./UserDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { Logo } from "./Logo";
import type { OvertimeRecord } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const now = new Date();
const MOCK_RECORDS: OvertimeRecord[] = [
  {
    id: 'rec1',
    employeeName: 'Budi Santoso',
    checkInTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
    checkOutTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    checkInPhoto: PlaceHolderImages.find(p => p.id === '1')?.imageUrl ?? null,
    checkOutPhoto: PlaceHolderImages.find(p => p.id === '2')?.imageUrl ?? null,
    checkInLocation: { latitude: -6.200000, longitude: 106.816666 },
    checkOutLocation: { latitude: -6.200100, longitude: 106.816766 },
    status: 'Checked Out',
  },
  {
    id: 'rec2',
    employeeName: 'Citra Lestari',
    checkInTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    checkOutTime: null,
    checkInPhoto: PlaceHolderImages.find(p => p.id === '3')?.imageUrl ?? null,
    checkOutPhoto: null,
    checkInLocation: { latitude: -6.210000, longitude: 106.826666 },
    checkOutLocation: null,
    status: 'Checked In',
  },
  {
    id: 'rec3',
    employeeName: 'Agus Wijaya',
    checkInTime: new Date(new Date().setDate(now.getDate() - 1)), // Yesterday
    checkOutTime: new Date(new Date(new Date().setDate(now.getDate() - 1)).getTime() + 8 * 60 * 60 * 1000), // Yesterday + 8 hours
    checkInPhoto: PlaceHolderImages.find(p => p.id === '4')?.imageUrl ?? null,
    checkOutPhoto: PlaceHolderImages.find(p => p.id === '1')?.imageUrl ?? null,
    checkInLocation: { latitude: -6.220000, longitude: 106.836666 },
    checkOutLocation: { latitude: -6.220100, longitude: 106.836766 },
    status: 'Checked Out',
  },
];


export function HomePage() {
  const [records, setRecords] = useState<OvertimeRecord[]>(MOCK_RECORDS);
  const [activeUserRecord, setActiveUserRecord] = useState<OvertimeRecord | null>(
    MOCK_RECORDS.find(r => r.employeeName === "Pengguna Demo" && r.status === "Checked In") ?? null
  );

  const handleCheckIn = useCallback((newRecordData: Omit<OvertimeRecord, 'id' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => {
    const newRecord: OvertimeRecord = {
      ...newRecordData,
      id: `rec-${Date.now()}`,
      status: 'Checked In',
      checkOutTime: null,
      checkOutPhoto: null,
      checkOutLocation: null,
    };
    setRecords(prev => [newRecord, ...prev]);
    setActiveUserRecord(newRecord);
  }, []);

  const handleCheckOut = useCallback(({ id, checkOutTime, checkOutPhoto, checkOutLocation }: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => {
    setRecords(prev => prev.map(r => 
      r.id === id 
        ? { ...r, status: 'Checked Out', checkOutTime, checkOutPhoto, checkOutLocation }
        : r
    ));
    setActiveUserRecord(null);
  }, []);

  const handleUpdateRecord = useCallback((updatedRecord: OvertimeRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex items-center gap-4 mb-8">
          <Logo className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">AbsenLemburKu</h1>
            <p className="text-muted-foreground">Solusi cerdas pencatatan waktu lembur.</p>
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
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          </TabsContent>
          <TabsContent value="admin" className="mt-6">
            <AdminDashboard 
              records={records}
              onUpdateRecord={handleUpdateRecord}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
