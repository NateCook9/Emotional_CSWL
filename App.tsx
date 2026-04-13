/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ExperimentPhase, ExperimentData, Trial, TrialResult } from './types';
import { STIMULI, PRIME_IMAGES, FILLER_IMAGES } from './constants';
import { ConsentSection } from './components/ConsentSection';
import { TrialComponent } from './components/TrialComponent';
import { ResultsDisplay } from './components/ResultsDisplay';
import { StorageService } from './services/storageService';
import { AnalysisService, AnalysisResults } from './services/analysisService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Database, BarChart3 } from "lucide-react";

export default function App() {
  const [phase, setPhase] = useState<ExperimentPhase>('consent');
  const [participantId] = useState(() => uuidv4());
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [experimentData, setExperimentData] = useState<ExperimentData | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // ... (useMemo for trials remains same)
  const trials = useMemo(() => {
    const shuffledStimuli = [...STIMULI].sort(() => Math.random() - 0.5);
    const shuffledPrimes = [...PRIME_IMAGES].sort(() => Math.random() - 0.5);
    const shuffledFillers = [...FILLER_IMAGES].sort(() => Math.random() - 0.5);

    return shuffledStimuli.map((stimulus, index) => {
      const primeImageUrl = shuffledPrimes[index % shuffledPrimes.length];
      const fillerImageUrl = shuffledFillers[index % shuffledFillers.length];
      const targetSide = Math.random() > 0.5 ? 'left' : 'right';

      return {
        id: `trial-${index}`,
        primeImageUrl,
        stimulus,
        fillerImageUrl,
        targetSide,
      } as Trial;
    });
  }, []);

  useEffect(() => {
    if (phase === 'instructions') {
      setIsPreloading(true);
      const imageUrls = [
        ...PRIME_IMAGES,
        ...FILLER_IMAGES,
        ...STIMULI.map(s => s.targetImageUrl)
      ];
      
      const promises = imageUrls.map(url => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = resolve;
          img.onerror = resolve;
        });
      });

      Promise.all(promises).then(() => setIsPreloading(false));
    }
  }, [phase]);

  const handleConsent = () => {
    setExperimentData({
      participantId,
      startTime: Date.now(),
      results: [],
      browserInfo: navigator.userAgent,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    setPhase('instructions');
  };

  const startExperiment = () => {
    // Unlock audio context for mobile/strict browsers
    const silentAudio = new Audio();
    silentAudio.play().catch(() => {}); 
    setPhase('experiment');
  };

  const handleTrialComplete = async (result: TrialResult) => {
    if (!experimentData) return;

    const updatedResults = [...experimentData.results, result];
    const isLastTrial = currentTrialIndex === trials.length - 1;

    const updatedData = {
      ...experimentData,
      results: updatedResults,
      endTime: isLastTrial ? Date.now() : undefined,
    };
    setExperimentData(updatedData);

    if (isLastTrial) {
      setPhase('completed');
      await runFinalAnalysis(updatedData);
    } else {
      setCurrentTrialIndex(prev => prev + 1);
    }
  };

  const runFinalAnalysis = async (data: ExperimentData) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // 1. Try to save current data to GitHub (optional)
      try {
        await StorageService.saveData(data);
      } catch (e) {
        console.warn("GitHub save failed, continuing with local analysis", e);
      }
      
      // 2. Fetch all historical data
      let allData = await StorageService.fetchAllData();
      
      // 3. If no historical data, use current session data
      if (allData.length === 0) {
        allData = data.results.map(r => ({
          participantId: data.participantId,
          trialId: r.trialId,
          primeImageUrl: r.primeImageUrl,
          word: r.word,
          targetImageUrl: r.targetImageUrl,
          isCorrect: r.isCorrect,
          responseTime: r.responseTime,
          timestamp: r.timestamp
        }));
      }
      
      // 4. Run R analysis
      if (allData.length > 0) {
        const results = await AnalysisService.runAnalysis(allData);
        setAnalysisResults(results);
      } else {
        throw new Error("No data available for analysis");
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      setAnalysisError(error.message || String(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <header className="p-4 border-b flex justify-between items-center bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <h1 className="font-bold tracking-tight text-xl">Word Learning Lab</h1>
        {phase === 'experiment' && (
          <div className="flex items-center gap-4 w-1/3">
            <Progress value={(currentTrialIndex / trials.length) * 100} className="h-2" />
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {currentTrialIndex + 1} / {trials.length}
            </span>
          </div>
        )}
      </header>

      <main className="container mx-auto py-8 px-4">
        <AnimatePresence mode="wait">
          {phase === 'consent' && (
            <motion.div key="consent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ConsentSection onConsent={handleConsent} />
            </motion.div>
          )}

          {phase === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-xl mx-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>In this experiment, you will see a series of images and hear spoken words.</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>First, a <strong>Prime Image</strong> will appear briefly.</li>
                    <li>Then, you will hear a <strong>Spoken Word</strong>.</li>
                    <li>Two images will appear. One is the <strong>Target</strong> and one is a <strong>Filler</strong>.</li>
                    <li>Click on the image you think matches the word you heard.</li>
                  </ul>
                  <p className="font-medium">Please ensure your audio is turned on and you are in a quiet environment.</p>
                  <Button onClick={startExperiment} className="w-full mt-4 py-6 text-lg" disabled={isPreloading}>
                    {isPreloading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading Stimuli...</> : 'Start Experiment'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {phase === 'experiment' && (
            <motion.div
              key={`trial-${currentTrialIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <TrialComponent trial={trials[currentTrialIndex]} onComplete={handleTrialComplete} />
            </motion.div>
          )}

          {phase === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8 max-w-4xl mx-auto py-12"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tighter">Experiment Complete</h2>
                <p className="text-muted-foreground text-lg">Thank you for your participation. We are now processing the statistical learning outcomes.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Session Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Accuracy</p>
                      <p className="text-3xl font-bold">
                        {Math.round((experimentData?.results.filter(r => r.isCorrect).length || 0) / trials.length * 100)}%
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Response Time</p>
                      <p className="text-3xl font-bold">
                        {Math.round((experimentData?.results.reduce((acc, r) => acc + r.responseTime, 0) || 0) / trials.length)}ms
                      </p>
                    </div>
                    <div className="pt-4 flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        const blob = new Blob([JSON.stringify(experimentData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `experiment-results-${participantId}.json`;
                        a.click();
                      }}>Export Session (JSON)</Button>
                      <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Restart Experiment</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 overflow-hidden relative min-h-[400px]">
                  <AnimatePresence mode="wait">
                    {isAnalyzing ? (
                      <motion.div 
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4"
                      >
                        <div className="relative">
                          <BarChart3 className="w-12 h-12 text-primary animate-pulse" />
                          <Loader2 className="w-16 h-16 text-primary/20 animate-spin absolute -inset-2" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Running R Analysis...</h3>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            Performing Mixed Effects Modeling on aggregated data using WebAssembly R.
                          </p>
                        </div>
                      </motion.div>
                    ) : analysisResults ? (
                      <motion.div 
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-6"
                      >
                        <ResultsDisplay results={analysisResults} />
                      </motion.div>
                    ) : analysisError ? (
                      <motion.div 
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4"
                      >
                        <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                          <BarChart3 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-destructive">Analysis Failed</h3>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            {analysisError}
                          </p>
                          <Button variant="outline" size="sm" onClick={() => runFinalAnalysis(experimentData!)}>
                            Retry Analysis
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <Database className="w-12 h-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Configure GitHub Storage to see aggregated learning outcomes.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
