import type { ArticleForPrompt, NewsletterPromptParams } from "./types";

// ============================================
// NEWSLETTER PROMPT BUILDERS
// ============================================

/**
 * Builds article summaries for AI prompt
 * Formats articles into a structured text format for AI consumption
 */
export function buildArticleSummaries(articles: ArticleForPrompt[]): string {
  return articles
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
}

/**
 * Builds settings context from user settings
 * Creates a formatted string of user preferences for the AI prompt
 */
function buildSettingsContext(
  settings?: NewsletterPromptParams["settings"]
): string {
  if (!settings) {
    return "";
  }

  const contextParts: string[] = [];

  // Basic Settings
  if (settings.newsletterName) {
    contextParts.push(`Newsletter Name: ${settings.newsletterName}`);
  }
  if (settings.description) {
    contextParts.push(`Newsletter Description: ${settings.description}`);
  }
  if (settings.targetAudience) {
    contextParts.push(`Target Audience: ${settings.targetAudience}`);
  }
  if (settings.defaultTone) {
    contextParts.push(`Tone: ${settings.defaultTone}`);
  }

  // Branding
  if (settings.brandVoice) {
    contextParts.push(`Brand Voice: ${settings.brandVoice}`);
  }
  if (settings.companyName) {
    contextParts.push(`Company: ${settings.companyName}`);
  }
  if (settings.industry) {
    contextParts.push(`Industry: ${settings.industry}`);
  }

  // Additional Information
  if (settings.defaultTags && settings.defaultTags.length > 0) {
    contextParts.push(`Tags: ${settings.defaultTags.join(", ")}`);
  }
  if (settings.senderName) {
    contextParts.push(`Sender Name: ${settings.senderName}`);
  }
  if (settings.senderEmail) {
    contextParts.push(`Sender Email: ${settings.senderEmail}`);
  }

  // Disclaimer and Footer are handled separately below
  if (settings.disclaimerText) {
    contextParts.push(
      `Required disclaimer text to include at the end: "${settings.disclaimerText}"`
    );
  }
  if (settings.customFooter) {
    contextParts.push(
      `Required footer content to include at the very end: "${settings.customFooter}"`
    );
  }

  if (contextParts.length === 0) {
    return "";
  }

  return `NEWSLETTER SETTINGS:\n${contextParts.join("\n")}\n\n`;
}

/**
 * Builds comprehensive AI prompt for newsletter generation
 * Creates a structured prompt that instructs the AI to generate a professional newsletter
 */
export function buildNewsletterPrompt(params: NewsletterPromptParams): string {
  const settingsContext = buildSettingsContext(params.settings);
  const hasDisclaimer = params.settings?.disclaimerText;
  const hasFooter = params.settings?.customFooter;
  const hasUserInstructions = params.userInput?.trim();

  return `You are an expert newsletter writer. Create a professional, engaging newsletter from these RSS articles.

DATE RANGE: ${params.startDate.toLocaleDateString()} to ${params.endDate.toLocaleDateString()}

${settingsContext}${
    hasUserInstructions
      ? `🔴 CRITICAL USER INSTRUCTIONS (MUST FOLLOW):\n${params.userInput}\n\n`
      : ""
  }

ARTICLES (${params.articleCount} total):
${params.articleSummaries}

Create a newsletter with:

1. **5 Newsletter Titles**: Creative titles capturing the content period
2. **5 Email Subject Lines**: Compelling subject lines to drive opens
3. **Newsletter Body** (1200-2000 words, Markdown format):
   - Strong opening hook
   - Use headings (##, ###) for structure
   - Highlight important stories with context
   - Group related stories thematically
   - Use **bold** and *italics* for emphasis
   - Include blockquotes (>) for key quotes
   - Maintain professional, engaging tone
   - Conclude with forward-looking statement${
     hasDisclaimer
       ? '\n   - Near the end, naturally incorporate the required disclaimer text WITHOUT using labels like "Disclaimer:" or "Note:" - just include the text seamlessly'
       : ""
   }${
    hasFooter
      ? '\n   - At the very end, include the required footer content WITHOUT labels like "Footer:" or "Custom Footer:" - just include the content naturally with appropriate formatting (e.g., add a horizontal rule "---" before it)'
      : ""
  }
4. **5 Top Announcements**: Brief, punchy format
5. **Additional Information**: Supplementary notes, trends, recommendations (Markdown)

IMPORTANT: 
- Use ALL the newsletter settings provided above to inform the style, tone, and content${
    hasUserInstructions
      ? "\n- 🔴 CRITICAL: The USER INSTRUCTIONS above are MANDATORY and MUST be incorporated into the newsletter"
      : ""
  }${
    hasDisclaimer
      ? '\n- Include the required disclaimer text near the end WITHOUT adding labels like "Disclaimer:" - weave it in naturally'
      : ""
  }${
    hasFooter
      ? '\n- Include the required footer content at the very end WITHOUT labels like "Custom Footer:" or "Footer:" - format it naturally (use "---" separator if appropriate)'
      : ""
  }
- Ensure the newsletter aligns with the target audience and brand voice specified
- Follow the tone and style guidelines provided in the settings${
    hasUserInstructions
      ? "\n- The user's specific instructions take precedence and should be clearly reflected in the content"
      : ""
  }

Return as structured JSON.`;
}
