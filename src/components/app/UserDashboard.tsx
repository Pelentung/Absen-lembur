
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Camera, MapPin, Clock, Loader2, ArrowLeft, Video, Zap, ThumbsUp, ThumbsDown, Hourglass, History, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { OvertimeRecord, GeoLocation, VerificationStatus } from "@/lib/types";
import { Badge } from "../ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";


type UserDashboardProps = {
  activeRecord: OvertimeRecord | null;
  historyRecords: OvertimeRecord[];
  onCheckIn: (record: Omit<OvertimeRecord, 'id' | 'employeeId' | 'employeeName' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation' | 'verificationStatus' | 'createdAt'>) => Promise<void>;
  onCheckOut: (record: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => Promise<void>;
  userName: string;
};

export function UserDashboard({ activeRecord, historyRecords, onCheckIn, onCheckOut, userName }: UserDashboardProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPurposeDialogOpen, setIsPurposeDialogOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isCheckedIn = activeRecord?.status === 'Checked In';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Gagal mendapatkan lokasi. Pastikan izin lokasi telah diberikan.");
          toast({
            variant: "destructive",
            title: "Error Lokasi",
            description: "Tidak bisa mendapatkan lokasi. Mohon aktifkan GPS dan berikan izin lokasi pada browser.",
          });
        }
      );
    } else {
      setLocationError("Geolocation tidak didukung oleh browser ini.");
    }
  }, [toast]);

  const handleTakePhotoClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              setPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const resetState = () => {
    setPhotoPreview(null);
    setIsLoading(false);
    setPurpose("");
    setIsPurposeDialogOpen(false);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    if (isCheckedIn) {
      handleSubmit();
    } else {
      setIsPurposeDialogOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!photoPreview || !location) {
      toast({
        variant: "destructive",
        title: "Data Tidak Lengkap",
        description: "Foto dan lokasi dibutuhkan untuk melanjutkan.",
      });
      return;
    }
    
    if (!isCheckedIn && !purpose) {
        toast({
          variant: "destructive",
          title: "Keterangan Lembur Diperlukan",
          description: "Mohon isi keterangan lembur Anda.",
        });
        setIsPurposeDialogOpen(true);
        return;
    }

    setIsLoading(true);
    setIsPurposeDialogOpen(false);

    try {
      const now = new Date().toISOString();

      if (isCheckedIn && activeRecord) {
        await onCheckOut({
          id: activeRecord.id,
          checkOutTime: now,
          checkOutPhoto: photoPreview,
          checkOutLocation: location,
        });
        toast({ title: "Sukses Cek Out", description: `Anda berhasil cek out pada ${new Date(now).toLocaleTimeString()}` });
      } else {
        await onCheckIn({
          checkInTime: now,
          checkInPhoto: photoPreview,
          checkInLocation: location,
          purpose: purpose,
        });
        toast({ title: "Sukses Cek In", description: `Anda berhasil cek in pada ${new Date(now).toLocaleTimeString()}` });
      }
      resetState();
    } catch (error) {
      console.error("Submit error:", error);
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Gagal menyimpan data." });
      setIsLoading(false);
    }
  };

  const renderVerificationStatus = (status: VerificationStatus) => {
    switch (status) {
      case 'Accepted':
        return <Badge className="bg-green-600 hover:bg-green-700"><ThumbsUp className="mr-1 h-3 w-3" /> Diterima</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><ThumbsDown className="mr-1 h-3 w-3" /> Ditolak</Badge>;
      case 'Pending':
      default:
        return <Badge variant="secondary"><Hourglass className="mr-1 h-3 w-3" /> Pending</Badge>;
    }
  };

  const renderPreview = () => {
    const confirmButtonText = isCheckedIn ? "Konfirmasi Cek Out" : "Konfirmasi Cek In";
    return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setPhotoPreview(null) }} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Konfirmasi Foto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {photoPreview &&
              <div className="relative w-64 h-64 rounded-lg overflow-hidden border-2 border-primary">
                <Image src={photoPreview} alt="Preview" layout="fill" objectFit="cover" />
              </div>
            }
            <Button variant="outline" onClick={handleTakePhotoClick}>Ambil Ulang Foto</Button>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleConfirm} disabled={isLoading || !location}>
              {isLoading ? <Loader2 className="animate-spin" /> : confirmButtonText}
            </Button>
          </CardFooter>
        </Card>
      );
  }

  const renderActionCard = () => {
    const title = isCheckedIn ? "Cek Out Lembur" : "Cek In Lembur";
    const buttonText = isCheckedIn ? "Ambil Foto Cek Out" : "Ambil Foto Cek In";

    if (photoPreview) return renderPreview();

    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {isCheckedIn
              ? "Selesaikan sesi lembur Anda dengan mengambil foto."
              : "Mulai sesi lembur Anda dengan mengambil foto."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            capture="user"
          />
          <Button size="lg" className="w-full h-24 text-lg" onClick={handleTakePhotoClick}>
            <Camera className="mr-4 h-8 w-8" /> {buttonText}
          </Button>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location ? `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` : "Mencari lokasi..."}
            </div>
            {locationError && <p className="text-destructive text-xs">{locationError}</p>}
        </CardFooter>
      </Card>
    );
  };
  
  const renderHistory = () => {
    const checkedOutRecords = historyRecords.filter(r => r.status === 'Checked Out');
    if (checkedOutRecords.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-6 w-6" /> Riwayat Lembur</CardTitle>
          <CardDescription>Daftar catatan lembur Anda sebelumnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {checkedOutRecords.map(record => (
              <AccordionItem value={record.id} key={record.id}>
                <AccordionTrigger>
                  <div className="flex justify-between w-full pr-4 items-center">
                    <span>{record.checkInTime ? format(new Date(record.checkInTime), "eeee, d MMM yyyy", { locale: id }) : 'Invalid Date'}</span>
                    {renderVerificationStatus(record.verificationStatus)}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p><strong>Keterangan:</strong> {record.purpose}</p>
                  <p><strong>Durasi:</strong> {record.checkInTime && record.checkOutTime ? formatDistanceToNow(new Date(record.checkOutTime), { locale: id, addSuffix: true }).replace('yang lalu', '') + ` dari ${formatDistanceToNow(new Date(record.checkInTime), { locale: id, addSuffix: false })}` : 'N/A'}</p>
                  <p><strong>Cek In:</strong> {record.checkInTime ? new Date(record.checkInTime).toLocaleString('id-ID') : '-'}</p>
                  <p><strong>Cek Out:</strong> {record.checkOutTime ? new Date(record.checkOutTime).toLocaleString('id-ID') : '-'}</p>
                  {record.verificationNotes && <p className="text-muted-foreground italic"><strong>Catatan Admin:</strong> {record.verificationNotes}</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Waktu Saat Ini</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-3xl font-bold tracking-wider">{format(currentDate, "HH:mm:ss")}</p>
            <p className="text-muted-foreground">{format(currentDate, "eeee, d MMMM yyyy", { locale: id })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Kehadiran</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 text-lg">
          {isCheckedIn && activeRecord?.checkInTime ? (
            <>
              <Clock className="h-6 w-6 text-primary" />
              <span>
                Sudah Cek In pada{" "}
                <span className="font-bold text-primary">
                  {new Date(activeRecord.checkInTime).toLocaleTimeString()}
                </span>
                {activeRecord?.purpose && (
                    <div className="text-sm text-muted-foreground">Keterangan: {activeRecord.purpose}</div>
                )}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Anda belum melakukan Cek In.</span>
          )}
        </CardContent>
      </Card>

      {renderActionCard()}

      {renderHistory()}

      <Dialog open={isPurposeDialogOpen} onOpenChange={setIsPurposeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Keterangan Lembur</DialogTitle>
            <DialogDescription>
              Mohon isi keterangan Anda melakukan lembur hari ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purpose" className="text-right">
                Keterangan
              </Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="col-span-3"
                placeholder="Contoh: Menyelesaikan laporan bulanan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isLoading || !purpose}>
              {isLoading ? <Loader2 className="animate-spin" /> : "Kirim & Cek In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
