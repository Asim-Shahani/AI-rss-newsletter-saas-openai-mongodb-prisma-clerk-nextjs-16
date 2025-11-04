import type { NextRequest } from "next/server";
import { generateNewsletterStream } from "@/actions/generate-newsletter";
import { getFeedsToRefresh } from "@/lib/rss/feed-refresh";
import { createSSESender } from "@/lib/streaming/sse-helpers";

export const maxDuration = 300; // 5 minutes for Vercel Pro

/**
 * POST /api/newsletter/generate-stream
 *
 * Streams newsletter generation in real-time using Server-Sent Events (SSE).
 *
 * This endpoint:
 * 1. Validates request parameters
 * 2. Checks which feeds need refreshing
 * 3. Sends status updates as feeds are processed
 * 4. Streams AI-generated newsletter content in real-time
 * 5. Sends completion or error events
 *
 * @returns SSE stream with newsletter generation progress
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedIds, startDate, endDate, userInput } = body;

    // Validate required parameters
    if (!feedIds || !Array.isArray(feedIds) || feedIds.length === 0) {
      return Response.json(
        { error: "feedIds is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return Response.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Create a readable stream for SSE
    const readableStream = new ReadableStream({
      async start(controller) {
        // Helper function to send SSE events
        const send = createSSESender(controller);

        try {
          // Check which feeds need refreshing
          const feedsToRefresh = await getFeedsToRefresh(feedIds);

          // Send refreshing event if feeds are stale
          if (feedsToRefresh.length > 0) {
            send({
              type: "refreshing",
              feedCount: feedsToRefresh.length,
            });
          }

          // Send analyzing event
          send({
            type: "analyzing",
            feedCount: feedIds.length,
          });

          // Generate newsletter with streaming
          const { stream, articlesAnalyzed } = await generateNewsletterStream({
            feedIds,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            userInput,
          });

          // Send metadata about articles analyzed
          send({
            type: "metadata",
            articlesAnalyzed,
          });

          // Stream the AI-generated newsletter in chunks
          for await (const partialObject of stream) {
            send({
              type: "partial",
              data: partialObject,
            });
          }

          // Send completion event
          send({ type: "complete" });

          controller.close();
        } catch (error) {
          // Send error event
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          send({
            type: "error",
            error: errorMessage,
          });
          controller.close();
        }
      },
    });

    // Return SSE response with appropriate headers
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in generate-stream:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      { error: `Failed to generate newsletter: ${errorMessage}` },
      { status: 500 }
    );
  }
}
