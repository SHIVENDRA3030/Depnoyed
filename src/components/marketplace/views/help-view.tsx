"use client";

import { useAuth, navigate } from "@/lib/store";
import { Search, Book, MessageCircle, FileQuestion, ArrowRight, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HelpView() {
  const user = useAuth((s) => s.user);

  if (!user) {
    navigate({ name: "login" });
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">How can we help?</h1>
        <p className="mt-2 text-muted-foreground">
          Search our knowledge base or get in touch with our support team.
        </p>
        <div className="relative mx-auto mt-6 max-w-lg">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 rounded-full pl-12 pr-4 text-base shadow-sm"
            placeholder="Search documentation, guides, or keywords..."
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-12">
        {/* Help categories */}
        <HelpCategoryCard
          icon={<Book className="size-6 text-brand" />}
          title="Documentation"
          description="Detailed guides on deploying, configuring, and managing apps."
          action="Read Docs"
        />
        <HelpCategoryCard
          icon={<FileQuestion className="size-6 text-amber-500" />}
          title="FAQ"
          description="Answers to the most commonly asked questions."
          action="View FAQ"
        />
        <HelpCategoryCard
          icon={<MessageCircle className="size-6 text-emerald-500" />}
          title="Community"
          description="Join our Discord to chat with other developers and engineers."
          action="Join Discord"
        />
      </div>

      {/* Popular articles */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Popular Articles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ArticleCard title="Getting started with your first deployment" />
          <ArticleCard title="How to configure custom domains and SSL" />
          <ArticleCard title="Connecting to your persistent volumes via SSH" />
          <ArticleCard title="Managing environment variables securely" />
          <ArticleCard title="Upgrading from the Hobby plan to Pro" />
          <ArticleCard title="Setting up automated GitHub deployments" />
        </div>
      </div>

      {/* Contact Support */}
      <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
        <div className="p-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <h3 className="text-lg font-bold">Still need help?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Our support team is available 24/7 to help you with technical issues.
            </p>
          </div>
          <Button className="mt-4 sm:mt-0 gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <Mail className="size-4" /> Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

function HelpCategoryCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-brand/30 hover:shadow-md cursor-pointer">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-muted/50">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-brand">
        {action} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}

function ArticleCard({ title }: { title: string }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/30 hover:bg-muted/10"
    >
      <span className="text-sm font-medium">{title}</span>
      <ExternalLink className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
