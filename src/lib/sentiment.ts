/**
 * Deterministic sentiment scoring using keyword lexicons.
 * No LLM dependency — pure keyword matching.
 */

import { XTweet } from './x-api.js';

// ~50 positive words
const POSITIVE_LEXICON: ReadonlySet<string> = new Set([
  'love', 'great', 'amazing', 'awesome', 'excellent', 'perfect', 'recommend',
  'best', 'fantastic', 'incredible', 'wonderful', 'outstanding', 'brilliant',
  'superb', 'exceptional', 'impressed', 'happy', 'glad', 'thrilled', 'delighted',
  'enjoy', 'enjoying', 'enjoyed', 'favorite', 'favourite', 'loveit', 'loving',
  'good', 'nice', 'cool', 'impressive', 'remarkable', 'stellar', 'flawless',
  'seamless', 'intuitive', 'beautiful', 'elegant', 'powerful', 'reliable',
  'fast', 'smooth', 'helpful', 'useful', 'valuable', 'game-changer',
  'gamechanger', 'innovative', 'gamechanging', 'thank', 'thanks', 'grateful',
]);

// ~50 negative words
const NEGATIVE_LEXICON: ReadonlySet<string> = new Set([
  'hate', 'terrible', 'awful', 'worst', 'broken', 'sucks', 'disappointed',
  'disappointing', 'scam', 'useless', 'buggy', 'horrible', 'dreadful',
  'pathetic', 'garbage', 'trash', 'crap', 'crappy', 'junk', 'fail', 'failed',
  'failure', 'frustrating', 'frustrated', 'annoying', 'angry', 'furious',
  'ridiculous', 'unacceptable', 'poor', 'slow', 'laggy', 'clunky', 'confusing',
  'overpriced', 'ripoff', 'rip-off', 'waste', 'wasted', 'regret', 'sorry',
  'neveragain', 'avoid', 'warning', 'dangerous', 'insecure', 'unreliable',
  'crash', 'crashing', 'crashed', 'down', 'broken', 'lost', 'stuck',
]);

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  score: number; // -1.0 to 1.0
  label: SentimentLabel;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_posts: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  sample_positive_posts: { id: string; text: string; author?: string; created_at?: string; engagement: number }[];
  sample_negative_posts: { id: string; text: string; author?: string; created_at?: string; engagement: number }[];
}

export interface SingleTweetSentiment {
  label: SentimentLabel;
  positive_words: string[];
  negative_words: string[];
}

/**
 * Tokenize text into lowercase word tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-']/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Score a single tweet's sentiment.
 */
export function scoreTweet(text: string): SingleTweetSentiment {
  const tokens = tokenize(text);
  const positiveWords: string[] = [];
  const negativeWords: string[] = [];

  for (const token of tokens) {
    // Check both exact token and hyphenated variants
    const variants = [token, token.replace(/-/g, '')];
    for (const v of variants) {
      if (POSITIVE_LEXICON.has(v) && !positiveWords.includes(v)) {
        positiveWords.push(v);
      }
      if (NEGATIVE_LEXICON.has(v) && !negativeWords.includes(v)) {
        negativeWords.push(v);
      }
    }
  }

  let label: SentimentLabel = 'neutral';
  if (positiveWords.length > negativeWords.length) {
    label = 'positive';
  } else if (negativeWords.length > positiveWords.length) {
    label = 'negative';
  }

  return { label, positive_words: positiveWords, negative_words: negativeWords };
}

/**
 * Score sentiment across a collection of tweets.
 */
export function scoreSentiment(
  tweets: XTweet[],
  userMap?: Map<string, string>,
): SentimentResult {
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  const positiveSamples: SentimentResult['sample_positive_posts'] = [];
  const negativeSamples: SentimentResult['sample_negative_posts'] = [];

  for (const tweet of tweets) {
    // Skip retweets for sentiment
    const isRetweet = tweet.referenced_tweets?.some((r) => r.type === 'retweeted');
    if (isRetweet) continue;

    const result = scoreTweet(tweet.text);
    const engagement = getEngagementScore(tweet);

    if (result.label === 'positive') {
      positiveCount++;
      if (positiveSamples.length < 5) {
        positiveSamples.push({
          id: tweet.id,
          text: tweet.text,
          author: userMap?.get(tweet.author_id ?? ''),
          created_at: tweet.created_at,
          engagement,
        });
      }
    } else if (result.label === 'negative') {
      negativeCount++;
      if (negativeSamples.length < 5) {
        negativeSamples.push({
          id: tweet.id,
          text: tweet.text,
          author: userMap?.get(tweet.author_id ?? ''),
          created_at: tweet.created_at,
          engagement,
        });
      }
    } else {
      neutralCount++;
    }
  }

  const totalPosts = positiveCount + negativeCount + neutralCount;
  const score = totalPosts > 0 ? (positiveCount - negativeCount) / totalPosts : 0;

  let label: SentimentLabel = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';

  return {
    score: Math.round(score * 100) / 100,
    label,
    positive_count: positiveCount,
    negative_count: negativeCount,
    neutral_count: neutralCount,
    total_posts: totalPosts,
    positive_pct: totalPosts > 0 ? Math.round((positiveCount / totalPosts) * 1000) / 10 : 0,
    negative_pct: totalPosts > 0 ? Math.round((negativeCount / totalPosts) * 1000) / 10 : 0,
    neutral_pct: totalPosts > 0 ? Math.round((neutralCount / totalPosts) * 1000) / 10 : 0,
    sample_positive_posts: positiveSamples,
    sample_negative_posts: negativeSamples,
  };
}

/**
 * Get the positive lexicon as an array (for reports).
 */
export function getPositiveLexicon(): string[] {
  return Array.from(POSITIVE_LEXICON);
}

/**
 * Get the negative lexicon as an array (for reports).
 */
export function getNegativeLexicon(): string[] {
  return Array.from(NEGATIVE_LEXICON);
}

/**
 * Calculate engagement score for a tweet.
 */
function getEngagementScore(tweet: XTweet): number {
  const m = tweet.public_metrics;
  if (!m) return 0;
  return (m.like_count ?? 0) + (m.retweet_count ?? 0) * 2 + (m.reply_count ?? 0) + (m.quote_count ?? 0) * 1.5;
}