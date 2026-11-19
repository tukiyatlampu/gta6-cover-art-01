// Colour grades: how each grade treats a photo and a caption. A grade is
// a canvas filter applied while the photo is drawn, plus one or two tint
// overlays blended over the panel, plus the lettering palette. All of it is
// drawn locally — no lookup tables, no network, no Rockstar assets.

export const GRADES = {
  sunset: {
    // Warm, saturated, golden hour.
    filter: 'saturate(1.28) contrast(1.06) brightness(1.02) sepia(0.22)',
    overlays: [
      { type: 'linear', from: [0, 0], to: [0, 0.5], stops: [[0, 'rgba(255,214,140,0.15)'], [1, 'rgba(255,214,140,0)']], blend: 'screen' },
      { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,183,77,0)'], [1, 'rgba(255,94,98,0.36)']], blend: 'soft-light' },
      { type: 'linear', from: [0, 1], to: [0, 0], stops: [[0, 'rgba(123,47,247,0.30)'], [1, 'rgba(123,47,247,0)']], blend: 'overlay' },
    ],
    title: ['#ffe9a8', '#ffd76a', '#ff7a3d', '#ff2e88'],
    titleStroke: '#2a0a3d',
    script: '#ff5db1',
    glow: 'rgba(255,46,136,0.9)',
    scrim: 'rgba(26,8,32,0.55)',
    grain: 0.08,
    vignette: 0.34,
  },
  neon: {
    // Electric cyan/magenta night.
    filter: 'saturate(1.65) contrast(1.12) brightness(1.0) hue-rotate(-8deg)',
    overlays: [
      { type: 'linear', from: [0, 0], to: [1, 1], stops: [[0, 'rgba(34,230,255,0.20)'], [1, 'rgba(255,46,136,0.22)']], blend: 'overlay' },
      { type: 'linear', from: [0, 1], to: [0, 0], stops: [[0, 'rgba(10,4,40,0.30)'], [1, 'rgba(10,4,40,0)']], blend: 'multiply' },
    ],
    title: ['#d8fbff', '#22e6ff', '#ff2e88', '#c44dff'],
    titleStroke: '#0a061f',
    script: '#22e6ff',
    glow: 'rgba(34,230,255,0.95)',
    scrim: 'rgba(6,4,24,0.55)',
    grain: 0.1,
    vignette: 0.4,
  },
  vice: {
    // 80s pink/teal: magenta shadows, teal highlights.
    filter: 'saturate(1.45) contrast(1.08) brightness(1.03) sepia(0.08)',
    overlays: [
      { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(0,229,199,0.16)'], [1, 'rgba(255,46,136,0.26)']], blend: 'soft-light' },
      { type: 'linear', from: [1, 0], to: [0, 1], stops: [[0, 'rgba(255,157,226,0.14)'], [1, 'rgba(255,157,226,0)']], blend: 'screen' },
    ],
    title: ['#ffe3f2', '#ff9de2', '#ff2e88', '#00e5c7'],
    titleStroke: '#33061f',
    script: '#00e5c7',
    glow: 'rgba(255,46,136,0.9)',
    scrim: 'rgba(30,4,32,0.5)',
    grain: 0.09,
    vignette: 0.36,
  },
  noir: {
    // High-contrast black and white, hard shadows.
    filter: 'grayscale(1) contrast(1.35) brightness(1.04)',
    overlays: [
      { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(0,0,0,0.34)']], blend: 'multiply' },
    ],
    title: ['#ffffff', '#f2f2f2', '#c9c9c9', '#8a8a8a'],
    titleStroke: '#000000',
    script: '#ffd76a',
    glow: 'rgba(255,215,106,0.7)',
    scrim: 'rgba(0,0,0,0.55)',
    grain: 0.13,
    vignette: 0.5,
  },
  palm: {
    // Tropical teal-green, warm highlights.
    filter: 'saturate(1.35) contrast(1.05) brightness(1.04) hue-rotate(6deg)',
    overlays: [
      { type: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(184,255,158,0.12)'], [1, 'rgba(14,122,95,0.26)']], blend: 'soft-light' },
      { type: 'linear', from: [0, 0], to: [1, 0], stops: [[0, 'rgba(255,215,106,0.10)'], [1, 'rgba(255,215,106,0)']], blend: 'screen' },
    ],
    title: ['#f2ffe9', '#b8ff9e', '#2ecc71', '#ffd76a'],
    titleStroke: '#06231a',
    script: '#ffd76a',
    glow: 'rgba(46,204,113,0.85)',
    scrim: 'rgba(4,26,18,0.5)',
    grain: 0.07,
    vignette: 0.32,
  },
};

/** A grade by id, falling back to sunset. */
export function gradeOf(id) {
  return GRADES[id] ?? GRADES.sunset;
}
