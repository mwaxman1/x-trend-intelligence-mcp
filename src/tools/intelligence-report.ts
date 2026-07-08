/**
 * Tool 8: export_intelligence_report
 * Generate a structured markdown report combining multiple analyses into one deliverable.
 */

import { XApiClient } from '../lib/x-api.js';
import { analyzeCompetitorSentiment } from './competitor-sentiment.js';
import { trackBrandMentions } from './brand-mentions.js';
import { compareShareOfVoice } from './share-of-voice.js';
import { identifyComplaints } from './complaints.js';
import { getPositiveLexicon, getNegativeLexicon } from '../lib/sentiment.js';
import { formatNumber } from '../lib/utils.js';

export interface IntelligenceReportParams {
  brand_name: string;
  competitors?: string[];
  days_back?: number;
  include_complaints?: boolean; // default true
  include_share_of_voice?: boolean; // default true
  report_title?: string;
}

export interface IntelligenceReportResult {
  title: string;
  generated_at: string;
  brand: string;
  markdown: string;
  sections: string[];
}

export async function exportIntelligenceReport(
  client: XApiClient,
  params: IntelligenceReportParams,
): Promise<IntelligenceReportResult> {
  const brand = params.brand_name;
  const daysBack = Math.min(Math.max(params.days_back ?? 7, 1), 7);
  const competitors = params.competitors ?? [];
  const includeComplaints = params.include_complaints ?? true;
  const includeSOV = params.include_share_of_voice ?? true;
  const title = params.report_title ?? `X/Twitter Intelligence Report: ${brand}`;
  const generatedAt = new Date().toISOString();

  const sections: string[] = [];
  let markdown = `# ${title}\n\n`;
  markdown += `**Generated:** ${generatedAt}\n`;
  markdown += `**Brand:** ${brand}\n`;
  markdown += `**Time Window:** Last ${daysBack} day(s)\n`;
  markdown += `**Data Source:** X/Twitter API v2 (recent search)\n\n`;
  markdown += `---\n\n`;

  // Section 1: Brand Mention Tracking
  sections.push('brand_mentions');
  try {
    const mentionsResult = await trackBrandMentions(client, {
      brand_name: brand,
      time_window: daysBack <= 1 ? '24h' : daysBack <= 7 ? '7d' : '30d',
      max_results: 200,
    });

    markdown += `## 1. Brand Mention Tracking\n\n`;
    markdown += `| Metric | Value |\n|--------|-------|\n`;
    markdown += `| Total Mentions | ${formatNumber(mentionsResult.total_mentions)} |\n`;
    markdown += `| Unique Authors | ${formatNumber(mentionsResult.unique_authors)} |\n`;
    markdown += `| Total Likes | ${formatNumber(mentionsResult.engagement.total_likes)} |\n`;
    markdown += `| Total Retweets | ${formatNumber(mentionsResult.engagement.total_retweets)} |\n`;
    markdown += `| Avg Engagement/Post | ${mentionsResult.engagement.avg_engagement_per_post} |\n`;
    markdown += `| Trend Direction | ${mentionsResult.trend_direction} (${mentionsResult.trend_change_pct}%) |\n\n`;

    if (mentionsResult.daily_counts.length > 0) {
      markdown += `### Daily Mention Volume\n\n`;
      markdown += `| Date | Mentions | Engagement |\n|------|----------|------------|\n`;
      for (const day of mentionsResult.daily_counts) {
        markdown += `| ${day.date} | ${day.count} | ${Math.round(day.engagement)} |\n`;
      }
      markdown += `\n`;
    }

    if (mentionsResult.top_posts.length > 0) {
      markdown += `### Top Posts by Engagement\n\n`;
      for (let i = 0; i < Math.min(mentionsResult.top_posts.length, 5); i++) {
        const post = mentionsResult.top_posts[i];
        markdown += `${i + 1}. **@${post.author}** (Engagement: ${post.engagement}, Likes: ${post.likes}, RTs: ${post.retweets})\n`;
        markdown += `   > ${post.text}\n`;
        markdown += `   > [View on X](https://x.com/${post.author}/status/${post.id})\n\n`;
      }
    }
    markdown += `---\n\n`;
  } catch (err) {
    markdown += `## 1. Brand Mention Tracking\n\n⚠️ Error retrieving brand mentions: ${err instanceof Error ? err.message : 'unknown error'}\n\n---\n\n`;
  }

  // Section 2: Competitor Sentiment Analysis (if competitors provided)
  if (competitors.length > 0) {
    sections.push('competitor_sentiment');
    markdown += `## 2. Competitor Sentiment Analysis\n\n`;

    for (const competitor of competitors.slice(0, 4)) {
      try {
        const sentimentResult = await analyzeCompetitorSentiment(client, {
          competitor_name: competitor,
          days_back: daysBack,
          max_results: 100,
        });

        markdown += `### ${competitor}\n\n`;
        markdown += `| Metric | Value |\n|--------|-------|\n`;
        markdown += `| Posts Analyzed | ${sentimentResult.analyzed_posts} |\n`;
        markdown += `| Sentiment Score | ${sentimentResult.sentiment.score} (${sentimentResult.sentiment.label}) |\n`;
        markdown += `| Positive % | ${sentimentResult.sentiment.positive_pct}% |\n`;
        markdown += `| Negative % | ${sentimentResult.sentiment.negative_pct}% |\n`;
        markdown += `| Neutral % | ${sentimentResult.sentiment.neutral_pct}% |\n`;
        markdown += `| Avg Engagement/Post | ${sentimentResult.engagement.avg_engagement_per_post} |\n\n`;

        if (sentimentResult.top_positive_posts.length > 0) {
          markdown += `**Top Positive Post:**\n> ${sentimentResult.top_positive_posts[0].text}\n\n`;
        }
        if (sentimentResult.top_negative_posts.length > 0) {
          markdown += `**Top Negative Post:**\n> ${sentimentResult.top_negative_posts[0].text}\n\n`;
        }
      } catch (err) {
        markdown += `### ${competitor}\n\n⚠️ Error: ${err instanceof Error ? err.message : 'unknown error'}\n\n`;
      }
    }
    markdown += `---\n\n`;
  }

  // Section 3: Share of Voice Comparison
  if (includeSOV && competitors.length >= 1) {
    sections.push('share_of_voice');
    const allBrands = [brand, ...competitors];
    try {
      const sovResult = await compareShareOfVoice(client, {
        competitors: allBrands.slice(0, 5),
        days_back: daysBack,
        max_results_per_competitor: 100,
      });

      markdown += `## 3. Share of Voice Comparison\n\n`;
      markdown += `| Brand | Mentions | SOV % | Total Engagement | Avg Eng/Post | Sentiment |\n`;
      markdown += `|-------|----------|-------|-----------------|--------------|------------|\n`;
      for (const comp of sovResult.competitors) {
        markdown += `| ${comp.name} | ${comp.mention_count} | ${comp.share_of_voice_pct}% | ${formatNumber(comp.total_engagement)} | ${comp.avg_engagement_per_post} | ${comp.sentiment_label} (${comp.sentiment_score}) |\n`;
      }
      markdown += `\n`;
    } catch (err) {
      markdown += `## 3. Share of Voice Comparison\n\n⚠️ Error: ${err instanceof Error ? err.message : 'unknown error'}\n\n`;
    }
    markdown += `---\n\n`;
  }

  // Section 4: Complaints Identification
  if (includeComplaints) {
    sections.push('complaints');
    try {
      const complaintsResult = await identifyComplaints(client, {
        brand_name: brand,
        days_back: daysBack,
        max_results: 200,
      });

      markdown += `## 4. Customer Complaints\n\n`;
      markdown += `**Total Complaints Found:** ${complaintsResult.total_complaints}\n\n`;

      if (complaintsResult.categories.length > 0) {
        markdown += `### Complaint Categories\n\n`;
        markdown += `| Category | Count | Percentage |\n|----------|-------|------------|\n`;
        for (const cat of complaintsResult.categories) {
          markdown += `| ${cat.category} | ${cat.count} | ${cat.pct}% |\n`;
        }
        markdown += `\n`;
      }

      if (complaintsResult.top_complaints.length > 0) {
        markdown += `### Top Complaints by Engagement\n\n`;
        for (let i = 0; i < Math.min(complaintsResult.top_complaints.length, 5); i++) {
          const complaint = complaintsResult.top_complaints[i];
          markdown += `${i + 1}. **[${complaint.category}]** @${complaint.author} (Engagement: ${complaint.engagement})\n`;
          markdown += `   > ${complaint.text}\n`;
          markdown += `   > [View on X](${complaint.url})\n\n`;
        }
      } else {
        markdown += `✅ No significant complaints detected in the analyzed period.\n\n`;
      }
    } catch (err) {
      markdown += `## 4. Customer Complaints\n\n⚠️ Error: ${err instanceof Error ? err.message : 'unknown error'}\n\n`;
    }
    markdown += `---\n\n`;
  }

  // Section 5: Methodology
  sections.push('methodology');
  markdown += `## 5. Methodology\n\n`;
  markdown += `### Sentiment Scoring\n\n`;
  markdown += `Sentiment is scored using a deterministic keyword lexicon approach (no LLM dependency):\n\n`;
  markdown += `- **Positive lexicon:** ${getPositiveLexicon().length} terms (e.g., love, great, amazing, awesome, excellent)\n`;
  markdown += `- **Negative lexicon:** ${getNegativeLexicon().length} terms (e.g., hate, terrible, awful, worst, broken)\n`;
  markdown += `- **Scoring formula:** (positive_count - negative_count) / total_posts\n`;
  markdown += `- **Score range:** -1.0 (fully negative) to +1.0 (fully positive)\n`;
  markdown += `- **Labels:** positive (>0.1), negative (<-0.1), neutral (-0.1 to 0.1)\n\n`;
  markdown += `### Data Source\n\n`;
  markdown += `- **API:** X/Twitter API v2\n`;
  markdown += `- **Endpoint:** GET /2/tweets/search/recent (last 7 days)\n`;
  markdown += `- **Cost:** $0.005 per post read (pay-per-use)\n\n`;
  markdown += `### Limitations\n\n`;
  markdown += `- X API recent search covers only the last 7 days\n`;
  markdown += `- Sentiment scoring is keyword-based and may miss sarcasm, context, or nuanced sentiment\n`;
  markdown += `- Trend API availability depends on your X API access level\n\n`;
  markdown += `---\n\n`;
  markdown += `*Report generated by X-Trend Intelligence MCP Server*\n`;

  return {
    title,
    generated_at: generatedAt,
    brand,
    markdown,
    sections,
  };
}