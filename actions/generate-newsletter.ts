"use server";

import { generateObject, streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getArticlesByFeedsAndDateRange } from "./rss-article";
import { createNewsletter } from "./newsletter";
import { getUserByClerkId } from "./user";
import { fetchAndStoreFeed } from "./rss-fetch";
import { prisma } from "@/lib/prisma";

// ============================================
// NEWSLETTER GENERATION ACTIONS
// ============================================

/**
 * Newsletter generation result schema
 */
const NewsletterSchema = z.object({
  suggestedTitles: z.array(z.string()).length(5),
  suggestedSubjectLines: z.array(z.string()).length(5),
  body: z.string(),
  topAnnouncements: z.array(z.string()).length(5),
  additionalInfo: z.string().optional(),
});

export type GeneratedNewsletter = z.infer<typeof NewsletterSchema>;

/**
 * Determines which feeds need refreshing (older than 3 hours)
 * Checks globally across all users - if ANY user fetched this URL recently, skip refresh
 * Returns array of feed IDs that should be refreshed
 */
async function getFeedsToRefresh(feedIds: string[]): Promise<string[]> {
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const now = new Date();

  const feeds = await prisma.rssFeed.findMany({
    where: {
      id: { in: feedIds },
    },
    select: {
      id: true,
      url: true,
      lastFetched: true,
    },
  });

  const feedsToRefresh: string[] = [];

  for (const feed of feeds) {
    // Check if ANY feed with this URL was fetched recently (by any user)
    const mostRecentFetch = await prisma.rssFeed.findFirst({
      where: {
        url: feed.url,
      },
      select: {
        lastFetched: true,
      },
      orderBy: {
        lastFetched: "desc",
      },
    });

    // If no feed with this URL has ever been fetched, refresh it
    if (!mostRecentFetch?.lastFetched) {
      feedsToRefresh.push(feed.id);
      continue;
    }

    // Check if the most recent fetch was > 3 hours ago
    const timeSinceLastFetch =
      now.getTime() - mostRecentFetch.lastFetched.getTime();
    if (timeSinceLastFetch > THREE_HOURS_MS) {
      feedsToRefresh.push(feed.id);
    }
  }

  return feedsToRefresh;
}

/**
 * Generates an AI-powered newsletter from selected RSS feeds and date range
 */
