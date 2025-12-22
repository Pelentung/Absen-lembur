
"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Edit, UserPlus, Users } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type ManageUsersProps = {
  users: UserProfile[];
  onUpdateUser: (updatedUser: Partial<UserProfile> & { id: string }) => void;
  onDeleteUser: (userId: string) => void;
};

export function ManageUsers({ users, onUpdateUser, onDeleteUser }: ManageUsersProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const [editedFields, setEditedFields] = useState({
      name: '',
      nip: '',
      pangkat: '',
      jabatan: ''
  });

  const handleEditClick = (user: UserProfile) => {
    setSelectedUser(user);
    setEditedFields({
        name: user.name,
        nip: user.nip,
        pangkat: user.pangkat ?? '',
        jabatan: user.jabatan,
    })
    setIsEditUserDialogOpen(true);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setEditedFields(prev => ({ ...prev, [id]: value }));
  }

  const handleUpdateUser = async () => {
      if (!selectedUser) return;
      setIsUpdating(true);
      try {
          const updatedData = {
              id: selectedUser.id,
              ...editedFields
          };
          onUpdateUser(updatedData);
          toast({ title: "Sukses", description: "Data pengguna berhasil diperbarui."});
          setIsEditUserDialogOpen(false);
          setSelectedUser(null);
      } catch (error) {
          console.error("Update error:", error);
          toast({ variant: "destructive", title: "Gagal", description: "Tidak dapat memperbarui data pengguna." });
      } finally {
          setIsUpdating(false);
      }
  }

  const handleDeleteUser = async (userId: string) => {
      setIsDeleting(true);
       try {
          onDeleteUser(userId);
          toast({ title: "Sukses", description: "Pengguna berhasil dihapus."});
      } catch (error) {
           console.error("Delete error:", error);
          toast({ variant: "destructive", title: "Gagal", description: "Tidak dapat menghapus pengguna." });
      } finally {
          setIsDeleting(false);
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users /> Kelola Pengguna</CardTitle>
        <CardDescription>
          Edit dan hapus data profil pengguna sistem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.nip}</TableCell>
                    <TableCell>{user.jabatan}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isDeleting}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini akan menghapus data profil pengguna dari database, namun tidak menghapus akun login mereka. Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                {isDeleting ? <Loader2 className="animate-spin" /> : "Hapus"}
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
                    Tidak ada data pengguna untuk ditampilkan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Pengguna</DialogTitle>
                    <DialogDescription>
                        Ubah detail profil untuk {selectedUser?.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nama</Label>
                        <Input id="name" value={editedFields.name} onChange={handleFieldChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nip" className="text-right">NIP</Label>
                        <Input id="nip" value={editedFields.nip} onChange={handleFieldChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pangkat" className="text-right">Pangkat</Label>
                        <Input id="pangkat" value={editedFields.pangkat} onChange={handleFieldChange} className="col-span-3" placeholder="(Opsional)" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="jabatan" className="text-right">Jabatan</Label>
                        <Input id="jabatan" value={editedFields.jabatan} onChange={handleFieldChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Batal</Button>
                    </DialogClose>
                    <Button onClick={handleUpdateUser} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Simpan Perubahan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
