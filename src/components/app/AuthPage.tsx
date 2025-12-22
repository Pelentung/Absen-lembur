'use client';

import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Logo } from './Logo';
import { Loader2 } from 'lucide-react';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [pangkat, setPangkat] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const { db } = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleAuthAction = async (action: 'login' | 'register') => {
    setIsLoading(true);
    try {
      if (action === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login Berhasil!' });
        router.push('/');
      } else {
        if (!name || !nip || !jabatan) {
          toast({
            variant: 'destructive',
            title: 'Data tidak lengkap',
            description: 'Mohon isi semua bidang yang wajib diisi.',
          });
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;
        const normalizedJabatan = jabatan.trim().toUpperCase();
        const role = normalizedJabatan === 'ADMIN' ? 'Admin' : 'User';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: name,
          nip: nip,
          pangkat: pangkat,
          jabatan: jabatan,
          role: role,
        });

        toast({ title: 'Pendaftaran Berhasil!', description: 'Anda akan dialihkan ke halaman utama.' });
        router.push('/');
      }
    } catch (error: any) {
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error.code === 'auth/invalid-credential') {
        description = 'Email atau password yang Anda masukkan salah. Mohon periksa kembali.';
      } else if (error.code === 'auth/email-already-in-use') {
        description = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Terjadi Kesalahan',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-4 mb-8">
        <Logo className="h-16 w-16 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">ABSENSI LEMBUR</h1>
          <p className="text-muted-foreground">Dinas Perumahan Kawasan Permukiman Cipta Karya dan Tata Ruang Kota Medan</p>
        </div>
      </div>
      <Tabs defaultValue="login" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Masuk</TabsTrigger>
          <TabsTrigger value="register">Daftar</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Masuk</CardTitle>
              <CardDescription>
                Masuk ke akun Anda untuk melanjutkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAuthAction('login')} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Masuk'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Daftar</CardTitle>
              <CardDescription>
                Buat akun baru untuk mulai menggunakan aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="register-name">Nama Lengkap</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="register-nip">NIP</Label>
                <Input
                  id="register-nip"
                  type="text"
                  placeholder="Nomor Induk Pegawai"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="register-pangkat">Pangkat/Golongan (Opsional)</Label>
                <Input
                  id="register-pangkat"
                  type="text"
                  placeholder="Contoh: Penata Muda / IIIa"
                  value={pangkat}
                  onChange={(e) => setPangkat(e.target.value)}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="register-jabatan">Jabatan</Label>
                <Input
                  id="register-jabatan"
                  type="text"
                  placeholder="Jabatan Anda"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAuthAction('register')} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Daftar'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
