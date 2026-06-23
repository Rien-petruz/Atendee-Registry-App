import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Search, Users, UserPlus, UserCheck, Download,
  ArrowUpDown, ChevronLeft, ChevronRight, Filter, Plus, Calendar, CalendarDays, Upload,
  MoreHorizontal, Trash2, CalendarX, CheckCircle, AlertCircle, Loader
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import {
  useGetAttendees,
  useExportAttendees,
  useAdminAddAttendee,
  useImportAttendees,
  useDeleteAttendee,
  useDeleteAttendance,
  getGetAttendeesQueryKey,
  getExportAttendeesQueryKey,
  GetAttendeesFilter,
  GetAttendeesSort,
  ImportAttendeeRow,
  Attendee
} from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const addAttendeeSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
});

type AddAttendeeValues = z.infer<typeof addAttendeeSchema>;

export function AddAttendeeDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { mutate: addAttendee, isPending } = useAdminAddAttendee(getApiOptions());
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [isNewcomer, setIsNewcomer] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [emailValidation, setEmailValidation] = useState<{ status?: string; isValid?: boolean; validating?: boolean }>({});
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  const yearRange = Array.from({ length: 11 }, (_, i) => now.getFullYear() - i);

  const validateEmailAsync = async (emailValue: string) => {
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailValidation({});
      return;
    }

    setEmailValidation({ validating: true });
    try {
      const response = await fetch(`${getApiOptions().baseURL}/attendees/validate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const result = await response.json();
      setEmailValidation({
        isValid: result.isValid,
        status: result.status,
        validating: false,
      });
    } catch (err) {
      setEmailValidation({ validating: false });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => validateEmailAsync(value), 500);
  };

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    };
  }, []);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AddAttendeeValues>({
    resolver: zodResolver(addAttendeeSchema),
  });

  const watchEmail = watch("email");

  const onSubmit = (data: AddAttendeeValues) => {
    addAttendee(
      {
        data: {
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber || "—",
          isNewcomer,
          month,
          year,
        },
      },
      {
        onSuccess: (result: any) => {
          const monthLabel = MONTHS[month - 1];
          const desc = result?.created
            ? `${data.fullName} added (attendance for ${monthLabel} ${year}).`
            : result?.attendanceAdded
              ? `${data.fullName} already existed — attendance recorded for ${monthLabel} ${year}.`
              : `${data.fullName} already had attendance for ${monthLabel} ${year}.`;
          toast({ title: "Attendee saved", description: desc });
          reset();
          setIsNewcomer(false);
          setMonth(now.getMonth() + 1);
          setYear(now.getFullYear());
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Failed to add attendee.", variant: "destructive" });
        },
      }
    );
  };

  const handleClose = () => { reset(); setIsNewcomer(false); setEmail(""); setEmailValidation({}); onClose(); };
  // Allow submission if email format is valid; API will do full ZeroBounce validation
  const emailFormatValid = watchEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchEmail);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-white/10 max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            Add Attendee
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add an attendee and record attendance for a specific month. Use this to backfill historical data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="add-fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input id="add-fullName" placeholder="e.g. John Smith" {...register("fullName")}
              className={`bg-black/30 border-white/10 ${errors.fullName ? "border-destructive" : ""}`} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-email">Email Address <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input id="add-email" type="email" placeholder="e.g. john@example.com" {...register("email")}
                onChange={(e) => { e.currentTarget.onchange?.call(e.currentTarget); handleEmailChange(e); }}
                className={`bg-black/30 border-white/10 pr-10 ${errors.email ? "border-destructive" : emailValidation.isValid === true ? "border-green-500" : emailValidation.isValid === false ? "border-destructive" : ""}`} />
              {emailValidation.validating && (
                <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
              {emailValidation.isValid === true && !emailValidation.validating && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {emailValidation.isValid === false && !emailValidation.validating && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            {emailValidation.isValid === false && <p className="text-xs text-destructive">Email appears invalid ({emailValidation.status})</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-phone">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="add-phone" placeholder="e.g. +1 555 000 0000" {...register("phoneNumber")} className="bg-black/30 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Attendance Month <span className="text-destructive">*</span></Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Attendance Year <span className="text-destructive">*</span></Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearRange.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div>
              <Label htmlFor="add-newcomer" className="cursor-pointer">Newcomer</Label>
              <p className="text-xs text-muted-foreground">First-time attendee (vs. returning).</p>
            </div>
            <Switch id="add-newcomer" checked={isNewcomer} onCheckedChange={setIsNewcomer} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-white/10" onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="gradient" className="flex-1" isLoading={isPending} disabled={!emailFormatValid || isPending}>Add Attendee</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CSV_TEMPLATE = "fullName,email,phoneNumber,isNewcomer,month,year\nJohn Doe,john@example.com,+15555550100,false,3,2024\nJane Smith,jane@example.com,+15555550101,true,3,2024\n";

function parseCsv(text: string): { rows: ImportAttendeeRow[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  const rows: ImportAttendeeRow[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows, parseErrors: ["File is empty"] };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["fullname", "email", "phonenumber", "isnewcomer", "month", "year"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) {
    parseErrors.push(`Missing columns: ${missing.join(", ")}`);
    return { rows, parseErrors };
  }
  const idx = (col: string) => header.indexOf(col);

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    if (cells.length < header.length) {
      parseErrors.push(`Row ${i + 1}: not enough columns`);
      continue;
    }
    rows.push({
      fullName: cells[idx("fullname")],
      email: cells[idx("email")],
      phoneNumber: cells[idx("phonenumber")],
      isNewcomer: cells[idx("isnewcomer")].toLowerCase() === "true",
      month: Number(cells[idx("month")]),
      year: Number(cells[idx("year")]),
    });
  }
  return { rows, parseErrors };
}

export function BulkImportDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { mutate: importAttendees, isPending } = useImportAttendees(getApiOptions());
  const [parsed, setParsed] = useState<{ rows: ImportAttendeeRow[]; parseErrors: string[] } | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<any>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseCsv(text));
    setResult(null);
  };

  const handleSubmit = () => {
    if (!parsed || parsed.rows.length === 0) return;
    importAttendees(
      { data: { rows: parsed.rows } },
      {
        onSuccess: (r: any) => {
          setResult(r);
          toast({
            title: "Import complete",
            description: `${r.createdAttendees} new attendees, ${r.attendancesAdded} attendance rows, ${r.skipped} skipped.`,
          });
          onSuccess();
        },
        onError: (err: any) => {
          toast({ title: "Import failed", description: err?.message || "Failed to import.", variant: "destructive" });
        },
      }
    );
  };

  const reset = () => { setParsed(null); setFileName(""); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "attendees-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-white/10 max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            Bulk Import Attendees
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a CSV with columns: fullName, email, phoneNumber, isNewcomer, month, year. Each row creates an attendee (if new) and records an attendance for the given month/year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20 file:cursor-pointer"
            />
            <Button type="button" variant="outline" className="border-white/10 shrink-0" onClick={downloadTemplate}>
              Download template
            </Button>
          </div>

          {fileName && <p className="text-xs text-muted-foreground">Selected: <span className="text-foreground">{fileName}</span></p>}

          {parsed && parsed.parseErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-medium mb-1">CSV parse errors:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {parsed.parseErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {parsed.parseErrors.length > 5 && <li>...and {parsed.parseErrors.length - 5} more</li>}
              </ul>
            </div>
          )}

          {parsed && parsed.rows.length > 0 && !result && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-medium mb-2">Preview: {parsed.rows.length} rows ready</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr><th className="text-left py-1 pr-3">Name</th><th className="text-left py-1 pr-3">Email</th><th className="text-left py-1 pr-3">Newcomer</th><th className="text-left py-1 pr-3">Month/Year</th></tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-1 pr-3">{r.fullName}</td>
                        <td className="py-1 pr-3">{r.email}</td>
                        <td className="py-1 pr-3">{r.isNewcomer ? "Yes" : "No"}</td>
                        <td className="py-1 pr-3">{r.month}/{r.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && <p className="text-xs text-muted-foreground mt-1">...and {parsed.rows.length - 5} more.</p>}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Total rows:</span> <span className="font-medium">{result.totalRows}</span></p>
              <p><span className="text-muted-foreground">New attendees created:</span> <span className="font-medium text-emerald-400">{result.createdAttendees}</span></p>
              <p><span className="text-muted-foreground">Attendance records added:</span> <span className="font-medium text-blue-400">{result.attendancesAdded}</span></p>
              <p><span className="text-muted-foreground">Skipped (invalid):</span> <span className="font-medium text-destructive">{result.skipped}</span></p>
              {result.errors?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">View {result.errors.length} error(s)</summary>
                  <ul className="mt-2 text-xs space-y-0.5 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 50).map((e: any, i: number) => (
                      <li key={i}>Row {e.rowNumber}: {e.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-white/10" onClick={handleClose}>{result ? "Close" : "Cancel"}</Button>
            <Button
              type="button"
              variant="gradient"
              className="flex-1"
              isLoading={isPending}
              disabled={!parsed || parsed.rows.length === 0 || !!result || parsed.parseErrors.length > 0}
              onClick={handleSubmit}
            >
              Import {parsed?.rows.length || 0} rows
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type DeleteConfirm =
  | { kind: "attendee"; attendee: Attendee }
  | { kind: "attendance"; attendee: Attendee; month: number; year: number }
  | null;

function RowActions({
  attendee, month, year, onRequestDelete,
}: {
  attendee: Attendee;
  month: number;
  year: number;
  onRequestDelete: (req: Exclude<DeleteConfirm, null>) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" aria-label="Row actions">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onSelect={() => onRequestDelete({ kind: "attendance", attendee, month, year })}
        >
          <CalendarX className="w-4 h-4" />
          Remove from {MONTHS[month - 1]} {year}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => onRequestDelete({ kind: "attendee", attendee })}
        >
          <Trash2 className="w-4 h-4" />
          Delete attendee
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Dashboard() {
  const now = new Date();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<GetAttendeesFilter>("all");
  const [sort, setSort] = useState<GetAttendeesSort>("newest");
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteConfirm>(null);
  const { toast: deleteToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const limit = 10;

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const apiOpts = getApiOptions();
  const { mutate: deleteAttendee, isPending: isDeletingAttendee } = useDeleteAttendee(apiOpts);
  const { mutate: deleteAttendance, isPending: isDeletingAttendance } = useDeleteAttendance(apiOpts);
  const isDeleting = isDeletingAttendee || isDeletingAttendance;

  const { data, isLoading } = useGetAttendees(
    {
      page, limit, filter: filter !== "all" ? filter : undefined,
      sort, search: debouncedSearch || undefined,
      month: selectedMonth, year: selectedYear,
    },
    apiOpts
  );

  const { data: allTimeStats } = useGetAttendees({ filter: "all", limit: 1 }, apiOpts);
  const { data: monthAllStats } = useGetAttendees({ filter: "all", limit: 1, month: selectedMonth, year: selectedYear }, apiOpts);
  const { data: monthNewStats } = useGetAttendees({ filter: "newcomers", limit: 1, month: selectedMonth, year: selectedYear }, apiOpts);
  const { data: monthRetStats } = useGetAttendees({ filter: "returning", limit: 1, month: selectedMonth, year: selectedYear }, apiOpts);

  const { refetch: exportCsv, isFetching: isExporting } = useExportAttendees(
    { filter: filter !== "all" ? filter : undefined },
    { ...apiOpts, query: { enabled: false, queryKey: getExportAttendeesQueryKey({ filter: filter !== "all" ? filter : undefined }) } }
  );

  const handleExport = async () => {
    const res = await exportCsv();
    if (res.data) {
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendees-${filter}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
    }
  };

  const handleAttendeeAdded = () => {
    queryClient.invalidateQueries({ queryKey: getGetAttendeesQueryKey() });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "attendee") {
      deleteAttendee(
        { id: pendingDelete.attendee.id },
        {
          onSuccess: () => {
            deleteToast({ title: "Attendee deleted", description: `${pendingDelete.attendee.fullName} and all attendance history removed.` });
            setPendingDelete(null);
            handleAttendeeAdded();
          },
          onError: (err: any) => {
            deleteToast({ title: "Delete failed", description: err?.message || "Could not delete attendee.", variant: "destructive" });
          },
        }
      );
    } else {
      deleteAttendance(
        { id: pendingDelete.attendee.id, data: { month: pendingDelete.month, year: pendingDelete.year } },
        {
          onSuccess: () => {
            deleteToast({
              title: "Attendance removed",
              description: `${pendingDelete.attendee.fullName} removed from ${MONTHS[pendingDelete.month - 1]} ${pendingDelete.year}.`,
            });
            setPendingDelete(null);
            handleAttendeeAdded();
          },
          onError: (err: any) => {
            deleteToast({ title: "Delete failed", description: err?.message || "Could not remove attendance.", variant: "destructive" });
          },
        }
      );
    }
  };

  const currentYearRange = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const statCards = [
    {
      label: "All-Time Attendees",
      value: allTimeStats?.total ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: null,
    },
    {
      label: `${MONTHS[selectedMonth - 1]} Total`,
      value: monthAllStats?.total ?? 0,
      icon: CalendarDays,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      badge: null,
    },
    {
      label: `${MONTHS[selectedMonth - 1]} Newcomers`,
      value: monthNewStats?.total ?? 0,
      icon: UserPlus,
      color: "text-accent",
      bg: "bg-accent/10",
      badge: null,
    },
    {
      label: `${MONTHS[selectedMonth - 1]} Returning`,
      value: monthRetStats?.total ?? 0,
      icon: UserCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      badge: null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage and view your church attendees.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
          <Button onClick={() => setShowAddDialog(true)} variant="gradient" size="sm" className="gap-2 flex-1 sm:flex-initial sm:size-default">
            <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Add Attendee</span>
          </Button>
          <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial sm:size-default border-white/10 hover:bg-white/5">
            <Upload className="w-4 h-4" /> <span className="whitespace-nowrap">Bulk Import</span>
          </Button>
          <Button onClick={handleExport} isLoading={isExporting} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial sm:size-default border-white/10 hover:bg-white/5">
            <Download className="w-4 h-4" /> <span className="whitespace-nowrap">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Month / Year Selector */}
      <Card className="glass-panel border-white/5">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Viewing month:
          </div>
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 overflow-x-auto">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => { setSelectedMonth(i + 1); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${selectedMonth === i + 1 ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
            {currentYearRange.map((y) => (
              <button
                key={y}
                onClick={() => { setSelectedYear(y); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedYear === y ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
              >
                {y}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="glass-panel border-white/5">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground leading-tight">{stat.label}</p>
                <h3 className="text-3xl font-display font-bold mt-2">{stat.value.toLocaleString()}</h3>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel border-white/5 overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-black/40 border-white/5"
            />
          </div>

          <div className="flex w-full lg:w-auto items-center gap-3 overflow-x-auto pb-2 lg:pb-0">
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              {(["all", "newcomers", "returning"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${filter === f ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sort === "newest" ? "Newest First" : "Oldest First"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Registered Date</th>
                <th className="px-6 py-4 font-medium w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-48"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-white/5 rounded w-20"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-6"></div></td>
                  </tr>
                ))
              ) : data?.attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No attendees found for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                    <p className="text-sm mt-1 opacity-60">Try a different month, filter, or add one manually.</p>
                  </td>
                </tr>
              ) : (
                data?.attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{attendee.fullName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{attendee.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">{attendee.phoneNumber}</td>
                    <td className="px-6 py-4">
                      {attendee.isNewcomer ? (
                        <Badge variant="success">Newcomer</Badge>
                      ) : (
                        <Badge variant="secondary">Returning</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(attendee.createdAt), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-2 py-4 text-right">
                      <RowActions
                        attendee={attendee}
                        month={selectedMonth}
                        year={selectedYear}
                        onRequestDelete={setPendingDelete}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing <span className="text-foreground font-medium">{(page - 1) * limit + 1}</span> to{" "}
              <span className="text-foreground font-medium">{Math.min(page * limit, data.total)}</span> of{" "}
              <span className="text-foreground font-medium">{data.total}</span> entries
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/10" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button variant="outline" size="sm" className="border-white/10" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AddAttendeeDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={handleAttendeeAdded} />
      <BulkImportDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} onSuccess={handleAttendeeAdded} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "attendee"
                ? `Delete ${pendingDelete.attendee.fullName}?`
                : pendingDelete
                  ? `Remove ${pendingDelete.attendee.fullName} from ${MONTHS[pendingDelete.month - 1]} ${pendingDelete.year}?`
                  : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "attendee"
                ? "This permanently deletes the attendee and all of their attendance history. This cannot be undone."
                : "This only removes the attendance record for the selected month. The attendee remains in the registry with their other attendance history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={isDeleting}
              className={pendingDelete?.kind === "attendee" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isDeleting ? "Deleting..." : pendingDelete?.kind === "attendee" ? "Delete attendee" : "Remove attendance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
