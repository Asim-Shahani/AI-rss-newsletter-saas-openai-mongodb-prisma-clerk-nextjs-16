import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { upsertUserFromClerk } from "@/actions/user";
import { getNewsletterById } from "@/actions/newsletter";
import { NewsletterHistoryView } from "@/components/dashboard/newsletter-history-view";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewsletterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { userId, has } = await auth();

  if (!userId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to view this newsletter.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isPro = await has({ plan: "pro" });

  if (!isPro) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Pro Plan Required</CardTitle>
            <CardDescription>
              Upgrade to Pro to access your newsletter history.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const user = await upsertUserFromClerk(userId);
  const newsletter = await getNewsletterById(id, user.id);

  if (!newsletter) {
    notFound();
  }

  return <NewsletterHistoryView newsletter={newsletter} />;
}
