
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Camera, MapPin, Clock, Loader2, ArrowLeft, Video, Zap, ThumbsUp, ThumbsDown, Hourglass, History, FileUp, ShieldAlert } from "lucide-react";
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
import { runPhotoValidation } from "@/lib/actions";


type UserDashboardProps = {
  activeRecord: OvertimeRecord | null;
  historyRecords: OvertimeRecord[];
  onCheckIn: (record: Omit<OvertimeRecord, 'id' | 'employeeId' | 'employeeName' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation' | 'verificationStatus' | 'createdAt'>) => Promise<void>;
  onCheckOut: (record: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => Promise<void>;
  userName: string;
};

export function UserDashboard({ activeRecord, historyRecords, onCheckIn, onCheckOut, userName }: UserDashboardProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPurposeDialogOpen, setIsPurposeDialogOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const isCheckedIn = activeRecord?.status === 'Checked In';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast({
        variant: "destructive",
        title: "Kamera Error",
        description: "Tidak bisa mengakses kamera. Mohon berikan izin kamera pada browser.",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera]);


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
    setShowCamera(true);
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
  
      if (context) {
        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
  
        // Draw the video frame onto the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
        // Add timestamp
        const now = new Date();
        const timestamp = format(now, "d MMM yyyy, HH:mm:ss", { locale: id });
        
        // Styling the timestamp
        const fontSize = Math.max(12, Math.floor(canvas.width / 40)); // Responsive font size
        context.font = `bold ${fontSize}px 'PT Sans', sans-serif`;
        context.fillStyle = "rgba(255, 255, 255, 0.8)";
        context.shadowColor = "black";
        context.shadowBlur = 4;
        context.textAlign = 'right';
        const margin = fontSize;
  
        // Draw the timestamp text on the bottom right
        context.fillText(timestamp, canvas.width - margin, canvas.height - margin);
        
        // Get the data URI
        const dataUri = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG with quality
        setPhotoPreview(dataUri);
        setShowCamera(false);
      }
    }
  };

  const resetState = () => {
    setPhotoPreview(null);
    setIsLoading(false);
    setPurpose("");
    setIsPurposeDialogOpen(false);
    setShowCamera(false);
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
      // AI Photo Validation
      const validationResult = await runPhotoValidation(photoPreview);
      if (validationResult.error || !validationResult.isPerson || (validationResult.confidence && validationResult.confidence < 0.7)) {
          toast({
              variant: "destructive",
              title: "Validasi Foto Gagal",
              description: "Sistem mendeteksi foto tidak valid (bukan gambar orang). Mohon ambil foto selfie dengan jelas.",
          });
          setIsLoading(false);
          // Allow user to retake photo
          setPhotoPreview(null);
          setShowCamera(true);
          return;
      }
      toast({
          title: "Validasi Foto Berhasil",
          description: `Foto terverifikasi sebagai gambar orang dengan keyakinan ${Math.round(validationResult.confidence * 100)}%.`,
      });


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
          checkInValidation: validationResult
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

  const renderValidationInfo = (record: OvertimeRecord) => {
    const validation = record.checkInValidation;
    if (!validation) return null;

    if ('error' in validation) {
      return <p className="text-destructive text-xs">Validasi AI gagal: {validation.error}</p>;
    }

    if (!validation.isPerson) {
      return (
         <div className="flex items-center text-yellow-600 text-xs gap-1">
          <ShieldAlert className="h-3 w-3"/>
          <span>AI: Terdeteksi bukan orang ({Math.round(validation.confidence * 100)}%)</span>
        </div>
      );
    }
    return null;
  }

  const renderPreview = () => {
    const confirmButtonText = isCheckedIn ? "Konfirmasi Cek Out" : "Konfirmasi Cek In";
    return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setPhotoPreview(null); setShowCamera(true) }} className="h-8 w-8">
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
            <Button variant="outline" onClick={() => { setPhotoPreview(null); setShowCamera(true) }}>Ambil Ulang Foto</Button>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleConfirm} disabled={isLoading || !location}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2 h-4 w-4" />}
              {isLoading ? "Memvalidasi & Menyimpan..." : confirmButtonText}
            </Button>
          </CardFooter>
        </Card>
      );
  }

  const renderCameraView = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowCamera(false)} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Ambil Foto
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="w-full max-w-sm aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full" onClick={capturePhoto}>
            <Camera className="mr-2 h-5 w-5" /> Ambil Gambar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const renderActionCard = () => {
    const title = isCheckedIn ? "Cek Out Lembur" : "Cek In Lembur";
    const buttonText = isCheckedIn ? "Ambil Foto Cek Out" : "Ambil Foto Cek In";

    if (photoPreview) return renderPreview();
    if (showCamera) return renderCameraView();


    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {isCheckedIn
              ? "Selesaikan sesi lembur Anda dengan mengambil foto."
              : "Mulai sesi lembur Anda dengan mengambil foto selfie."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full h-24 text-lg" onClick={handleTakePhotoClick}>
            <Camera className="mr-4 h-8 w-8" /> {buttonText}
          </Button>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location ? `Koordinat: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Mencari lokasi..."}
            </div>
            {locationError && <p className="text-destructive text-xs">{locationError}</p>}
        </CardFooter>
      </Card>
    );
  };
  
  const renderHistory = () => {
    const checkedOutRecords = historyRecords.filter(r => r.status === 'Checked Out' && r.checkInTime);

    const recordsByMonth = useMemo(() => {
        return checkedOutRecords.reduce((acc, record) => {
            const monthKey = format(parseISO(record.checkInTime!), 'MMMM yyyy', { locale: id });
            if (!acc[monthKey]) {
                acc[monthKey] = [];
            }
            acc[monthKey].push(record);
            return acc;
        }, {} as Record<string, OvertimeRecord[]>);
    }, [checkedOutRecords]);

    const monthKeys = Object.keys(recordsByMonth);

    if (monthKeys.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-6 w-6" /> Riwayat Lembur</CardTitle>
                <CardDescription>Daftar catatan lembur Anda sebelumnya, dikelompokkan per bulan.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue={monthKeys[0]}>
                    {monthKeys.map(month => (
                        <AccordionItem value={month} key={month}>
                            <AccordionTrigger>
                                <span className="font-semibold">{month}</span>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Accordion type="single" collapsible className="w-full space-y-2">
                                    {recordsByMonth[month].map(record => (
                                        <AccordionItem value={record.id} key={record.id} className="border rounded-md px-4">
                                            <AccordionTrigger>
                                                <div className="flex justify-between w-full pr-4 items-center">
                                                    <div className="flex flex-col text-left">
                                                        <span>{format(parseISO(record.checkInTime!), "eeee, d MMM yyyy", { locale: id })}</span>
                                                        {renderValidationInfo(record)}
                                                    </div>
                                                    {renderVerificationStatus(record.verificationStatus)}
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-sm pt-2">
                                                 <p><strong>Keterangan:</strong> {record.purpose}</p>
                                                 <p>
                                                    <strong>Durasi:</strong> {record.checkInTime && record.checkOutTime ? 
                                                      formatDistanceToNow(parseISO(record.checkOutTime), { locale: id, addSuffix: false }) + ` (dari ${format(parseISO(record.checkInTime), 'HH:mm')} s/d ${format(parseISO(record.checkOutTime), 'HH:mm')})`
                                                      : 'N/A'}
                                                  </p>
                                                {record.verificationNotes && <p className="text-muted-foreground italic"><strong>Catatan Admin:</strong> {record.verificationNotes}</p>}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
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

    