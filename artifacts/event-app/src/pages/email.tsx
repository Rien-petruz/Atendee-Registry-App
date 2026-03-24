import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Eye, PenLine, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSendEmail, SendEmailRequestTargetGroup } from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message is too short"),
  targetGroup: z.enum(["all", "newcomers", "returning"]),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export default function Email() {
  const [isPreview, setIsPreview] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; total: number } | null>(null);
  
  const { toast } = useToast();
  const apiOpts = getApiOptions();
  const { mutate: sendBulkEmail, isPending } = useSendEmail(apiOpts);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      targetGroup: "all",
      message: "Hello {{name}},\n\nThank you for registering for TNP Registry!\n\nGod bless you,\nThe TNP Team",
    }
  });

  const watchMessage = watch("message");
  const watchSubject = watch("subject");
  const watchTarget = watch("targetGroup");

  const onSubmit = (data: EmailFormValues) => {
    setSendResult(null);
    sendBulkEmail(
      { data },
      {
        onSuccess: (res) => {
          setSendResult({
            success: res.successCount,
            failed: res.failedCount,
            total: res.total
          });
          toast({
            title: "Emails Sent",
            description: res.message,
          });
        },
        onError: (err: any) => {
          toast({
            title: "Failed to send",
            description: err.message || "An error occurred while sending emails.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const generatePreview = (text: string) => {
    if (!text) return "";
    return text.replace(/{{name}}/g, "Jane Doe").replace(/{{email}}/g, "jane@example.com");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-display font-bold">Bulk Emailer</h1>
        <p className="text-muted-foreground mt-1">Send personalized messages to your segmented attendees.</p>
      </div>

      {sendResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-emerald-500/30 bg-emerald-500/10 mb-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">Campaign Finished!</h3>
                  <p className="text-emerald-400/80">Successfully processed {sendResult.total} recipients.</p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{sendResult.success}</p>
                  <p className="text-xs text-emerald-400/70 uppercase tracking-wider font-semibold">Delivered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{sendResult.failed}</p>
                  <p className="text-xs text-destructive/70 uppercase tracking-wider font-semibold">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="glass-panel border-white/5">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div>
                <CardTitle className="text-xl">Compose Campaign</CardTitle>
              </div>
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setIsPreview(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isPreview ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white'}`}
                >
                  <PenLine className="w-4 h-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreview(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isPreview ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white'}`}
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form id="email-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <AnimatePresence mode="wait">
                  {!isPreview ? (
                    <motion.div
                      key="editor"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <Label>Target Audience</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["all", "newcomers", "returning"] as const).map((type) => (
                            <label key={type} className="cursor-pointer">
                              <input 
                                type="radio" 
                                value={type} 
                                className="sr-only peer"
                                {...register("targetGroup")} 
                              />
                              <div className="flex items-center justify-center p-4 rounded-xl border border-white/10 bg-black/20 text-center peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary hover:bg-white/5 transition-all h-full">
                                <span className="font-medium capitalize">{type}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject Line</Label>
                        <Input
                          id="subject"
                          placeholder="Important update from TNP Registry"
                          {...register("subject")}
                          className={errors.subject ? "border-destructive" : ""}
                        />
                        {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <Label htmlFor="message">Message Body</Label>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="w-3 h-3" /> Supports plain text formatting
                          </span>
                        </div>
                        <textarea
                          id="message"
                          {...register("message")}
                          className={`flex min-h-[300px] w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary resize-y ${errors.message ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          placeholder="Write your email here..."
                        />
                        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white text-black rounded-xl overflow-hidden shadow-2xl border border-white/20"
                    >
                      <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-3 flex gap-2 items-center">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        </div>
                        <div className="ml-4 text-xs text-zinc-500 font-medium">New Message</div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="pb-4 border-b border-zinc-200 space-y-1">
                          <div className="text-sm"><span className="font-semibold text-zinc-600 w-16 inline-block">To:</span> {watchTarget === 'all' ? 'All Attendees' : watchTarget === 'newcomers' ? 'Newcomers' : 'Returning Attendees'}</div>
                          <div className="text-sm"><span className="font-semibold text-zinc-600 w-16 inline-block">Subject:</span> {watchSubject || "(No subject)"}</div>
                        </div>
                        <div className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-zinc-800 min-h-[200px]">
                          {generatePreview(watchMessage) || <span className="text-zinc-400 italic">Message body empty...</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="text-lg">Personalization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Use these tags to inject attendee data into your message:</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-black/40 p-2 px-3 rounded-lg border border-white/5">
                  <code className="text-primary font-mono text-sm">{`{{name}}`}</code>
                  <span className="text-xs text-muted-foreground">Full Name</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 p-2 px-3 rounded-lg border border-white/5">
                  <code className="text-primary font-mono text-sm">{`{{email}}`}</code>
                  <span className="text-xs text-muted-foreground">Email Address</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-accent/90">Make sure you have configured your SMTP settings before sending campaigns.</p>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            form="email-form" 
            className="w-full h-14 text-lg font-bold gap-2" 
            variant="gradient"
            isLoading={isPending}
          >
            <Send className="w-5 h-5" />
            Launch Campaign
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
