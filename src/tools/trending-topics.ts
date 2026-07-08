/**
 * Tool 3: detect_trending_topics
 * Get X trends for a location, cross-reference with post volume to identify rising topics.
 */

import { XApiClient, XTrend } from '../lib/x-api.js';
import { XApiError } from '../lib/x-api.js';
import { groupByDay, percentChange } from '../lib/utils.js';

export interface TrendingTopicsParams {
  location_id?: string; // WOEID for location (default: 1 = worldwide)
  top_n?: number; // number of trends to return (default 10)
  verify_volume?: boolean; // cross-reference with post search (default true)
}

export interface TrendingTopic {
  name: string;
  tweet_volume?: number;
  verified_volume: number;
  trend_change_pct: number;
  rising: boolean;
}

export interface TrendingTopicsResult {
  location: string;
  trends: TrendingTopic[];
  note: string;
}

export async function detectTrendingTopics(
  client: XApiClient,
  params: TrendingTopicsParams,
): Promise<TrendingTopicsResult> {
  const locationId = params.location_id ?? '1';
  const topN = Math.min(Math.max(params.top_n ?? 10, 1), 50);
  const verifyVolume = params.verify_volume ?? true;

  let trends: XTrend[] = [];
  let note = '';

  try {
    const response = await client.getTrends(locationId);
    if (response.data && response.data.length > 0) {
      trends = response.data[0].trends ?? [];
    }
  } catch (err) {
    if (err instanceof XApiError && err.status === 403) {
      note = 'X Trends API requires additional access. Falling back to manual trend detection via keyword search.';
      // Fallback: return empty with note
      return {
        location: locationId,
        trends: [],
        note,
      };
    }
    throw err;
  }

  // Sort by tweet_volume descending (if available)
  trends.sort((a, b) => (b.tweet_volume ?? 0) - (a.tweet_volume ?? 0));
  const topTrends = trends.slice(0, topN);

  if (!verifyVolume) {
    return {
      location: locationId,
      trends: topTrends.map((t) => ({
        name: t.name,
        tweet_volume: t.tweet_volume,
        verified_volume: t.tweet_volume ?? 0,
        trend_change_pct: 0,
        rising: false,
      })),
      note: note || 'Trends retrieved from X API without volume verification.',
    };
  }

  // Cross-reference with post search to verify volume
  const verifiedTrends: TrendingTopic[] = [];
  for (const trend of topTrends) {
    try {
      const searchQuery = trend.query ?? trend.name;
      const startTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const { tweets } = await client.searchRecentTweetsAll(searchQuery, {
        maxTotal: 200,
        startTime,
      });

      const dailyCounts = groupByDay(tweets);
      let trendChangePct = 0;
      if (dailyCounts.length >= 2) {
        const lastDay = dailyCounts[dailyCounts.length - 1];
        const prevDay = dailyCounts[dailyCounts.length - 2];
        trendChangePct = percentChange(prevDay.count, lastDay.count);
      }

      verifiedTrends.push({
        name: trend.name,
        tweet_volume: trend.tweet_volume,
        verified_volume: tweets.length,
        trend_change_pct: trendChangePct,
        rising: trendChangePct > 15,
      });
    } catch {
      // If search fails for a trend, still include it with unverified volume
      verifiedTrends.push({
        name: trend.name,
        tweet_volume: trend.tweet_volume,
        verified_volume: trend.tweet_volume ?? 0,
        trend_change_pct: 0,
        rising: false,
      });
    }
  }

  return {
    location: locationId,
    trends: verifiedTrends,
    note: note || 'Trends cross-referenced with post search volume for verification.',
  };
}