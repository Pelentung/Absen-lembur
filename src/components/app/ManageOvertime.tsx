
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Check, X, MapPin } from "lucide-react";
import type { OvertimeRecord, VerificationStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type ManageOvertimeProps = {
  records: OvertimeRecord[];
  onUpdateStatus: (recordId: string, status: VerificationStatus, notes?: string) => void;
};

export function ManageOvertime({ records = [], onUpdateStatus }: ManageOvertimeProps) {
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [action, setAction] = useState<"Accepted" | "Rejected" | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
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
          Verifikasi catatan lembur yang diajukan oleh pengguna.
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
              {records.length > 0 ? (
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
                        {record.verificationStatus === 'Pending' ? (
                            <>
                                <Button variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 text-green-800 border-green-200" onClick={() => handleVerifyClick(record, 'Accepted')}>
                                    <Check className="mr-2 h-4 w-4" /> Terima
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleVerifyClick(record, 'Rejected')}>
                                    <X className="mr-2 h-4 w-4" /> Tolak
                                </Button>
                            </>
                        ) : (
                             <Button variant="outline" size="sm" onClick={() => handleVerifyClick(record, record.verificationStatus === 'Accepted' ? 'Rejected' : 'Accepted')}>
                                Ubah Status
                            </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada catatan lembur untuk diverifikasi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Verification Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex justify-around gap-4 text-center">
                        {selectedRecord?.checkInLocation && (
                            <div>
                                <h4 className="font-semibold mb-2">Lokasi Cek In</h4>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.checkInLocation.latitude},${selectedRecord.checkInLocation.longitude}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <MapPin className="h-4 w-4" />
                                  <span>Lihat di Peta</span>
                                </a>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {selectedRecord.checkInLocation.latitude.toFixed(5)}, {selectedRecord.checkInLocation.longitude.toFixed(5)}
                                </p>
                            </div>
                        )}
                        {selectedRecord?.checkOutLocation && (
                             <div>
                                <h4 className="font-semibold mb-2">Lokasi Cek Out</h4>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.checkOutLocation.latitude},${selectedRecord.checkOutLocation.longitude}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <MapPin className="h-4 w-4" />
                                  <span>Lihat di Peta</span>
                                </a>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {selectedRecord.checkOutLocation.latitude.toFixed(5)}, {selectedRecord.checkOutLocation.longitude.toFixed(5)}
                                </p>
                            </div>
                        )}
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
