/**
 * Server-Sent Events (SSE) Helper Utilities
 *
 * These utilities simplify working with SSE streams for real-time updates.
 * SSE is a standard for pushing updates from server to client over HTTP.
 */

/**
 * Event types that can be sent during newsletter generation
 */
export type StreamEventType =
  | "refreshing" // Feed refresh is starting
  | "analyzing" // Analyzing articles from feeds
  | "metadata" // Sending article count before generation
  | "partial" // Partial newsletter data (streaming in progress)
  | "complete" // Generation completed successfully
  | "error"; // An error occurred

/**
 * Base structure for all stream events
 */
export interface StreamEvent {
  type: StreamEventType;
}

/**
 * Event sent when refreshing stale feeds
 */
export interface RefreshingEvent extends StreamEvent {
  type: "refreshing";
  feedCount: number;
}

/**
 * Event sent when analyzing articles
 */
export interface AnalyzingEvent extends StreamEvent {
  type: "analyzing";
  feedCount: number;
}

/**
 * Event sent with metadata before generation starts
 */
export interface MetadataEvent extends StreamEvent {
  type: "metadata";
  articlesAnalyzed: number;
}

/**
 * Event sent with partial newsletter data during generation
 */
export interface PartialEvent extends StreamEvent {
  type: "partial";
  data: unknown;
}

/**
 * Event sent when generation completes
 */
export interface CompleteEvent extends StreamEvent {
  type: "complete";
}

/**
 * Event sent when an error occurs
 */
export interface ErrorEvent extends StreamEvent {
  type: "error";
  error: string;
}

/**
 * Union type of all possible stream events
 */
export type AnyStreamEvent =
  | RefreshingEvent
  | AnalyzingEvent
  | MetadataEvent
  | PartialEvent
  | CompleteEvent
  | ErrorEvent;

/**
 * Encodes a data object as an SSE message
 *
 * SSE format is: "data: {json}\n\n"
 * The double newline signals the end of the event
 *
 * @param data - The data to send
 * @returns Encoded Uint8Array ready to send over the stream
 */
export function encodeSSE(data: AnyStreamEvent): Uint8Array {
  const encoder = new TextEncoder();
  const json = JSON.stringify(data);
  return encoder.encode(`data: ${json}\n\n`);
}

/**
 * Creates a helper function for enqueueing SSE messages
 *
 * This simplifies the controller.enqueue(encodeSSE(...)) pattern
 * into a cleaner send(...) call
 *
 * @param controller - The stream controller from ReadableStream
 * @returns A send function that encodes and enqueues messages
 */
export function createSSESender(controller: ReadableStreamDefaultController) {
  return (event: AnyStreamEvent) => {
    controller.enqueue(encodeSSE(event));
  };
}

/**
 * Parses an SSE message line into a data object
 *
 * SSE lines that start with "data: " contain JSON payloads
 * Other lines (like comments or event types) are ignored
 *
 * @param line - A single line from the SSE stream
 * @returns Parsed event object, or null if line should be skipped
 */
export function parseSSELine(line: string): AnyStreamEvent | null {
  // Only process lines that start with "data: "
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    // Remove "data: " prefix and parse JSON
    const json = line.slice(6);
    return JSON.parse(json) as AnyStreamEvent;
  } catch (error) {
    // Skip malformed JSON (could be incomplete chunks)
    console.warn("Failed to parse SSE line:", error);
    return null;
  }
}

/**
 * Parses multiple SSE lines from a chunk of text
 *
 * Stream chunks may contain multiple events separated by newlines
 * This function processes all events in a chunk
 *
 * @param chunk - Text chunk that may contain multiple SSE messages
 * @returns Array of parsed events (empty array if none found)
 */
export function parseSSEChunk(chunk: string): AnyStreamEvent[] {
  const lines = chunk.split("\n");
  const events: AnyStreamEvent[] = [];

  for (const line of lines) {
    const event = parseSSELine(line);
    if (event) {
      events.push(event);
    }
  }

  return events;
}
