/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Trial, TrialResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';

interface TrialComponentProps {
  trial: Trial;
  onComplete: (result: TrialResult) => void;
}

export function TrialComponent({ trial, onComplete }: TrialComponentProps) {
  const [step, setStep] = useState<'prime' | 'selection'>('prime');
  const [startTime, setStartTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-load audio
    if (audioRef.current) {
      audioRef.current.load();
    }

    // Phase 1: Show Prime
    const timer = setTimeout(() => {
      setStep('selection');
      setStartTime(Date.now());
      if (audioRef.current) {
        // Ensure audio is ready before playing
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error("Audio play failed:", e.message || e);
            // Fallback: maybe show a visual cue that audio should have played
          });
        }
      }
    }, 1500); // 1.5s prime duration

    return () => clearTimeout(timer);
  }, [trial.id]);

  const handleSelection = (selectedImageUrl: string) => {
    const endTime = Date.now();
    const result: TrialResult = {
      trialId: trial.id,
      primeImageUrl: trial.primeImageUrl,
      word: trial.stimulus.word,
      targetImageUrl: trial.stimulus.targetImageUrl,
      fillerImageUrl: trial.fillerImageUrl,
      selectedImageUrl,
      isCorrect: selectedImageUrl === trial.stimulus.targetImageUrl,
      responseTime: endTime - startTime,
      timestamp: Date.now(),
    };
    onComplete(result);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-8 py-12">
      <audio ref={audioRef} src={trial.stimulus.audioUrl} />

      <AnimatePresence mode="wait">
        {step === 'prime' ? (
          <motion.div
            key="prime"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="relative"
          >
            <div className="text-sm font-medium text-muted-foreground mb-4 text-center uppercase tracking-widest">Focus</div>
            <Card className="overflow-hidden border-4 border-primary/20 shadow-2xl">
              <img
                src={trial.primeImageUrl}
                alt="Prime"
                className="w-64 h-64 md:w-80 md:h-80 object-cover"
                referrerPolicy="no-referrer"
              />
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 px-4"
          >
            <div className={`order-${trial.targetSide === 'left' ? '1' : '2'}`}>
              <SelectionCard
                imageUrl={trial.stimulus.targetImageUrl}
                onClick={() => handleSelection(trial.stimulus.targetImageUrl)}
                label="Option A"
              />
            </div>
            <div className={`order-${trial.targetSide === 'left' ? '2' : '1'}`}>
              <SelectionCard
                imageUrl={trial.fillerImageUrl}
                onClick={() => handleSelection(trial.fillerImageUrl)}
                label="Option B"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectionCard({ imageUrl, onClick, label }: { imageUrl: string; onClick: () => void; label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <div className="text-xs font-mono text-muted-foreground mb-2 text-center uppercase">{label}</div>
      <Card className="overflow-hidden border-2 hover:border-primary transition-colors shadow-lg">
        <img
          src={imageUrl}
          alt="Option"
          className="w-full aspect-square object-cover"
          referrerPolicy="no-referrer"
        />
      </Card>
    </motion.div>
  );
}
