import { GiteeClient } from './client.js';

export interface GiteeIssue {
  id: number;
  number: string;
  title: string;
  state: string;
  body?: string;
  user?: { login: string };
  assignee?: { login: string };
  labels?: Array<{ name: string; color: string }>;
  comments?: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GiteeComment {
  id: number;
  body: string;
  user?: { login: string };
  created_at: string;
  updated_at: string;
}

export interface IssueListParams {
  state?: string;
  page?: number;
  per_page?: number;
}

export interface IssueCreateParams {
  repo: string;
  title: string;
  body?: string;
  assignee?: string;
}

export interface IssueUpdateParams {
  repo: string;
  title?: string;
  body?: string;
  assignee?: string;
  state?: string;
  labels?: string;
  enterprise?: string;
}

export class IssueAPI {
  constructor(private client: GiteeClient) {}

  async list(owner: string, repo: string, params: IssueListParams = {}): Promise<GiteeIssue[]> {
    return this.client.request<GiteeIssue[]>(`/repos/${owner}/${repo}/issues`, {
      params: {
        state: params.state || 'open',
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }

  async create(owner: string, params: IssueCreateParams): Promise<GiteeIssue> {
    return this.client.request<GiteeIssue>(`/repos/${owner}/issues`, {
      method: 'POST',
      body: params as unknown as Record<string, unknown>,
    });
  }

  async get(owner: string, number: string): Promise<GiteeIssue> {
    return this.client.request<GiteeIssue>(`/repos/${owner}/issues/${number}`);
  }

  async update(owner: string, number: string, params: IssueUpdateParams): Promise<GiteeIssue> {
    const { enterprise, ...payload } = params;
    const endpoint = enterprise
      ? `/enterprises/${enterprise}/issues/${number}`
      : `/repos/${owner}/issues/${number}`;
    return this.client.request<GiteeIssue>(endpoint, {
      method: 'PATCH',
      body: payload as unknown as Record<string, unknown>,
    });
  }

  async close(owner: string, repo: string, number: string): Promise<GiteeIssue> {
    return this.client.request<GiteeIssue>(`/repos/${owner}/issues/${number}`, {
      method: 'PATCH',
      body: { state: 'closed', repo },
    });
  }

  async addComment(owner: string, repo: string, number: string, body: string): Promise<GiteeComment> {
    return this.client.request<GiteeComment>(`/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: 'POST',
      body: { body },
    });
  }

  async listComments(owner: string, repo: string, number: string, params: { page?: number; per_page?: number } = {}): Promise<GiteeComment[]> {
    return this.client.request<GiteeComment[]>(`/repos/${owner}/${repo}/issues/${number}/comments`, {
      params: {
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }
}
