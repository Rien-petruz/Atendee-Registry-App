import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  Search, Users, UserPlus, UserCheck, Download, 
  ArrowUpDown, ChevronLeft, ChevronRight, Filter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetAttendees, useExportAttendees, GetAttendeesFilter, GetAttendeesSort } from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<GetAttendeesFilter>("all");
  const [sort, setSort] = useState<GetAttendeesSort>("newest");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const apiOpts = getApiOptions();

  // Fetch paginated table data
  const { data, isLoading } = useGetAttendees(
    { 
      page, 
      limit, 
      filter: filter !== "all" ? filter : undefined,
      sort,
      search: debouncedSearch || undefined
    }, 
    apiOpts
  );

  // Stats fetching (best effort without dedicated endpoint)
  const { data: allStats } = useGetAttendees({ filter: "all", limit: 1 }, apiOpts);
  const { data: newStats } = useGetAttendees({ filter: "newcomers", limit: 1 }, apiOpts);
  const { data: retStats } = useGetAttendees({ filter: "returning", limit: 1 }, apiOpts);

  const { refetch: exportCsv, isFetching: isExporting } = useExportAttendees(
    { filter: filter !== "all" ? filter : undefined },
    { ...apiOpts, query: { enabled: false } }
  );

  const handleExport = async () => {
    const res = await exportCsv();
    if (res.data) {
      // In a real app, the API might return CSV text or a URL
      // If it's text, we can trigger a download
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${filter}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    }
  };

  const statCards = [
    { label: "Total Attendees", value: allStats?.total || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Newcomers", value: newStats?.total || 0, icon: UserPlus, color: "text-accent", bg: "bg-accent/10" },
    { label: "Returning", value: retStats?.total || 0, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and view your event attendees.</p>
        </div>
        <Button onClick={handleExport} isLoading={isExporting} variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="glass-panel border-white/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-display font-bold mt-2">{stat.value.toLocaleString()}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
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
                  className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
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
                  </tr>
                ))
              ) : data?.attendees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No attendees found matching your criteria.
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
              Showing <span className="text-foreground font-medium">{(page - 1) * limit + 1}</span> to <span className="text-foreground font-medium">{Math.min(page * limit, data.total)}</span> of <span className="text-foreground font-medium">{data.total}</span> entries
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-white/10"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-white/10"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
