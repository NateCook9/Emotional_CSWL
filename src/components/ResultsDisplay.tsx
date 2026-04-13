/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalysisResults } from "../services/analysisService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";

interface ResultsDisplayProps {
  results: AnalysisResults;
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-left"
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          Statistical Learning Outcomes
          <Badge variant="secondary">R-Powered Analysis</Badge>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy (GLMM)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(results.accuracyModel.oddsRatios).map(([key, val], i) => (
                  <div key={key} className="flex justify-between items-center border-b border-border/50 pb-1">
                    <span className="text-xs font-mono truncate max-w-[120px]" title={key}>{key === '(Intercept)' ? 'Base' : 'Prime Effect'}</span>
                    <div className="text-right">
                      <span className="font-bold text-primary">{(val as number).toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">OR</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 italic">
                Odds Ratios {'>'} 1 indicate a positive influence of the prime on accuracy.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Response Time (LMM)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(results.rtModel.coefficients).map(([key, val], i) => (
                  <div key={key} className="flex justify-between items-center border-b border-border/50 pb-1">
                    <span className="text-xs font-mono truncate max-w-[120px]" title={key}>{key === '(Intercept)' ? 'Base' : 'Prime Effect'}</span>
                    <div className="text-right">
                      <span className="font-bold text-primary">{(val as number).toFixed(3)}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">log(ms)</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 italic">
                Negative coefficients indicate faster response times (learning effect).
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg border text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Methodology Note:</p>
          Analysis performed using WebAssembly-based R (webR). Models account for participant-level and stimulus-level random effects. 
          RT data is log-transformed to normalize positive skew.
        </div>
      </motion.div>
    </div>
  );
}
