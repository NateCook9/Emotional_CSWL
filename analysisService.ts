/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WebR } from 'webr';
import { AggregatedData } from './storageService';

export interface AnalysisResults {
  accuracyModel: {
    oddsRatios: Record<string, number>;
    pValue: Record<string, number>;
  };
  rtModel: {
    coefficients: Record<string, number>;
    pValue: Record<string, number>;
  };
  summary: string;
}

export class AnalysisService {
  private static webR: WebR | null = null;

  static async init() {
    if (!this.webR) {
      this.webR = new WebR();
      await this.webR.init();
      console.log("webR initialized");
      
      try {
        // Attempt to install lme4 for mixed effects modeling
        // This may take a moment on first load
        await this.webR.evalR('webr::install("lme4")');
        console.log("lme4 installed in webR");
      } catch (e) {
        console.warn("Could not install lme4 in webR, will fallback to standard models", e);
      }
    }
  }

  static async runAnalysis(data: AggregatedData[]): Promise<AnalysisResults> {
    try {
      await this.init();
      if (!this.webR) throw new Error("webR not initialized");

      // Convert data to R-friendly format
      const csvData = this.convertToCSV(data);
      if (!csvData) throw new Error("No data provided for analysis");
      
      await (this.webR as any).FS.writeFile('data.csv', csvData);

      const rCode = `
        # Load data
        df <- read.csv('data.csv')
        if (nrow(df) < 2) stop("Insufficient data for analysis")
        
        df$isCorrect <- as.numeric(df$isCorrect)
        df$primeImageUrl <- as.factor(df$primeImageUrl)
        df$participantId <- as.factor(df$participantId)
        df$word <- as.factor(df$word)

        # Attempt to load lme4 for mixed effects
        has_lme4 <- suppressWarnings(require(lme4, quietly = TRUE))
        
        # Check if we have enough levels for random effects
        n_participants <- length(unique(df$participantId))
        n_words <- length(unique(df$word))
        use_mixed <- has_lme4 && n_participants > 1 && n_words > 1
        
        results <- list()

        if (use_mixed) {
          tryCatch({
            # Accuracy Model (GLMM)
            m_acc <- glmer(isCorrect ~ primeImageUrl + (1|participantId) + (1|word), data=df, family=binomial)
            sum_acc <- summary(m_acc)
            results$acc_or <- exp(fixef(m_acc))
            results$acc_p <- coef(sum_acc)[,4]

            # RT Model (LMM)
            m_rt <- lmer(log(responseTime) ~ primeImageUrl + (1|participantId) + (1|word), data=df)
            sum_rt <- summary(m_rt)
            results$rt_coef <- fixef(m_rt)
            results$rt_p <- coef(sum_rt)[,4]
            results$method <- "Mixed Effects Modeling (lme4)"
          }, error = function(e) {
            use_mixed <<- FALSE # Fallback on error
          })
        }
        
        if (!use_mixed) {
          # Fallback to standard models (Fixed effects only)
          m_acc <- glm(isCorrect ~ primeImageUrl, data=df, family=binomial)
          sum_acc <- summary(m_acc)
          results$acc_or <- exp(coef(m_acc))
          results$acc_p <- coef(sum_acc)[,4]

          m_rt <- lm(log(responseTime) ~ primeImageUrl, data=df)
          sum_rt <- summary(m_rt)
          results$rt_coef <- coef(m_rt)
          results$rt_p <- coef(sum_rt)[,4]
          results$method <- "Fixed Effects Modeling (Fallback)"
        }
        
        results
      `;

      const result = await this.webR.evalR(rCode);
      const output = await result.toJs();
      
      // Process output into AnalysisResults interface
      const values = (output as any).values;
      return {
        accuracyModel: {
          oddsRatios: values[0].values,
          pValue: values[1].values,
        },
        rtModel: {
          coefficients: values[2].values,
          pValue: values[3].values,
        },
        summary: values[4].values[0] || "Analysis completed"
      };
    } catch (error: any) {
      const msg = error.message || String(error);
      console.error("R Analysis Error:", msg);
      throw new Error(`R Analysis failed: ${msg}`);
    }
  }

  private static convertToCSV(data: AggregatedData[]): string {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(",")
    ).join("\n");
    return `${headers}\n${rows}`;
  }
}
