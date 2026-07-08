/**
 * X API v2 client wrapper.
 * Proxies requests to X/Twitter API v2 using the user's bearer token.
 */

export interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
    bookmark_count?: number;
  };
  entities?: {
    hashtags?: { tag: string; start: number; end: number }[];
    mentions?: { username: string; start: number; end: number; id: string }[];
    urls?: { url: string; expanded_url: string; start: number; end: number }[];
  };
  lang?: string;
  referenced_tweets?: { type: 'retweeted' | 'quoted' | 'replied_to'; id: string }[];
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  profile_image_url?: string;
  location?: string;
  url?: string;
}

export interface XTrend {
  name: string;
  query?: string;
  tweet_volume?: number;
}

export interface XSearchResponse {
  data?: XTweet[];
  meta?: {
    next_token?: string;
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
  };
  includes?: {
    users?: XUser[];
    tweets?: XTweet[];
  };
}

export interface XUserResponse {
  data: XUser;
}

export interface XTrendsResponse {
  data?: { trends: XTrend[]; location: string }[];
}

export class XApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'XApiError';
    this.status = status;
    this.body = body;
  }
}

export class XApiClient {
  private bearerToken: string;
  private baseUrl = 'https://api.x.com/2';

  constructor(bearerToken: string) {
    if (!bearerToken) {
      throw new XApiError('X API bearer token is required', 401);
    }
    this.bearerToken = bearerToken;
  }

  private async request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      throw new XApiError(
        `Network error contacting X API: ${err instanceof Error ? err.message : 'unknown'}`,
        503,
      );
    }

    const bodyText = await response.text();
    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = bodyText;
    }

    if (!response.ok) {
      const errorMsg =
        (body as { title?: string; detail?: string; error?: string })?.title ||
        (body as { error?: string })?.error ||
        `X API returned status ${response.status}`;
      throw new XApiError(errorMsg, response.status, body);
    }

    return body as T;
  }

  /**
   * Search recent tweets (last 7 days).
   */
  async searchRecentTweets(
    query: string,
    opts?: {
      maxResults?: number;
      nextToken?: string;
      startTime?: string;
      endTime?: string;
      tweetFields?: string;
      expansions?: string;
    },
  ): Promise<XSearchResponse> {
    const params: Record<string, string | number | undefined> = {
      query,
      max_results: opts?.maxResults ?? 100,
      'tweet.fields': opts?.tweetFields ?? 'created_at,public_metrics,entities,lang,author_id,referenced_tweets',
      expansions: opts?.expansions ?? 'author_id',
      'user.fields': 'name,username,public_metrics,verified,profile_image_url',
    };
    if (opts?.nextToken) params.next_token = opts.nextToken;
    if (opts?.startTime) params.start_time = opts.startTime;
    if (opts?.endTime) params.end_time = opts.endTime;
    return this.request<XSearchResponse>('/tweets/search/recent', params);
  }

  /**
   * Get user by username.
   */
  async getUserByUsername(username: string): Promise<XUserResponse> {
    return this.request<XUserResponse>(`/users/by/username/${username}`, {
      'user.fields': 'created_at,description,public_metrics,verified,profile_image_url,location,url',
    });
  }

  /**
   * Get user tweets (timeline).
   */
  async getUserTweets(
    userId: string,
    opts?: {
      maxResults?: number;
      nextToken?: string;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<XSearchResponse> {
    const params: Record<string, string | number | undefined> = {
      max_results: opts?.maxResults ?? 100,
      'tweet.fields': 'created_at,public_metrics,entities,lang,referenced_tweets',
      exclude: 'retweets,replies',
    };
    if (opts?.nextToken) params.next_token = opts.nextToken;
    if (opts?.startTime) params.start_time = opts.startTime;
    if (opts?.endTime) params.end_time = opts.endTime;
    return this.request<XSearchResponse>(`/users/${userId}/tweets`, params);
  }

  /**
   * Get a single tweet by ID.
   */
  async getTweet(tweetId: string): Promise<{ data: XTweet }> {
    return this.request<{ data: XTweet }>(`/tweets/${tweetId}`, {
      'tweet.fields': 'created_at,public_metrics,entities,lang,author_id,referenced_tweets',
      expansions: 'author_id',
      'user.fields': 'name,username,public_metrics,verified',
    });
  }

  /**
   * Get trends for a location (if available).
   * Note: This endpoint has limited availability in X API v2.
   */
  async getTrends(locationId?: string): Promise<XTrendsResponse> {
    const params: Record<string, string | number | undefined> = {};
    if (locationId) params.id = locationId;
    return this.request<XTrendsResponse>('/trends', params);
  }

  /**
   * Search recent tweets and paginate to collect more results.
   */
  async searchRecentTweetsAll(
    query: string,
    opts?: {
      maxResults?: number;
      maxTotal?: number;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<{ tweets: XTweet[]; users: XUser[] }> {
    const maxTotal = opts?.maxTotal ?? 200;
    const allTweets: XTweet[] = [];
    const userMap = new Map<string, XUser>();
    let nextToken: string | undefined;

    do {
      const response = await this.searchRecentTweets(query, {
        maxResults: opts?.maxResults ?? 100,
        nextToken,
        startTime: opts?.startTime,
        endTime: opts?.endTime,
      });

      if (response.data) {
        allTweets.push(...response.data);
      }
      if (response.includes?.users) {
        for (const user of response.includes.users) {
          userMap.set(user.id, user);
        }
      }

      nextToken = response.meta?.next_token;
    } while (nextToken && allTweets.length < maxTotal);

    return { tweets: allTweets.slice(0, maxTotal), users: Array.from(userMap.values()) };
  }
}