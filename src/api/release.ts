import { GiteeClient } from './client.js';

export interface GiteeRelease {
  id: number;
  tag_name: string;
  name: string;
  body?: string;
  draft: boolean;
  prerelease: boolean;
  author?: { login: string };
  created_at: string;
  assets?: Array<{ id: number; name: string; size: number; download_count: number }>;
}

export interface ReleaseListParams {
  page?: number;
  per_page?: number;
}

export interface ReleaseCreateParams {
  tag_name: string;
  name: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
}

export class ReleaseAPI {
  constructor(private client: GiteeClient) {}

  async list(owner: string, repo: string, params: ReleaseListParams = {}): Promise<GiteeRelease[]> {
    return this.client.request<GiteeRelease[]>(`/repos/${owner}/${repo}/releases`, {
      params: {
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }

  async create(owner: string, repo: string, params: ReleaseCreateParams): Promise<GiteeRelease> {
    return this.client.request<GiteeRelease>(`/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      body: params as unknown as Record<string, unknown>,
    });
  }
}
