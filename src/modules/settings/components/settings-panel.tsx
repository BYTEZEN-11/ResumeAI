"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { apiFetch } from "@/shared/hooks/use-api";
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bio: z.string().max(500).optional(),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
});
type ProfileForm = z.infer<typeof profileSchema>;
export function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<{ name: string; profile: ProfileForm }>("/api/v1/profile"),
  });
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "", bio: "", jobTitle: "", company: "",
      location: "", website: "", linkedinUrl: "", githubUrl: "",
    },
  });
  useEffect(() => {
    if (data?.data) {
      form.reset({
        name: data.data.name ?? "",
        bio: (data.data.profile as ProfileForm)?.bio ?? "",
        jobTitle: (data.data.profile as ProfileForm)?.jobTitle ?? "",
        company: (data.data.profile as ProfileForm)?.company ?? "",
        location: (data.data.profile as ProfileForm)?.location ?? "",
        website: (data.data.profile as ProfileForm)?.website ?? "",
        linkedinUrl: (data.data.profile as ProfileForm)?.linkedinUrl ?? "",
        githubUrl: (data.data.profile as ProfileForm)?.githubUrl ?? "",
      });
    }
  }, [data, form]);
  async function onSubmit(values: ProfileForm) {
    try {
      await apiFetch("/api/v1/profile", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    }
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your public profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" placeholder="e.g. Software Engineer" {...form.register("jobTitle")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} placeholder="Tell us a bit about yourself..." {...form.register("bio")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...form.register("company")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g. San Francisco, CA" {...form.register("location")} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "website", label: "Website", placeholder: "https://example.com" },
            { id: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile" },
            { id: "githubUrl", label: "GitHub", placeholder: "https://github.com/yourname" },
          ].map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                placeholder={field.placeholder}
                {...form.register(field.id as keyof ProfileForm)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Changes
      </Button>
    </form>
  );
}
