import { GiteeClient } from './client.js';

export interface GiteePR {
  id: number;
  number: number;
  title: string;
  state: string;
  body?: string;
  user?: { login: string };
  head?: { label: string; sha: string };
  base?: { label: string; sha: string };
  merged?: boolean;
  merged_at?: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  comments?: number;
  commits?: number;
  changed_files?: number;
}

export interface PRComment {
  id: number;
  body: string;
  user?: { login: string };
  created_at: string;
  updated_at: string;
  path?: string;
  position?: number;
  commit_id?: string;
}

export interface PRFile {
  sha: string;
  filename: string;
  status: string | null;
  additions: string | number;
  deletions: string | number;
  patch?: { diff?: string; new_file?: boolean; deleted_file?: boolean; renamed_file?: boolean };
}

export interface PRListParams {
  state?: string;
  page?: number;
  per_page?: number;
}

export interface PRCreateParams {
  title: string;
  head: string;
  base?: string;
  body?: string;
}

export interface PRReviewParams {
  action: 'approve' | 'request_changes' | 'comment';
  body?: string;
}

export class PrAPI {
  constructor(private client: GiteeClient) {}

  async list(owner: string, repo: string, params: PRListParams = {}): Promise<GiteePR[]> {
    return this.client.request<GiteePR[]>(`/repos/${owner}/${repo}/pulls`, {
      params: {
        state: params.state || 'open',
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }

  async create(owner: string, repo: string, params: PRCreateParams): Promise<GiteePR> {
    return this.client.request<GiteePR>(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: {
        title: params.title,
        head: params.head,
        base: params.base || 'master',
        body: params.body || '',
      },
    });
  }

  async get(owner: string, repo: string, number: string): Promise<GiteePR> {
    return this.client.request<GiteePR>(`/repos/${owner}/${repo}/pulls/${number}`);
  }

  async merge(owner: string, repo: string, number: string, mergeMethod: string, message?: string): Promise<void> {
    const methodMap: Record<string, string> = { merge: 'merge', squash: 'squash', rebase: 'rebase' };
    await this.client.request(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
      method: 'PUT',
      body: {
        merge_method: methodMap[mergeMethod] || 'merge',
        commit_message: message || '',
      },
    });
  }

  async close(owner: string, repo: string, number: string): Promise<GiteePR> {
    return this.client.request<GiteePR>(`/repos/${owner}/${repo}/pulls/${number}`, {
      method: 'PATCH',
      body: { state: 'closed' },
    });
  }

  async addComment(owner: string, repo: string, number: string, body: string): Promise<PRComment> {
    return this.client.request<PRComment>(`/repos/${owner}/${repo}/pulls/${number}/comments`, {
      method: 'POST',
      body: { body },
    });
  }

  async listComments(owner: string, repo: string, number: string, params: { page?: number; per_page?: number } = {}): Promise<PRComment[]> {
    return this.client.request<PRComment[]>(`/repos/${owner}/${repo}/pulls/${number}/comments`, {
      params: {
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }

  async listFiles(owner: string, repo: string, number: string): Promise<PRFile[]> {
    return this.client.request<PRFile[]>(`/repos/${owner}/${repo}/pulls/${number}/files`);
  }

  async submitReview(owner: string, repo: string, number: string, params: PRReviewParams): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/pulls/${number}/review`,
      {
        method: 'POST',
        body: params as unknown as Record<string, unknown>,
      }
    );
  }

  async listReviewComments(owner: string, repo: string, number: string, params: { page?: number; per_page?: number } = {}): Promise<PRComment[]> {
    return this.client.request<PRComment[]>(`/repos/${owner}/${repo}/pulls/${number}/comments`, {
      params: {
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }
}
