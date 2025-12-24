
"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Check, X, MapPin, Clock, Trash2 } from "lucide-react";
import type { OvertimeRecord, VerificationStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type ManageOvertimeProps = {
  records: OvertimeRecord[];
  onUpdateStatus: (recordId: string, status: VerificationStatus, notes?: string) => Promise<void>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  isLoading: boolean;
};

export function ManageOvertime({ records = [], onUpdateStatus, onDeleteRecord, isLoading }: ManageOvertimeProps) {
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [action, setAction] = useState<"Accepted" | "Rejected" | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleVerifyClick = (record: OvertimeRecord, newStatus: "Accepted" | "Rejected") => {
    setSelectedRecord(record);
    setAction(newStatus);
    setVerificationNotes(record.verificationNotes || "");
    setIsVerifyDialogOpen(true);
  };
  
  const handleConfirmVerification = async () => {
    if (!selectedRecord || !action) return;
    
    setIsUpdating(true);
    try {
      await onUpdateStatus(selectedRecord.id, action, verificationNotes);
      toast({
        title: "Sukses",
        description: `Catatan lembur untuk ${selectedRecord.employeeName} telah diubah menjadi ${action === 'Accepted' ? 'Diterima' : 'Ditolak'}.`,
      });
      setIsVerifyDialogOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error("Verification update error:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Tidak dapat memperbarui status verifikasi.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async (recordId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteRecord(recordId);
      toast({
        title: "Sukses",
        description: "Catatan lembur berhasil dihapus.",
      });
    } catch (error) {
      console.error("Delete record error:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Tidak dapat menghapus catatan lembur.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "Accepted":
        return <Badge className="bg-green-600 hover:bg-green-700">Diterima</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const dialogTitle = action === 'Accepted' ? 'Terima Lembur' : 'Tolak Lembur';
  const dialogDescription = `Anda akan ${action === 'Accepted' ? 'menerima' : 'menolak'} catatan lembur untuk ${selectedRecord?.employeeName}.`;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Camera /> Kelola Absensi</CardTitle>
        <CardDescription>
          Verifikasi dan kelola catatan lembur yang diajukan oleh pengguna.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pegawai</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : records.length > 0 ? (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employeeName}</TableCell>
                    <TableCell>
                      {record.checkInTime ? format(new Date(record.checkInTime), "d MMM yyyy", { locale: id }) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : '-'} - {record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : '...'}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.verificationStatus)}</TableCell>
                    <TableCell className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => handleVerifyClick(record, record.verificationStatus === 'Accepted' ? 'Rejected' : 'Accepted')}>
                          Ubah Status
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini akan menghapus catatan lembur untuk <strong>{record.employeeName}</strong> pada tanggal <strong>{record.checkInTime ? format(new Date(record.checkInTime), "d MMM yyyy", { locale: id }) : ''}</strong> secara permanen. Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleConfirmDelete(record.id)} disabled={isDeleting}>
                              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada catatan lembur untuk dikelola.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Verification Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex justify-around gap-4 text-center">
                      <div className="space-y-2">
                          <h4 className="font-semibold">Lokasi Cek In</h4>
                          {selectedRecord?.checkInLocation ? (
                            <>
                              <Button asChild variant="outline">
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.checkInLocation.latitude},${selectedRecord.checkInLocation.longitude}`} target="_blank" rel="noopener noreferrer">
                                      <MapPin className="mr-2 h-4 w-4" /> Lihat Lokasi
                                  </a>
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                {selectedRecord.checkInLocation.latitude.toFixed(6)}, {selectedRecord.checkInLocation.longitude.toFixed(6)}
                              </p>
                            </>
                          ) : <p className="text-sm text-muted-foreground">Tidak ada lokasi</p>}
                      </div>
                      <div className="space-y-2">
                          <h4 className="font-semibold">Lokasi Cek Out</h4>
                          {selectedRecord?.checkOutLocation ? (
                            <>
                              <Button asChild variant="outline">
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.checkOutLocation.latitude},${selectedRecord.checkOutLocation.longitude}`} target="_blank" rel="noopener noreferrer">
                                      <MapPin className="mr-2 h-4 w-4" /> Lihat Lokasi
                                  </a>
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                {selectedRecord.checkOutLocation.latitude.toFixed(6)}, {selectedRecord.checkOutLocation.longitude.toFixed(6)}
                              </p>
                            </>
                          ) : <p className="text-sm text-muted-foreground">Tidak ada lokasi</p>}
                      </div>
                  </div>
                   <div className="grid w-full items-center gap-2">
                        <Label htmlFor="verificationNotes">Catatan (Opsional)</Label>
                        <Textarea 
                          id="verificationNotes" 
                          value={verificationNotes}
                          onChange={(e) => setVerificationNotes(e.target.value)}
                          placeholder="Tambahkan catatan verifikasi..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Batal</Button>
                    </DialogClose>
                    <Button 
                      onClick={handleConfirmVerification} 
                      disabled={isUpdating}
                      className={action === 'Accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    >
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : `Konfirmasi ${action === 'Accepted' ? 'Penerimaan' : 'Penolakan'}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
