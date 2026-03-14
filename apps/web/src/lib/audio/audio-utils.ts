/**
 * Apply a Hann window function to the input data in-place.
 */
export function applyHannWindow(data: Float32Array): void {
  const N = data.length;
  for (let i = 0; i < N; i++) {
    data[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
}

/**
 * Compute the magnitude spectrum using a radix-2 FFT.
 * Input must have a power-of-2 length.
 * Returns magnitude array of length N/2.
 */
export function computeMagnitudeSpectrum(data: Float32Array): Float32Array {
  const N = data.length;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  real.set(data);

  fftInPlace(real, imag);

  const halfN = N / 2;
  const magnitudes = new Float32Array(halfN);
  for (let i = 0; i < halfN; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return magnitudes;
}

/**
 * In-place iterative radix-2 FFT (Cooley-Tukey).
 */
function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const N = real.length;
  const logN = Math.log2(N);

  // Bit-reversal permutation
  for (let i = 0; i < N; i++) {
    const j = bitReverse(i, logN);
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly stages
  for (let s = 1; s <= logN; s++) {
    const m = 1 << s;
    const halfM = m >> 1;
    const wReal = Math.cos((2 * Math.PI) / m);
    const wImag = -Math.sin((2 * Math.PI) / m);

    for (let k = 0; k < N; k += m) {
      let curReal = 1;
      let curImag = 0;

      for (let j = 0; j < halfM; j++) {
        const tReal = curReal * real[k + j + halfM] - curImag * imag[k + j + halfM];
        const tImag = curReal * imag[k + j + halfM] + curImag * real[k + j + halfM];

        real[k + j + halfM] = real[k + j] - tReal;
        imag[k + j + halfM] = imag[k + j] - tImag;
        real[k + j] += tReal;
        imag[k + j] += tImag;

        const nextReal = curReal * wReal - curImag * wImag;
        const nextImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
        curImag = nextImag;
      }
    }
  }
}

function bitReverse(x: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1);
    x >>= 1;
  }
  return result;
}

/**
 * Find peaks in an array that exceed the given threshold.
 * Returns indices of peaks.
 */
export function findPeaks(data: number[], threshold: number, minDistance: number = 10): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > threshold && data[i] > data[i - 1] && data[i] >= data[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}
