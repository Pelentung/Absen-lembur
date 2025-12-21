
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { format, formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { id } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Loader2, AlertTriangle, CheckCircle2, User, Image as ImageIcon } from "lucide-react";
import { runPhotoValidation } from "@/lib/actions";
import type { OvertimeRecord, ValidationResult } from "@/lib/types";

type AdminDashboardProps = {
  records: OvertimeRecord[];
  onUpdateRecord: (updatedRecord: OvertimeRecord) => void;
};

export function AdminDashboard({ records, onUpdateRecord }: AdminDashboardProps) {
  const [filter, setFilter] = useState("daily");
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoToView, setPhotoToView] = useState<{ url: string; type: 'checkIn' | 'checkOut' } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!r.checkInTime) return false;
      switch (filter) {
        case "daily": return isToday(r.checkInTime);
        case "weekly": return isThisWeek(r.checkInTime, { weekStartsOn: 1 });
        case "monthly": return isThisMonth(r.checkInTime);
        default: return true;
      }
    }).sort((a, b) => (b.checkInTime?.getTime() ?? 0) - (a.checkInTime?.getTime() ?? 0));
  }, [records, filter]);

  const handleValidate = async () => {
    if (!selectedRecord || !photoToView) return;

    setIsValidating(true);
    const result = await runPhotoValidation(photoToView.url);
    const updatedRecord = { ...selectedRecord };

    if (photoToView.type === 'checkIn') {
        updatedRecord.checkInValidation = result;
    } else {
        updatedRecord.checkOutValidation = result;
    }
    
    onUpdateRecord(updatedRecord);
    setSelectedRecord(updatedRecord);
    setIsValidating(false);
  };
  
  const openDialog = (record: OvertimeRecord, photoType: 'checkIn' | 'checkOut') => {
    const photoUrl = photoType === 'checkIn' ? record.checkInPhoto : record.checkOutPhoto;
    if (photoUrl) {
      setSelectedRecord(record);
      setPhotoToView({ url: photoUrl, type: photoType });
      setIsDialogOpen(true);
    }
  };

  const renderValidationStatus = (validation?: ValidationResult | { error: string }) => {
    if (!validation) return <Badge variant="secondary">Belum Dicek</Badge>;
    if ('error' in validation) return <Badge variant="destructive">Error</Badge>;
    if (validation.isPerson) {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">{`✓ Orang (${(validation.confidence * 100).toFixed(0)}%)`}</Badge>;
    }
    return <Badge variant="destructive">{`✕ Bukan Orang (${(validation.confidence * 100).toFixed(0)}%)`}</Badge>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Lembur Karyawan</CardTitle>
        <CardDescription>
          Tinjau dan validasi data lembur yang telah dicatat oleh sistem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="daily">Harian</TabsTrigger>
            <TabsTrigger value="weekly">Mingguan</TabsTrigger>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tujuan</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead className="text-center">Foto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{record.checkInTime ? format(record.checkInTime, 'P', { locale: id }) : '-'}</TableCell>
                        <TableCell>
                          {record.checkInTime?.toLocaleTimeString() ?? '-'} - {record.checkOutTime?.toLocaleTimeString() ?? '...'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.purpose ?? '-'}</TableCell>
                        <TableCell>
                          {record.checkInTime && record.checkOutTime
                            ? formatDistanceToNow(record.checkInTime, { addSuffix: false, locale: id, includeSeconds: true }).replace('sekitar ','')
                            : (record.checkInTime ? 'Berlangsung' : '-')}
                        </TableCell>
                        <TableCell className="flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => openDialog(record, 'checkIn')} disabled={!record.checkInPhoto}>
                            Cek In
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openDialog(record, 'checkOut')} disabled={!record.checkOutPhoto}>
                            Cek Out
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Tidak ada data untuk periode ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Validasi Foto {photoToView?.type === 'checkIn' ? 'Cek In' : 'Cek Out'}</DialogTitle>
              <DialogDescription>
                Gunakan AI untuk memvalidasi bahwa foto ini adalah foto orang.
                {selectedRecord?.purpose && photoToView?.type === 'checkIn' && (
                    <div className="pt-4">
                        <p className="font-semibold">Tujuan Lembur:</p>
                        <p className="text-sm text-muted-foreground">{selectedRecord.purpose}</p>
                    </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
                {photoToView && (
                    <div className="relative w-full aspect-square rounded-md overflow-hidden mx-auto">
                        <Image src={photoToView.url} alt="Validation photo" layout="fill" objectFit="cover" />
                    </div>
                )}
                <Button onClick={handleValidate} disabled={isValidating}>
                    {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    Validasi dengan AI
                </Button>
                
                {selectedRecord && photoToView && (
                    (photoToView.type === 'checkIn' && selectedRecord.checkInValidation) ||
                    (photoToView.type === 'checkOut' && selectedRecord.checkOutValidation)) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Hasil Validasi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const validation = photoToView.type === 'checkIn' ? selectedRecord.checkInValidation : selectedRecord.checkOutValidation;
                                if (!validation) return null;
                                if ('error' in validation) {
                                    return <div className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-4 w-4" /> Error: {validation.error}</div>;
                                }
                                if (validation.isPerson) {
                                    return <div className="flex items-center text-green-600"><CheckCircle2 className="mr-2 h-4 w-4" /> Terverifikasi sebagai orang ({(validation.confidence * 100).toFixed(0)}%)</div>;
                                }
                                return <div className="flex items-center text-amber-600"><User className="mr-2 h-4 w-4" /> Dideteksi bukan orang ({(validation.confidence * 100).toFixed(0)}%)</div>;
                            })()}
                        </CardContent>
                    </Card>
                )}

            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
