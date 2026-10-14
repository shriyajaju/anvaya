import { ReviewQueueBoard } from "@/components/studio/review-queue-board";
import { getSession } from "@/lib/auth/session";
import { signPreviewToken } from "@/lib/preview-token";
import { reviewQueue } from "@/server/review-data";
import { redirect } from "next/navigation";

export default async function ReviewQueuePage() {
  const session = await getSession();
  if (!session?.org) redirect("/login");
  const reviews = await reviewQueue();
  const tokens: Record<string, string> = {};
  for (const review of reviews) {
    if (!tokens[review.slug]) tokens[review.slug] = signPreviewToken({ slug: review.slug, siteId: review.siteId });
  }
  return <ReviewQueueBoard reviews={reviews} userId={session.userId} tokens={tokens} />;
}
