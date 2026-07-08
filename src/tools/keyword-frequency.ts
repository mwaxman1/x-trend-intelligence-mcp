/**
 * Tool 6: monitor_keyword_frequency
 * Track how often a keyword/phrase appears in X posts over time, return daily counts.
 */

import { XApiClient } from '../lib/x-api.js';
import { groupByDay, aggregateEngagement, countHashtags, truncate } from '../lib/utils.js';

export interface KeywordFrequencyParams {
  keyword: string;
  days_back?: number; // 1-7
  max_results?: number; // default 500
}

export interface KeywordFrequencyResult {
  keyword: string;
  total_mentions: number;
  daily_counts: { date: string; count: number; engagement: number }[];
  peak_day: { date: string; count: number } | null;
  avg_daily_mentions: number;
  engagement: {
    total_likes: number;
    total_retweets: number;
    total_replies: number;
    avg_engagement_per_post: number;
  };
  related_hashtags: { tag: string; count: number }[];
  sample_posts: { id: string; text: string; created_at: string }[];
  time_window: string;
}

export async function monitorKeywordFrequency(
  client: XApiClient,
  params: KeywordFrequencyParams,
): Promise<KeywordFrequencyResult> {
  const daysBack = Math.min(Math.max(params.days_back ?? 7, 1), 7);
  const maxResults = Math.min(Math.max(params.max_results ?? 500, 10), 1000);
  const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  // Build query — use exact phrase if multi-word
  const query = params.keyword.includes(' ')
    ? `"${params.keyword}"`
    : params.keyword;

  const { tweets } = await client.searchRecentTweetsAll(query, {
    maxTotal: maxResults,
    startTime,
  });

  const dailyCounts = groupByDay(tweets);
  const engagement = aggregateEngagement(tweets);
  const hashtags = countHashtags(tweets).slice(0, 10);

  // Find peak day
  let peakDay: { date: string; count: number } | null = null;
  if (dailyCounts.length > 0) {
    peakDay = dailyCounts.reduce((max, current) =>
      current.count > max.count ? current : max,
    );
    peakDay = { date: peakDay.date, count: peakDay.count };
  }

  const avgDaily = dailyCounts.length > 0
    ? Math.round((tweets.length / dailyCounts.length) * 100) / 100
    : 0;

  // Sample posts (first 5)
  const samplePosts = tweets.slice(0, 5).map((t) => ({
    id: t.id,
    text: truncate(t.text, 280),
    created_at: t.created_at ?? '',
  }));

  return {
    keyword: params.keyword,
    total_mentions: tweets.length,
    daily_counts: dailyCounts,
    peak_day: peakDay,
    avg_daily_mentions: avgDaily,
    engagement: {
      total_likes: engagement.total_likes,
      total_retweets: engagement.total_retweets,
      total_replies: engagement.total_replies,
      avg_engagement_per_post: engagement.avg_engagement_per_post,
    },
    related_hashtags: hashtags,
    sample_posts: samplePosts,
    time_window: `${daysBack}d`,
  };
}