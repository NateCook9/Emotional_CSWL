/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";

interface ConsentSectionProps {
  onConsent: () => void;
}

export function ConsentSection({ onConsent }: ConsentSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-4"
    >
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Informed Consent</CardTitle>
          <CardDescription>Please read the following information carefully before proceeding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm md:text-base leading-relaxed text-muted-foreground">
          <section>
            <h3 className="font-semibold text-foreground mb-1">Purpose of the Experiment</h3>
            <p>
              This study aims to track statistical learning of audio-visual word pairings. 
              We are investigating how participants associate specific spoken words with visual stimuli over time.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">What You Will Do</h3>
            <p>
              You will be presented with a sequence of images and audio files. 
              In each trial, you will see a prime image, followed by an audio clip and two image options. 
              Your task is to select the image you believe is the correct match for the audio. 
              We will record your choices and the time it takes for you to respond.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Data Usage and Storage</h3>
            <p>
              The data collected (responses, response times, and basic browser information) will be stored securely 
              in a cloud database. Your data will be anonymized and used solely for research purposes. 
              No personally identifiable information will be collected unless explicitly requested.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-1">Voluntary Participation</h3>
            <p>
              Participation in this experiment is entirely voluntary. You may choose to stop at any time 
              by closing your browser window. There are no known risks associated with this study.
            </p>
          </section>

          <section className="bg-muted p-3 rounded-md border italic">
            By clicking "I Consent and Proceed" below, you acknowledge that you have read this information, 
            are at least 18 years of age, and voluntarily agree to participate in this study.
          </section>
        </CardContent>
        <CardFooter className="flex justify-center pb-8">
          <Button size="lg" onClick={onConsent} className="px-8 py-6 text-lg font-semibold">
            I Consent and Proceed
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
