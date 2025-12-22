
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { format, formatDistance, isToday, isThisWeek, isThisMonth } from "date-fns";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Loader2, AlertTriangle, CheckCircle2, User, Image as ImageIcon, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { runPhotoValidation } from "@/lib/actions";
import type { OvertimeRecord, ValidationResult, VerificationStatus } from "@/lib/types";
import { Textarea } from "../ui/textarea";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";

type AdminDashboardProps = {
  records: OvertimeRecord[];
  onUpdateRecord: (updatedRecord: Partial<OvertimeRecord> & { id: string }) => void;
  onDeleteRecord: (recordId: string) => void;
};

export function AdminDashboard({ records, onUpdateRecord, onDeleteRecord }: AdminDashboardProps) {
  const [filter, setFilter] = useState("daily");
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoToView, setPhotoToView] = useState<{ url: string; type: 'checkIn' | 'checkOut' } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const { db } = useFirestore();


  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!r.checkInTime) return false;
      const checkInDate = new Date(r.checkInTime);
      switch (filter) {
        case "daily": return isToday(checkInDate);
        case "weekly": return isThisWeek(checkInDate, { weekStartsOn: 1 });
        case "monthly": return isThisMonth(checkInDate);
        default: return true;
      }
    }).sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime());
  }, [records, filter]);

  const handleValidate = async () => {
    if (!selectedRecord || !photoToView) return;

    setIsValidating(true);
    const result = await runPhotoValidation(photoToView.url);
    
    const fieldToUpdate = photoToView.type === 'checkIn' ? 'checkInValidation' : 'checkOutValidation';

    const updatedRecord = { ...selectedRecord, [fieldToUpdate]: result };
    
    if (db) {
        const recordRef = doc(db, "overtimeRecords", selectedRecord.id);
        await updateDoc(recordRef, { [fieldToUpdate]: result });
    }
    
    setSelectedRecord(updatedRecord);
    setIsValidating(false);
  };
  
  const openPhotoDialog = (record: OvertimeRecord, photoType: 'checkIn' | 'checkOut') => {
    const photoUrl = photoType === 'checkIn' ? record.checkInPhoto : record.checkOutPhoto;
    if (photoUrl) {
      setSelectedRecord(record);
      setPhotoToView({ url: photoUrl, type: photoType });
      setIsDialogOpen(true);
    }
  };

  const openVerificationDialog = (record: OvertimeRecord) => {
    setSelectedRecord(record);
    setVerificationNotes(record.verificationNotes || "");
    setIsVerificationDialogOpen(true);
  }

  const handleVerification = (status: VerificationStatus) => {
    if (!selectedRecord || !db) return;
    const updatedData = { 
      id: selectedRecord.id,
      verificationStatus: status,
      verificationNotes: verificationNotes
    };
    onUpdateRecord(updatedData);
    setIsVerificationDialogOpen(false);
    setSelectedRecord(null);
    setVerificationNotes("");
  }


  const renderValidationStatus = (validation?: ValidationResult | { error: string }) => {
    if (!validation) return <Badge variant="secondary">Belum Dicek</Badge>;
    if ('error' in validation) return <Badge variant="destructive">Error</Badge>;
    if (validation.isPerson) {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">{`✓ Orang (${(validation.confidence * 100).toFixed(0)}%)`}</Badge>;
    }
    return <Badge variant="destructive">{`✕ Bukan Orang (${(validation.confidence * 100).toFixed(0)}%)`}</Badge>;
  }

  const renderVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'Accepted':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Diterima</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Ditolak</Badge>;
      case 'Pending':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const calculateDuration = (checkIn: string, checkOut: string): string => {
    return formatDistance(new Date(checkOut), new Date(checkIn), { locale: id });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Lembur Karyawan</CardTitle>
        <CardDescription>
          Tinjau, validasi foto, dan verifikasi data lembur yang tercatat.
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
                    <TableHead>Durasi</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-center">Verifikasi</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{record.checkInTime ? format(new Date(record.checkInTime), 'P', { locale: id }) : '-'}</TableCell>
                        <TableCell>
                          {record.checkInTime && record.checkOutTime
                            ? calculateDuration(record.checkInTime, record.checkOutTime)
                            : (record.checkInTime ? `${new Date(record.checkInTime).toLocaleTimeString('id-ID')} - ...` : '-')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.purpose ?? '-'}</TableCell>
                        <TableCell className="text-center">
                          {renderVerificationBadge(record.verificationStatus)}
                        </TableCell>
                        <TableCell className="flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => openPhotoDialog(record, 'checkIn')} disabled={!record.checkInPhoto}>
                            Foto Masuk
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openPhotoDialog(record, 'checkOut')} disabled={!record.checkOutPhoto}>
                            Foto Keluar
                          </Button>
                          <Button variant="default" size="sm" onClick={() => openVerificationDialog(record)} disabled={record.status !== 'Checked Out'}>
                            Tinjau
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data lembur secara permanen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteRecord(record.id)}>Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

        {/* Photo Validation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Validasi Foto {photoToView?.type === 'checkIn' ? 'Cek In' : 'Cek Out'}</DialogTitle>
              <DialogDescription>
                Gunakan AI untuk memvalidasi bahwa foto ini adalah foto orang.
                {selectedRecord?.purpose && photoToView?.type === 'checkIn' && (
                    <div className="pt-4">
                        <div className="font-semibold">Keterangan Lembur:</div>
                        <div className="text-sm text-muted-foreground">{selectedRecord.purpose}</div>
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

        {/* Overtime Verification Dialog */}
        <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verifikasi Lembur</DialogTitle>
              <DialogDescription>
                Tinjau detail lembur dan berikan persetujuan atau penolakan.
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-4">
                <p><strong>Karyawan:</strong> {selectedRecord.employeeName}</p>
                <p><strong>Keterangan:</strong> {selectedRecord.purpose}</p>
                <p><strong>Durasi:</strong> {selectedRecord.checkInTime && selectedRecord.checkOutTime ? calculateDuration(selectedRecord.checkInTime, selectedRecord.checkOutTime) : 'N/A'}</p>
                <Textarea 
                  placeholder="Tambahkan catatan (opsional)..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => handleVerification('Rejected')}>
                <ThumbsDown className="mr-2 h-4 w-4" /> Tolak
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleVerification('Accepted')}>
                <ThumbsUp className="mr-2 h-4 w-4" /> Terima
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

    
    