import * as React from "react";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Eye, PenLine, Info, AlertCircle, CheckCircle2, ImagePlus, X, History, MailCheck, MailX, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSendEmail, useGetEmailHistory } from "@workspace/api-client-react";
import { getApiOptions } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message is too short"),
  targetGroup: z.enum(["all", "newcomers", "returning"]),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface ImageData {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName: string;
}

export default function Email() {
  const [isPreview, setIsPreview] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number; total: number } | null>(null);
  const [image, setImage] = useState<ImageData | null>(null);
  const [imageDragOver, setImageDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const apiOpts = getApiOptions();
  const { mutate: sendBulkEmail, isPending } = useSendEmail(apiOpts);
  const { data: historyData, refetch: refetchHistory } = useGetEmailHistory(apiOpts);

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

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file (PNG, JPG, GIF, WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setImage({ base64, mimeType: file.type, previewUrl: dataUrl, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImageDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const onSubmit = (data: EmailFormValues) => {
    setSendResult(null);
    sendBulkEmail(
      {
        data: {
          ...data,
          ...(image ? { imageBase64: image.base64, imageMimeType: image.mimeType } : {}),
        } as any,
      },
      {
        onSuccess: (res) => {
          setSendResult({ success: res.successCount, failed: res.failedCount, total: res.total });
          toast({ title: "Emails Sent", description: res.message });
          refetchHistory();
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

  const generatePreview = (text: string) =>
    text ? text.replace(/{{name}}/g, "Jane Doe").replace(/{{email}}/g, "jane@example.com") : "";

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
          <Card className="border-emerald-500/30 bg-emerald-500/10 overflow-hidden relative">
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
                              <input type="radio" value={type} className="sr-only peer" {...register("targetGroup")} />
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
                          className={`flex min-h-[240px] w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary resize-y ${errors.message ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          placeholder="Write your email here..."
                        />
                        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                      </div>

                      {/* Image Upload */}
                      <div className="space-y-3">
                        <Label>Attach Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        {image ? (
                          <div className="relative flex items-center gap-4 p-4 bg-black/30 border border-white/10 rounded-xl">
                            <img
                              src={image.previewUrl}
                              alt="Selected"
                              className="w-20 h-20 object-cover rounded-lg border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{image.fileName}</p>
                              <p className="text-xs text-muted-foreground mt-1">Will appear below the message in each email</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setImage(null)}
                              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
                            onDragLeave={() => setImageDragOver(false)}
                            onDrop={onDrop}
                            className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${imageDragOver ? "border-primary bg-primary/10" : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"}`}
                          >
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                              <ImagePlus className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">Click to upload or drag & drop</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WebP — max 5MB</p>
                            </div>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onFileInputChange}
                        />
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
                        <div className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-zinc-800 min-h-[150px]">
                          {generatePreview(watchMessage) || <span className="text-zinc-400 italic">Message body empty...</span>}
                        </div>
                        {image && (
                          <div className="pt-4 text-center">
                            <img
                              src={image.previewUrl}
                              alt="Attached"
                              className="max-w-full rounded-lg inline-block border border-zinc-200"
                              style={{ maxHeight: 300 }}
                            />
                          </div>
                        )}
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
      {/* Campaign History */}
      <Card className="glass-panel border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            Campaign History
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          {!historyData?.campaigns?.length ? (
            <div className="py-14 text-center text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No campaigns sent yet</p>
              <p className="text-sm mt-1 opacity-60">Your sent campaigns will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Audience</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Delivered</th>
                  <th className="px-6 py-4 font-medium">Failed</th>
                  <th className="px-6 py-4 font-medium">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyData.campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium max-w-[220px] truncate">{c.subject}</td>
                    <td className="px-6 py-4">
                      <Badge variant={c.targetGroup === "newcomers" ? "success" : c.targetGroup === "returning" ? "secondary" : "outline"} className="capitalize">
                        {c.targetGroup}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {c.total}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <MailCheck className="w-3.5 h-3.5" /> {c.successCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 font-medium ${c.failedCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        <MailX className="w-3.5 h-3.5" /> {c.failedCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(c.sentAt), "MMM d, yyyy h:mm a")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
