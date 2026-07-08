/**
 * Tool 4: compare_share_of_voice
 * Compare mention counts + engagement for 2-5 competitors over a time window.
 */

import { XApiClient } from '../lib/x-api.js';
import { scoreSentiment } from '../lib/sentiment.js';
import { aggregateEngagement, timeWindowToDays } from '../lib/utils.js';

export interface ShareOfVoiceParams {
  competitors: string[]; // 2-5 brand/competitor names
  days_back?: number; // 1-7
  max_results_per_competitor?: number; // default 100
}

export interface CompetitorSOV {
  name: string;
  mention_count: number;
  total_engagement: number;
  avg_engagement_per_post: number;
  total_likes: number;
  total_retweets: number;
  sentiment_score: number;
  sentiment_label: string;
  share_of_voice_pct: number;
}

export interface ShareOfVoiceResult {
  competitors: CompetitorSOV[];
  time_window_days: number;
  total_mentions: number;
  analysis_note: string;
}

export async function compareShareOfVoice(
  client: XApiClient,
  params: ShareOfVoiceParams,
): Promise<ShareOfVoiceResult> {
  if (params.competitors.length < 2 || params.competitors.length > 5) {
    throw new Error('compare_share_of_voice requires 2-5 competitors');
  }

  const daysBack = Math.min(Math.max(params.days_back ?? 7, 1), 7);
  const maxPerCompetitor = Math.min(Math.max(params.max_results_per_competitor ?? 100, 10), 300);
  const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const results: CompetitorSOV[] = [];
  let totalMentions = 0;

  // Process competitors sequentially to avoid rate limit issues
  for (const competitor of params.competitors) {
    const { tweets, users } = await client.searchRecentTweetsAll(competitor, {
      maxTotal: maxPerCompetitor,
      startTime,
    });

    const userMap = new Map<string, string>();
    for (const u of users) {
      userMap.set(u.id, u.username);
    }

    const engagement = aggregateEngagement(tweets);
    const sentiment = scoreSentiment(tweets, userMap);
    const totalEngagement =
      engagement.total_likes + engagement.total_retweets + engagement.total_replies + engagement.total_quotes;

    results.push({
      name: competitor,
      mention_count: tweets.length,
      total_engagement: totalEngagement,
      avg_engagement_per_post: engagement.avg_engagement_per_post,
      total_likes: engagement.total_likes,
      total_retweets: engagement.total_retweets,
      sentiment_score: sentiment.score,
      sentiment_label: sentiment.label,
      share_of_voice_pct: 0, // calculated below
    });

    totalMentions += tweets.length;
  }

  // Calculate share of voice percentages
  for (const result of results) {
    result.share_of_voice_pct = totalMentions > 0
      ? Math.round((result.mention_count / totalMentions) * 1000) / 10
      : 0;
  }

  // Sort by mention count descending
  results.sort((a, b) => b.mention_count - a.mention_count);

  return {
    competitors: results,
    time_window_days: daysBack,
    total_mentions: totalMentions,
    analysis_note: `Share of voice based on recent post search over the last ${daysBack} day(s). X API recent search covers the last 7 days maximum.`,
  };
}