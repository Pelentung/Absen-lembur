"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, MapPin, Clock, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fileToDataUri } from "@/lib/utils";
import type { OvertimeRecord, GeoLocation } from "@/lib/types";

type UserDashboardProps = {
  activeRecord: OvertimeRecord | null;
  onCheckIn: (record: Omit<OvertimeRecord, 'id' | 'status' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => void;
  onCheckOut: (record: Pick<OvertimeRecord, 'id' | 'checkOutTime' | 'checkOutPhoto' | 'checkOutLocation'>) => void;
};

export function UserDashboard({ activeRecord, onCheckIn, onCheckOut }: UserDashboardProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isCheckedIn = activeRecord?.status === 'Checked In';

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const resetState = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!photoFile || !location) {
      toast({
        variant: "destructive",
        title: "Data Tidak Lengkap",
        description: "Foto dan lokasi dibutuhkan untuk melanjutkan.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const photoDataUri = await fileToDataUri(photoFile);
      const now = new Date();

      if (isCheckedIn && activeRecord) {
        onCheckOut({
          id: activeRecord.id,
          checkOutTime: now,
          checkOutPhoto: photoDataUri,
          checkOutLocation: location,
        });
        toast({ title: "Sukses Cek Out", description: `Anda berhasil cek out pada ${now.toLocaleTimeString()}` });
      } else {
        onCheckIn({
          employeeName: "Pengguna Demo",
          checkInTime: now,
          checkInPhoto: photoDataUri,
          checkInLocation: location,
        });
        toast({ title: "Sukses Cek In", description: `Anda berhasil cek in pada ${now.toLocaleTimeString()}` });
      }
      resetState();
    } catch (error) {
      console.error("Submit error:", error);
      toast({ variant: "destructive", title: "Terjadi Kesalahan", description: "Gagal menyimpan data." });
      setIsLoading(false);
    }
  };

  const renderActionCard = () => {
    const title = isCheckedIn ? "Cek Out Lembur" : "Cek In Lembur";
    const buttonText = isCheckedIn ? "Ambil Foto Cek Out" : "Ambil Foto Cek In";
    const confirmButtonText = isCheckedIn ? "Konfirmasi Cek Out" : "Konfirmasi Cek In";

    if (photoPreview) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={resetState} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Konfirmasi Foto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative w-64 h-64 rounded-lg overflow-hidden border-2 border-primary">
              <Image src={photoPreview} alt="Preview" layout="fill" objectFit="cover" />
            </div>
            <Button variant="outline" onClick={triggerFileSelect}>Ganti Foto</Button>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={isLoading || !location}>
              {isLoading ? <Loader2 className="animate-spin" /> : confirmButtonText}
            </Button>
          </CardFooter>
        </Card>
      );
    }

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
          <Button size="lg" className="w-full h-24 text-lg" onClick={triggerFileSelect}>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Status Kehadiran</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 text-lg">
          {isCheckedIn ? (
            <>
              <Clock className="h-6 w-6 text-primary" />
              <span>
                Sudah Cek In pada{" "}
                <span className="font-bold text-primary">
                  {activeRecord?.checkInTime?.toLocaleTimeString()}
                </span>
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Anda belum melakukan Cek In.</span>
          )}
        </CardContent>
      </Card>

      {renderActionCard()}

      <input
        type="file"
        accept="image/*"
        capture="user"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
