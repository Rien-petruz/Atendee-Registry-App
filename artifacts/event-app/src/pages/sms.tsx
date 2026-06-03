import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Send, MessageSquare, History, AlertCircle, CheckCircle2, Users, CalendarDays, Globe, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useSendSms, useGetSmsHistory, useGetSmsSettings,
} from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const smsSchema = z.object({
  message: z.string().min(1, "Message is required").max(1600, "Message too long"),
  targetGroup: z.enum(["all", "newcomers", "returning"]),
});
type SmsFormValues = z.infer<typeof smsSchema>;

function estimateSegments(text: string): { segments: number; gsm: boolean; length: number } {
  const gsm = /^[\x00-\x7F€£¥èéùìòÇØøÅåÆæßÉ \r\n_]*$/.test(text);
  const length = text.length;
  if (gsm) {
    if (length <= 160) return { segments: 1, gsm: true, length };
    return { segments: Math.ceil(length / 153), gsm: true, length };
  }
  if (length <= 70) return { segments: 1, gsm: false, length };
  return { segments: Math.ceil(length / 67), gsm: false, length };
}

export default function Sms() {
  const now = new Date();
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; total: number; errors?: any[] } | null>(null);
  const [scope, setScope] = useState<"all-time" | "by-month">("all-time");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { toast } = useToast();
  const apiOpts = getApiOptions();
  const { data: settings } = useGetSmsSettings(apiOpts);
  const { mutate: sendBulkSms, isPending } = useSendSms(apiOpts);
  const { data: historyData, refetch: refetchHistory } = useGetSmsHistory(apiOpts);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SmsFormValues>({
    resolver: zodResolver(smsSchema),
    defaultValues: {
      targetGroup: "all",
      message: "Hi {{name}}, thanks for joining us. See you next Sunday!",
    },
  });

  const watchMessage = watch("message") || "";
  const watchTarget = watch("targetGroup");
  const { segments, gsm, length } = estimateSegments(watchMessage);

  const currentYearRange = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const onSubmit = (data: SmsFormValues) => {
    setSendResult(null);
    const payload: any = {
      message: data.message,
      targetGroup: data.targetGroup,
    };
    if (scope === "by-month") {
      payload.filterMonth = selectedMonth;
      payload.filterYear = selectedYear;
    }
    sendBulkSms(
      { data: payload },
      {
        onSuccess: (r: any) => {
          setSendResult({ success: r.successCount, failed: r.failedCount, total: r.total, errors: r.errors });
          toast({
            title: "SMS dispatched",
            description: `${r.successCount} of ${r.total} sent successfully.`,
          });
          refetchHistory();
        },
        onError: (err: any) => {
          toast({ title: "Send failed", description: err?.message || "Could not send SMS.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-8"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Bulk SMS</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Send a single SMS to a filtered group of attendees via KudiSMS.
        </p>
      </div>

      {!settings?.isConfigured && (
        <Card className="glass-panel border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">KudiSMS not configured</p>
              <p className="text-sm text-muted-foreground">Add your API token and sender ID in Settings before sending.</p>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="border-white/10 gap-2">
                Go to Settings <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Compose SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sms-message">Message <span className="text-destructive">*</span></Label>
              <Textarea
                id="sms-message"
                rows={5}
                placeholder="Hi {{name}}, ..."
                {...register("message")}
                className={`bg-black/30 border-white/10 ${errors.message ? "border-destructive" : ""}`}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground justify-between">
                <span><code className="bg-black/40 px-1.5 py-0.5 rounded">{`{{name}}`}</code> is replaced per recipient.</span>
                <span className={segments > 1 ? "text-amber-400" : ""}>
                  {length} chars · {segments} SMS segment{segments !== 1 ? "s" : ""} · {gsm ? "GSM-7" : "Unicode"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Send to</Label>
              <div className="flex flex-wrap gap-2 bg-black/40 p-1 rounded-lg border border-white/5 w-fit">
                {(["all", "newcomers", "returning"] as const).map((g) => (
                  <label key={g} className="cursor-pointer">
                    <input type="radio" value={g} className="sr-only peer" {...register("targetGroup")} />
                    <div className="px-4 py-2 rounded-md text-sm font-medium capitalize peer-checked:bg-primary peer-checked:text-white text-muted-foreground hover:text-white transition-all">
                      {g}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Audience scope</Label>
              <div className="flex flex-wrap gap-2 bg-black/40 p-1 rounded-lg border border-white/5 w-fit">
                <button
                  type="button"
                  onClick={() => setScope("all-time")}
                  className={`px-4 py-2 rounded-md text-sm font-medium gap-2 flex items-center transition-all ${scope === "all-time" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
                >
                  <Globe className="w-4 h-4" /> All-time
                </button>
                <button
                  type="button"
                  onClick={() => setScope("by-month")}
                  className={`px-4 py-2 rounded-md text-sm font-medium gap-2 flex items-center transition-all ${scope === "by-month" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
                >
                  <CalendarDays className="w-4 h-4" /> By month
                </button>
              </div>
              {scope === "by-month" && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-black/40 border border-white/5 rounded-md px-3 py-2 text-sm"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-black/40 border border-white/5 rounded-md px-3 py-2 text-sm"
                  >
                    {currentYearRange.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground self-center">
                    Only attendees who have attendance in this month/year will receive the SMS.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Sending to <span className="capitalize text-foreground font-medium">{watchTarget}</span>
                {scope === "by-month" && <span> · {MONTHS[selectedMonth - 1]} {selectedYear}</span>}
              </div>
              <Button
                type="submit"
                variant="gradient"
                isLoading={isPending}
                disabled={!settings?.isConfigured}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Send className="w-4 h-4" /> Send SMS
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {sendResult && (
        <Card className="glass-panel border-white/5">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <p className="font-medium">Send complete</p>
            </div>
            <p className="text-sm">
              <span className="text-emerald-400 font-medium">{sendResult.success}</span> sent ·{" "}
              <span className="text-destructive font-medium">{sendResult.failed}</span> failed ·{" "}
              <span className="text-muted-foreground">{sendResult.total} total recipients</span>
            </p>
            {sendResult.errors && sendResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">View {sendResult.errors.length} error(s)</summary>
                <ul className="mt-2 text-xs space-y-0.5 max-h-40 overflow-y-auto">
                  {sendResult.errors.slice(0, 50).map((e: any, i: number) => (
                    <li key={i}>{e.phone}: {e.reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Recent SMS Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!historyData?.campaigns || historyData.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No SMS campaigns sent yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {historyData.campaigns.slice(0, 10).map((c: any) => (
                <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm line-clamp-1 truncate">{c.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.sentAt), "MMM d, yyyy h:mm a")}{" · "}
                      <Badge variant="secondary" className="capitalize">{c.targetGroup}</Badge>
                      {c.filterMonth && c.filterYear && <span> · {MONTHS[c.filterMonth - 1]} {c.filterYear}</span>}
                    </p>
                  </div>
                  <div className="text-xs flex gap-3 shrink-0">
                    <span className="text-emerald-400">{c.successCount} sent</span>
                    <span className="text-destructive">{c.failedCount} failed</span>
                    <span className="text-muted-foreground">{c.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
