import * as React from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Search, Users, Download, ArrowUpDown,
  ChevronLeft, ChevronRight, Filter, Plus, Upload,
  MoreHorizontal, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  useGetAttendees,
  useExportAttendees,
  useDeleteAttendee,
  getGetAttendeesQueryKey,
  getExportAttendeesQueryKey,
  GetAttendeesFilter,
  GetAttendeesSort,
  Attendee,
} from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AddAttendeeDialog, BulkImportDialog } from "./dashboard";

export default function Attendees() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<GetAttendeesFilter>("all");
  const [sort, setSort] = useState<GetAttendeesSort>("newest");
  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Attendee | null>(null);
  const limit = 20;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const apiOpts = getApiOptions();
  const { mutate: deleteAttendee, isPending: isDeleting } = useDeleteAttendee(apiOpts);

  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetAttendees(
    {
      page, limit,
      filter: filter !== "all" ? filter : undefined,
      sort,
      search: debouncedSearch || undefined,
    },
    apiOpts
  );

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetAttendeesQueryKey() });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteAttendee(
      { id: pendingDelete.id },
      {
        onSuccess: () => {
          toast({ title: "Attendee deleted", description: `${pendingDelete.fullName} and all attendance history removed.` });
          setPendingDelete(null);
          invalidate();
        },
        onError: (err: any) => {
          toast({ title: "Delete failed", description: err?.message || "Could not delete attendee.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Attendees</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            The full registry of every attendee, regardless of attendance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
          <Button onClick={() => setShowAddDialog(true)} variant="gradient" size="sm" className="gap-2 flex-1 sm:flex-initial">
            <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Add Attendee</span>
          </Button>
          <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial border-white/10 hover:bg-white/5">
            <Upload className="w-4 h-4" /> <span className="whitespace-nowrap">Bulk Import</span>
          </Button>
          <Button onClick={handleExport} isLoading={isExporting} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial border-white/10 hover:bg-white/5">
            <Download className="w-4 h-4" /> <span className="whitespace-nowrap">Export CSV</span>
          </Button>
        </div>
      </div>

      <Card className="glass-panel border-white/5">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground leading-tight">Total in registry</p>
            <h3 className="text-3xl font-display font-bold mt-2">{(data?.total ?? 0).toLocaleString()}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
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
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-32" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-48" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-6 bg-white/5 rounded w-20" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-32" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/5 rounded w-6" /></td>
                  </tr>
                ))
              ) : data?.attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">
                      {debouncedSearch || filter !== "all"
                        ? "No attendees match your filters."
                        : "No attendees yet. Add one or import a CSV to get started."}
                    </p>
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
                      {format(new Date(attendee.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-2 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" aria-label="Row actions">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                            onSelect={() => setPendingDelete(attendee)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete attendee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Showing <span className="text-foreground font-medium">{(page - 1) * limit + 1}</span> to{" "}
              <span className="text-foreground font-medium">{Math.min(page * limit, data.total)}</span> of{" "}
              <span className="text-foreground font-medium">{data.total}</span>
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

      <AddAttendeeDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={invalidate} />
      <BulkImportDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} onSuccess={invalidate} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent className="bg-card border-white/10 w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the attendee and all of their attendance history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete attendee"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
