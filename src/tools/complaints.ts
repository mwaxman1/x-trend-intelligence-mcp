/**
 * Tool 5: identify_complaints
 * Search for posts mentioning a brand + negative keywords, return categorized complaints.
 */

import { XApiClient } from '../lib/x-api.js';
import { buildUserMap, getTopTweets, truncate, categorizeComplaint, timeWindowToDays } from '../lib/utils.js';

export interface ComplaintsParams {
  brand_name: string;
  days_back?: number; // 1-7
  max_results?: number; // default 200
}

export interface Complaint {
  id: string;
  text: string;
  author: string;
  created_at: string;
  engagement: number;
  category: string;
  url: string;
}

export interface ComplaintsResult {
  brand: string;
  total_complaints: number;
  categories: { category: string; count: number; pct: number }[];
  top_complaints: Complaint[];
  query_used: string;
  time_window: string;
}

// Negative keywords to combine with brand name for complaint search
const COMPLAINT_KEYWORDS = [
  'broken', 'worst', 'terrible', 'sucks', 'disappointed', 'disappointing',
  'awful', 'horrible', 'scam', 'useless', 'buggy', 'fail', 'failed',
  'frustrating', 'angry', 'ripoff', 'rip-off', 'waste', 'regret',
  'avoid', 'crash', 'crashed', 'not working', "doesn't work",
].join(' OR ');

export async function identifyComplaints(
  client: XApiClient,
  params: ComplaintsParams,
): Promise<ComplaintsResult> {
  const daysBack = Math.min(Math.max(params.days_back ?? 7, 1), 7);
  const maxResults = Math.min(Math.max(params.max_results ?? 200, 10), 500);
  const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  // Build query: brand AND (negative keywords)
  const query = `(${params.brand_name}) (${COMPLAINT_KEYWORDS})`;

  const { tweets, users } = await client.searchRecentTweetsAll(query, {
    maxTotal: maxResults,
    startTime,
  });

  const userMap = buildUserMap(users);

  // Categorize each complaint
  const complaints: Complaint[] = tweets
    .filter((t) => !t.referenced_tweets?.some((r) => r.type === 'retweeted'))
    .map((t) => {
      const author = userMap.get(t.author_id ?? '') ?? 'unknown';
      const m = t.public_metrics;
      const engagement = (m?.like_count ?? 0) + (m?.retweet_count ?? 0) * 2 + (m?.reply_count ?? 0);
      return {
        id: t.id,
        text: truncate(t.text, 280),
        author,
        created_at: t.created_at ?? '',
        engagement,
        category: categorizeComplaint(t.text),
        url: `https://x.com/${author}/status/${t.id}`,
      };
    });

  // Aggregate by category
  const categoryMap = new Map<string, number>();
  for (const complaint of complaints) {
    categoryMap.set(complaint.category, (categoryMap.get(complaint.category) ?? 0) + 1);
  }

  const categories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      pct: complaints.length > 0 ? Math.round((count / complaints.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Top complaints by engagement
  const topComplaints = [...complaints].sort((a, b) => b.engagement - a.engagement).slice(0, 10);

  return {
    brand: params.brand_name,
    total_complaints: complaints.length,
    categories,
    top_complaints: topComplaints,
    query_used: query,
    time_window: `${daysBack}d`,
  };
}