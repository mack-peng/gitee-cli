import { GiteeClient } from './client.js';

export interface GiteeRepo {
  id: number;
  full_name: string;
  name: string;
  description?: string;
  private: boolean;
  fork: boolean;
  html_url: string;
  ssh_url?: string;
  clone_url?: string;
  homepage?: string;
  language?: string;
  forks_count?: number;
  stargazers_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  default_branch?: string;
  created_at: string;
  updated_at: string;
  pushed_at?: string;
  owner?: { login: string };
}

export interface RepoListParams {
  type?: string;
  page?: number;
  per_page?: number;
}

export interface RepoCreateParams {
  name: string;
  private?: boolean;
  description?: string;
  org?: string;
  auto_init?: boolean;
}

export class RepoAPI {
  constructor(private client: GiteeClient) {}

  async listForUser(username: string, params: RepoListParams = {}): Promise<GiteeRepo[]> {
    return this.client.request<GiteeRepo[]>(`/users/${username}/repos`, {
      params: {
        type: params.type || 'all',
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }

  async listOwn(params: RepoListParams = {}): Promise<GiteeRepo[]> {
    return this.client.request<GiteeRepo[]>('/user/repos', {
      params: {
        type: params.type || 'all',
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }

  async get(owner: string, name: string): Promise<GiteeRepo> {
    return this.client.request<GiteeRepo>(`/repos/${owner}/${name}`);
  }

  async create(params: RepoCreateParams): Promise<GiteeRepo> {
    const { org, ...body } = params;
    const endpoint = org ? `/orgs/${org}/repos` : '/user/repos';
    return this.client.request<GiteeRepo>(endpoint, {
      method: 'POST',
      body: { ...body, auto_init: false },
    });
  }

  async delete(owner: string, name: string): Promise<void> {
    await this.client.request(`/repos/${owner}/${name}`, { method: 'DELETE' });
  }
}
