/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Stimulus {
  id: string;
  audioUrl: string;
  targetImageUrl: string;
  word: string;
}

export interface Trial {
  id: string;
  primeImageUrl: string;
  stimulus: Stimulus;
  fillerImageUrl: string;
  targetSide: 'left' | 'right';
}

export interface TrialResult {
  trialId: string;
  primeImageUrl: string;
  word: string;
  targetImageUrl: string;
  fillerImageUrl: string;
  selectedImageUrl: string;
  isCorrect: boolean;
  responseTime: number;
  timestamp: number;
}

export interface ExperimentData {
  participantId: string;
  startTime: number;
  endTime?: number;
  results: TrialResult[];
  browserInfo: string;
  screenSize: {
    width: number;
    height: number;
  };
}

export type ExperimentPhase = 'consent' | 'instructions' | 'experiment' | 'completed';
