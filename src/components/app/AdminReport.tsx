
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown, Search, XCircle } from "lucide-react";
import type { OvertimeRecord, UserProfile, VerificationStatus } from "@/lib/types";

type AdminReportProps = {
  records: OvertimeRecord[];
  users: UserProfile[];
};

export function AdminReport({ records = [], users = [] }: AdminReportProps) {
  const [filterName, setFilterName] = useState("all");
  const [filterPurpose, setFilterPurpose] = useState("");

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const nameMatch = filterName === "all" || record.employeeId === filterName;
      const purposeMatch =
        filterPurpose === "" ||
        (record.purpose && record.purpose.toLowerCase().includes(filterPurpose.toLowerCase()));
      return nameMatch && purposeMatch;
    });
  }, [records, filterName, filterPurpose]);

  const handleExport = () => {
    const dataToExport = filteredRecords.map((record) => ({
      "Nama Pegawai": record.employeeName,
      "Tanggal": record.checkInTime ? format(new Date(record.checkInTime), "d MMM yyyy", { locale: id }) : "",
      "Waktu Check-In": record.checkInTime ? format(new Date(record.checkInTime), "HH:mm:ss") : "",
      "Waktu Check-Out": record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm:ss") : "",
      "Keterangan Lembur": record.purpose || "",
      "Status Verifikasi": record.verificationStatus,
      "Catatan Verifikasi": record.verificationNotes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Lembur");
    XLSX.writeFile(workbook, `Laporan Lembur - ${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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

  const clearFilters = () => {
    setFilterName("all");
    setFilterPurpose("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <FileDown /> Laporan Rekapitulasi Lembur
            </div>
            <Button onClick={handleExport} disabled={filteredRecords.length === 0}>
                <FileDown className="mr-2 h-4 w-4" /> Ekspor ke Excel
            </Button>
        </CardTitle>
        <CardDescription>
          Filter dan ekspor rekapitulasi data lembur pegawai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Nama Pegawai</label>
                <Select value={filterName} onValueChange={setFilterName}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Pegawai" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Pegawai</SelectItem>
                        {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Keterangan Lembur</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari berdasarkan keterangan..."
                        value={filterPurpose}
                        onChange={(e) => setFilterPurpose(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
            <div className="flex items-end">
                 <Button variant="outline" onClick={clearFilters} className="h-10">
                    <XCircle className="mr-2 h-4 w-4" /> Bersihkan Filter
                </Button>
            </div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pegawai</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employeeName}</TableCell>
                    <TableCell>
                      {record.checkInTime ? format(new Date(record.checkInTime), "d MMM yyyy", { locale: id }) : '-'}
                    </TableCell>
                     <TableCell>
                      {record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : '-'} - {record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : '...'}
                    </TableCell>
                    <TableCell>{record.purpose}</TableCell>
                    <TableCell>{getStatusBadge(record.verificationStatus)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada data yang cocok dengan filter Anda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
