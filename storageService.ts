/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';
import { TrialResult, ExperimentData } from '../types';

const GITHUB_TOKEN = (import.meta as any).env.VITE_GITHUB_TOKEN;
const GITHUB_REPO = (import.meta as any).env.VITE_GITHUB_REPO;
const GITHUB_PATH = (import.meta as any).env.VITE_GITHUB_PATH;

export interface AggregatedData {
  participantId: string;
  trialId: string;
  primeImageUrl: string;
  word: string;
  targetImageUrl: string;
  isCorrect: boolean;
  responseTime: number;
  timestamp: number;
}

export class StorageService {
  static async saveData(data: ExperimentData): Promise<void> {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      console.warn("GitHub storage not configured. Data will not be saved to GitHub.");
      return;
    }

    const newRows: AggregatedData[] = data.results.map(r => ({
      participantId: data.participantId,
      trialId: r.trialId,
      primeImageUrl: r.primeImageUrl,
      word: r.word,
      targetImageUrl: r.targetImageUrl,
      isCorrect: r.isCorrect,
      responseTime: r.responseTime,
      timestamp: r.timestamp
    }));

    try {
      // 1. Get existing file content (if any)
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
      let existingContent = "";
      let sha = "";

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const fileData = await response.json();
        existingContent = atob(fileData.content);
        sha = fileData.sha;
      }

      // 2. Append new data
      const newCsv = Papa.unparse(newRows, { header: existingContent === "" });
      const updatedContent = existingContent + (existingContent === "" ? "" : "\n") + newCsv;

      // 3. Push back to GitHub
      const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add results for participant ${data.participantId}`,
          content: btoa(updatedContent),
          sha: sha || undefined
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update GitHub: ${updateResponse.statusText}`);
      }

      console.log("Data successfully saved to GitHub.");
    } catch (error) {
      console.error("Error saving to GitHub:", error);
      throw error;
    }
  }

  static async fetchAllData(): Promise<AggregatedData[]> {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return [];
    }

    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) return [];

      const fileData = await response.json();
      const csvContent = atob(fileData.content);
      const parsed = Papa.parse<AggregatedData>(csvContent, { header: true, dynamicTyping: true });
      return parsed.data;
    } catch (error) {
      console.error("Error fetching data from GitHub:", error);
      return [];
    }
  }
}
