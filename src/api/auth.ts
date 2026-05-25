import { GiteeClient } from './client.js';

export interface GiteeUser {
  login: string;
  name: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  public_repos?: number;
  followers?: number;
  following?: number;
}

export class AuthAPI {
  constructor(private client: GiteeClient) {}

  async verify(token: string): Promise<GiteeUser> {
    return this.client.request<GiteeUser>('/user', { token });
  }

  async getUser(token?: string): Promise<GiteeUser> {
    return this.client.request<GiteeUser>('/user', { token });
  }
}
