/**
 * Utility functions for date formatting, engagement scoring, and data processing.
 */

import { XTweet, XUser } from './x-api.js';

/**
 * Get ISO timestamp for N days/hours ago.
 */
export function getTimeAgo(days: number, hours?: number): string {
  const date = new Date();
  const totalHours = (days * 24) + (hours ?? 0);
  date.setHours(date.getHours() - totalHours);
  return date.toISOString();
}

/**
 * Format date for display.
 */
export function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown';
  try {
    return new Date(isoString).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return isoString;
  }
}

/**
 * Format a date as YYYY-MM-DD (for grouping by day).
 */
export function formatDateDay(isoString?: string): string {
  if (!isoString) return 'Unknown';
  try {
    return new Date(isoString).toISOString().slice(0, 10);
  } catch {
    return 'Unknown';
  }
}

/**
 * Calculate engagement score for a tweet.
 * Weighted: retweets > likes > replies > quotes
 */
export function getEngagementScore(tweet: XTweet): number {
  const m = tweet.public_metrics;
  if (!m) return 0;
  return (
    (m.like_count ?? 0) +
    (m.retweet_count ?? 0) * 2 +
    (m.reply_count ?? 0) +
    (m.quote_count ?? 0) * 1.5
  );
}

/**
 * Calculate engagement rate (engagement / impressions).
 */
export function getEngagementRate(tweet: XTweet): number {
  const m = tweet.public_metrics;
  if (!m || !m.impression_count || m.impression_count === 0) return 0;
  const engagement = (m.like_count ?? 0) + (m.retweet_count ?? 0) + (m.reply_count ?? 0) + (m.quote_count ?? 0);
  return Math.round((engagement / m.impression_count) * 10000) / 100; // as percentage, 2 decimals
}

/**
 * Get top N tweets by engagement score.
 */
export function getTopTweets(tweets: XTweet[], n: number): { id: string; text: string; engagement: number; created_at?: string; author?: string; likes: number; retweets: number; replies: number }[] {
  return tweets
    .filter((t) => !t.referenced_tweets?.some((r) => r.type === 'retweeted'))
    .map((t) => ({
      id: t.id,
      text: t.text,
      engagement: getEngagementScore(t),
      created_at: t.created_at,
      likes: t.public_metrics?.like_count ?? 0,
      retweets: t.public_metrics?.retweet_count ?? 0,
      replies: t.public_metrics?.reply_count ?? 0,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, n);
}

/**
 * Group tweets by day and return daily counts.
 */
export function groupByDay(tweets: XTweet[]): { date: string; count: number; engagement: number }[] {
  const dayMap = new Map<string, { count: number; engagement: number }>();

  for (const tweet of tweets) {
    const day = formatDateDay(tweet.created_at);
    if (day === 'Unknown') continue;
    const existing = dayMap.get(day) ?? { count: 0, engagement: 0 };
    existing.count++;
    existing.engagement += getEngagementScore(tweet);
    dayMap.set(day, existing);
  }

  return Array.from(dayMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate aggregate engagement stats.
 */
export function aggregateEngagement(tweets: XTweet[]): {
  total_likes: number;
  total_retweets: number;
  total_replies: number;
  total_quotes: number;
  total_impressions: number;
  avg_engagement_per_post: number;
} {
  let totalLikes = 0;
  let totalRetweets = 0;
  let totalReplies = 0;
  let totalQuotes = 0;
  let totalImpressions = 0;

  for (const tweet of tweets) {
    const m = tweet.public_metrics;
    if (!m) continue;
    totalLikes += m.like_count ?? 0;
    totalRetweets += m.retweet_count ?? 0;
    totalReplies += m.reply_count ?? 0;
    totalQuotes += m.quote_count ?? 0;
    totalImpressions += m.impression_count ?? 0;
  }

  const count = tweets.length || 1;

  return {
    total_likes: totalLikes,
    total_retweets: totalRetweets,
    total_replies: totalReplies,
    total_quotes: totalQuotes,
    total_impressions: totalImpressions,
    avg_engagement_per_post: Math.round(
      ((totalLikes + totalRetweets + totalReplies + totalQuotes) / count) * 100,
    ) / 100,
  };
}

/**
 * Build a user map from an array of users.
 */
export function buildUserMap(users: XUser[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.id, user.username);
  }
  return map;
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLen: number = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Extract hashtags from a tweet.
 */
export function extractHashtags(tweet: XTweet): string[] {
  return tweet.entities?.hashtags?.map((h) => h.tag) ?? [];
}

/**
 * Count hashtag frequency across tweets.
 */
export function countHashtags(tweets: XTweet[]): { tag: string; count: number }[] {
  const tagMap = new Map<string, number>();
  for (const tweet of tweets) {
    for (const tag of extractHashtags(tweet)) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Categorize a complaint based on keywords in the text.
 */
export function categorizeComplaint(text: string): string {
  const lower = text.toLowerCase();
  const categories: { category: string; keywords: string[] }[] = [
    { category: 'Performance/Speed', keywords: ['slow', 'lag', 'laggy', 'freeze', 'frozen', 'crash', 'crashed', 'crashing', 'loading', 'timeout'] },
    { category: 'Bugs/Errors', keywords: ['bug', 'buggy', 'error', 'broken', 'glitch', 'issue', 'not working', 'doesn\'t work', 'fail', 'failed'] },
    { category: 'Customer Service', keywords: ['support', 'service', 'help', 'response', 'ignore', 'ignored', 'unresponsive', 'no reply', 'customer service'] },
    { category: 'Pricing/Value', keywords: ['expensive', 'overpriced', 'price', 'cost', 'ripoff', 'rip-off', 'waste', 'wasted', 'not worth', 'charge'] },
    { category: 'Quality', keywords: ['quality', 'poor', 'cheap', 'garbage', 'trash', 'junk', 'flimsy', 'defective'] },
    { category: 'Security/Privacy', keywords: ['hack', 'breach', 'data', 'privacy', 'security', 'leak', 'stolen'] },
    { category: 'Usability', keywords: ['confusing', 'complicated', 'difficult', 'hard to use', 'unintuitive', 'clunky', 'interface'] },
    { category: 'General Negative', keywords: ['worst', 'terrible', 'awful', 'horrible', 'hate', 'disappointed', 'disappointing', 'frustrated', 'annoying'] },
  ];

  for (const { category, keywords } of categories) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }
  return 'General Negative';
}

/**
 * Convert time window string to days.
 */
export function timeWindowToDays(window: string): number {
  switch (window) {
    case '24h': return 1;
    case '7d': return 7;
    case '30d': return 30;
    default: return 7;
  }
}

/**
 * Calculate percentage change between two numbers.
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return Math.round(((newValue - oldValue) / oldValue) * 1000) / 10;
}

/**
 * Generate a tweet URL.
 */
export function tweetUrl(username: string | undefined, tweetId: string): string {
  return username ? `https://x.com/${username}/status/${tweetId}` : `https://x.com/i/web/status/${tweetId}`;
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}