/**
 * Tool 2: track_brand_mentions
 * Search for brand name mentions over a time window, return volume trend, engagement stats, top posts.
 */

import { XApiClient } from '../lib/x-api.js';
import { buildUserMap, getTopTweets, aggregateEngagement, groupByDay, truncate, timeWindowToDays, percentChange } from '../lib/utils.js';

export interface BrandMentionsParams {
  brand_name: string;
  time_window?: '24h' | '7d' | '30d'; // default 7d
  max_results?: number; // default 100
}

export interface BrandMentionsResult {
  brand: string;
  time_window: string;
  total_mentions: number;
  daily_counts: { date: string; count: number; engagement: number }[];
  trend_direction: 'up' | 'down' | 'stable';
  trend_change_pct: number;
  engagement: {
    total_likes: number;
    total_retweets: number;
    total_replies: number;
    total_impressions: number;
    avg_engagement_per_post: number;
  };
  top_posts: { id: string; text: string; author: string; engagement: number; likes: number; retweets: number; created_at: string }[];
  unique_authors: number;
}

export async function trackBrandMentions(
  client: XApiClient,
  params: BrandMentionsParams,
): Promise<BrandMentionsResult> {
  const window = params.time_window ?? '7d';
  const daysBack = timeWindowToDays(window);
  const maxResults = Math.min(Math.max(params.max_results ?? 100, 10), 500);

  // X recent search only supports last 7 days, so cap at 7
  const actualDays = Math.min(daysBack, 7);
  const startTime = new Date(Date.now() - actualDays * 24 * 60 * 60 * 1000).toISOString();

  const query = params.brand_name;
  const { tweets, users } = await client.searchRecentTweetsAll(query, {
    maxTotal: maxResults,
    startTime,
  });

  const userMap = buildUserMap(users);
  const dailyCounts = groupByDay(tweets);
  const engagement = aggregateEngagement(tweets);
  const topTweets = getTopTweets(tweets, 10);

  // Calculate trend direction
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  let trendChangePct = 0;
  if (dailyCounts.length >= 2) {
    const recentHalf = dailyCounts.slice(Math.ceil(dailyCounts.length / 2));
    const olderHalf = dailyCounts.slice(0, Math.floor(dailyCounts.length / 2));
    const recentAvg = recentHalf.reduce((s, d) => s + d.count, 0) / (recentHalf.length || 1);
    const olderAvg = olderHalf.reduce((s, d) => s + d.count, 0) / (olderHalf.length || 1);
    trendChangePct = percentChange(olderAvg, recentAvg);
    if (trendChangePct > 10) trendDirection = 'up';
    else if (trendChangePct < -10) trendDirection = 'down';
  }

  const uniqueAuthors = new Set(tweets.map((t) => t.author_id).filter(Boolean)).size;

  return {
    brand: params.brand_name,
    time_window: window,
    total_mentions: tweets.length,
    daily_counts: dailyCounts,
    trend_direction: trendDirection,
    trend_change_pct: trendChangePct,
    engagement: {
      total_likes: engagement.total_likes,
      total_retweets: engagement.total_retweets,
      total_replies: engagement.total_replies,
      total_impressions: engagement.total_impressions,
      avg_engagement_per_post: engagement.avg_engagement_per_post,
    },
    top_posts: topTweets.map((t) => ({
      id: t.id,
      text: truncate(t.text, 280),
      author: userMap.get(tweets.find((tw) => tw.id === t.id)?.author_id ?? '') ?? 'unknown',
      engagement: t.engagement,
      likes: t.likes,
      retweets: t.retweets,
      created_at: t.created_at ?? '',
    })),
    unique_authors: uniqueAuthors,
  };
}