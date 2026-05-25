import { GiteeClient } from './client.js';

export interface GiteeOrg {
  id: number;
  login: string;
  name?: string;
  avatar_url?: string;
  description?: string;
  html_url?: string;
  public_repos?: number;
  members_count?: number;
}

export interface OrgListParams {
  page?: number;
  per_page?: number;
}

export class OrgAPI {
  constructor(private client: GiteeClient) {}

  async list(params: OrgListParams = {}): Promise<GiteeOrg[]> {
    return this.client.request<GiteeOrg[]>('/user/orgs', {
      params: {
        page: params.page || 1,
        per_page: params.per_page || 20,
      },
    });
  }
}
