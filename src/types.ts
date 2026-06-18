/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DriveItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  sha: string;
  download_url: string;
  html_url?: string;
  lastModified?: string;
}

export interface CommitInfo {
  sha: string;
  author: string;
  date: string;
  message: string;
}

export interface GithubCredentials {
  token: string;
  owner: string;
  repo: string;
}