export async function generateNewsletterWithAI(params: {
  feedIds: string[];
  startDate: Date;
  endDate: Date;
  userInput?: string;
  shouldSave?: boolean;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    // Only refresh stale feeds (>3 hours old)
    const feedsToRefresh = await getFeedsToRefresh(params.feedIds);

    if (feedsToRefresh.length > 0) {
      console.log(
        `Refreshing ${feedsToRefresh.length} stale feeds (out of ${params.feedIds.length} total)...`
      );
      const refreshResults = await Promise.allSettled(
        feedsToRefresh.map((feedId) => fetchAndStoreFeed(feedId))
      );

      // Log refresh results
      const successful = refreshResults.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failed = refreshResults.filter(
        (r) => r.status === "rejected"
      ).length;
      console.log(
        `Feed refresh complete: ${successful} successful, ${failed} failed`
      );
    } else {
      console.log(
        `All ${params.feedIds.length} feeds are fresh (< 3 hours old), skipping refresh`
      );
    }

    // Fetch articles from selected feeds within date range
    const articles = await getArticlesByFeedsAndDateRange(
      params.feedIds,
      params.startDate,
      params.endDate,
      100 // Limit to top 100 articles
    );

    if (articles.length === 0) {
      throw new Error(
        "No articles found for the selected feeds and date range"
      );
    }

    // Build article summaries for AI prompt
    const articleSummaries = articles
      .map((article, index) => {
        return `
${index + 1}. "${article.title}"
   Source: ${article.feed.title}
   Published: ${article.pubDate.toLocaleDateString()}
   Summary: ${
     article.summary ||
     article.content?.substring(0, 200) ||
     "No summary available"
   }
   Link: ${article.link}
`;
      })
      .join("\n");

    // Build comprehensive AI prompt
    const prompt = `You are an expert newsletter writer. Create a professional, engaging newsletter based on the following RSS feed articles.

DATE RANGE: ${params.startDate.toLocaleDateString()} to ${params.endDate.toLocaleDateString()}

${params.userInput ? `USER CONTEXT/INSTRUCTIONS:\n${params.userInput}\n\n` : ""}

ARTICLES TO ANALYZE (${articles.length} total):
${articleSummaries}

Please create a comprehensive newsletter with:

1. **5 Newsletter Titles**: Creative, engaging titles that capture the essence of the content period
2. **5 Email Subject Lines**: Compelling subject lines that will drive opens
3. **Newsletter Body**: A well-structured, engaging newsletter body (800-1200 words) formatted in **Markdown** that:
   - Opens with a strong hook
   - Uses headings (##, ###) to structure sections
   - Highlights the most important stories with context and analysis
   - Groups related stories thematically
   - Uses **bold** for emphasis and *italics* for subtle emphasis
   - Includes relevant quotes as blockquotes (>)
   - Uses bullet points or numbered lists where appropriate
   - Maintains an engaging, professional tone
   - Concludes with a forward-looking statement
4. **5 Top Announcements**: The 5 most significant news items in brief, punchy format
5. **Additional Information**: Any supplementary notes, trends observed, or recommendations (formatted in Markdown)

IMPORTANT: Format the Newsletter Body and Additional Information using Markdown syntax for rich formatting.

Format the output as structured JSON matching the schema.`;

    // Generate newsletter using AI
    const { object: newsletter } = await generateObject({
      model: openai("gpt-4o"),
      schema: NewsletterSchema,
      prompt,
    });

    // Save newsletter if user is Pro and shouldSave is true
    let savedNewsletter = null;
    if (params.shouldSave) {
      const { has } = await auth();
      const isPro = await has({ plan: "pro" });

      if (isPro) {
        savedNewsletter = await createNewsletter({
          userId: user.id,
          suggestedTitles: newsletter.suggestedTitles,
          suggestedSubjectLines: newsletter.suggestedSubjectLines,
          body: newsletter.body,
          topAnnouncements: newsletter.topAnnouncements,
          additionalInfo: newsletter.additionalInfo,
          startDate: params.startDate,
          endDate: params.endDate,
          userInput: params.userInput,
          feedsUsed: params.feedIds,
        });
      }
    }

    return {
      success: true,
      newsletter,
      savedNewsletter,
      articlesAnalyzed: articles.length,
    };
  } catch (error) {
    console.error("Failed to generate newsletter:", error);
    throw new Error(
      `Failed to generate newsletter: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Gets preview of articles that will be used for newsletter generation
 */
export async function getNewsletterPreview(params: {
  feedIds: string[];
  startDate: Date;
  endDate: Date;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const articles = await getArticlesByFeedsAndDateRange(
      params.feedIds,
      params.startDate,
      params.endDate,
      50 // Preview limited to 50 articles
    );

    return {
      articleCount: articles.length,
      articles: articles.map((article) => ({
        title: article.title,
        feedTitle: article.feed.title,
        pubDate: article.pubDate,
        sourceCount: article.sourceCount,
      })),
    };
  } catch (error) {
    console.error("Failed to get newsletter preview:", error);
    throw new Error("Failed to get newsletter preview");
  }
}

/**
 * Generates an AI-powered newsletter with streaming (real-time updates)
 * Returns a stream that progressively sends newsletter parts as they're generated
 */
export async function generateNewsletterWithAIStream(params: {
  feedIds: string[];
  startDate: Date;
  endDate: Date;
  userInput?: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Get user from database
  const user = await getUserByClerkId(userId);
  if (!user) {
    throw new Error("User not found in database");
  }

  // Only refresh stale feeds (>3 hours old)
  const feedsToRefresh = await getFeedsToRefresh(params.feedIds);

  if (feedsToRefresh.length > 0) {
    console.log(
      `Refreshing ${feedsToRefresh.length} stale feeds (out of ${params.feedIds.length} total)...`
    );
    const refreshResults = await Promise.allSettled(
      feedsToRefresh.map((feedId) => fetchAndStoreFeed(feedId))
    );

    // Log refresh results
    const successful = refreshResults.filter(
      (r) => r.status === "fulfilled"
    ).length;
    const failed = refreshResults.filter((r) => r.status === "rejected").length;
    console.log(
      `Feed refresh complete: ${successful} successful, ${failed} failed`
    );
  } else {
    console.log(
      `All ${params.feedIds.length} feeds are fresh (< 3 hours old), skipping refresh`
    );
  }

  // Fetch articles from selected feeds within date range
  const articles = await getArticlesByFeedsAndDateRange(
    params.feedIds,
    params.startDate,
    params.endDate,
    100 // Limit to top 100 articles
  );

  if (articles.length === 0) {
    throw new Error("No articles found for the selected feeds and date range");
  }

  // Build article summaries for AI prompt
  const articleSummaries = articles
    .map((article, index) => {
      return `
${index + 1}. "${article.title}"
   Source: ${article.feed.title}
   Published: ${article.pubDate.toLocaleDateString()}
   Summary: ${
     article.summary ||
     article.content?.substring(0, 200) ||
     "No summary available"
   }
   Link: ${article.link}
`;
    })
    .join("\n");

  // Build comprehensive AI prompt
  const prompt = `You are an expert newsletter writer. Create a professional, engaging newsletter based on the following RSS feed articles.

DATE RANGE: ${params.startDate.toLocaleDateString()} to ${params.endDate.toLocaleDateString()}

${params.userInput ? `USER CONTEXT/INSTRUCTIONS:\n${params.userInput}\n\n` : ""}

ARTICLES TO ANALYZE (${articles.length} total):
${articleSummaries}

Please create a comprehensive newsletter with:

1. **5 Newsletter Titles**: Creative, engaging titles that capture the essence of the content period
2. **5 Email Subject Lines**: Compelling subject lines that will drive opens
3. **Newsletter Body**: A well-structured, engaging newsletter body (800-1200 words) formatted in **Markdown** that:
   - Opens with a strong hook
   - Uses headings (##, ###) to structure sections
   - Highlights the most important stories with context and analysis
   - Groups related stories thematically
   - Uses **bold** for emphasis and *italics* for subtle emphasis
   - Includes relevant quotes as blockquotes (>)
   - Uses bullet points or numbered lists where appropriate
   - Maintains an engaging, professional tone
   - Concludes with a forward-looking statement
4. **5 Top Announcements**: The 5 most significant news items in brief, punchy format
5. **Additional Information**: Any supplementary notes, trends observed, or recommendations (formatted in Markdown)

IMPORTANT: Format the Newsletter Body and Additional Information using Markdown syntax for rich formatting.

Format the output as structured JSON matching the schema.`;

  // Generate newsletter using AI streaming
  const { partialObjectStream } = await streamObject({
    model: openai("gpt-4o"),
    schema: NewsletterSchema,
    prompt,
  });

  return {
    stream: partialObjectStream,
    articlesAnalyzed: articles.length,
  };
}
