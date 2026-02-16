export interface DetectedSignal {
  time: number;
  confidence: number;
}

export interface AudioAnalysisResult {
  waveformData: Float32Array;
  duration: number;
  sampleRate: number;
}
