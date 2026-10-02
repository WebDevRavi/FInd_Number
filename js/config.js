/**
 * Find the Number - Global Game Configuration
 * Strictly adheres to FIND_THE_NUMBER_CRAZYGAMES_FINAL_MASTER_SPEC.md
 */

export const CONFIG = {
  GAME_TITLE: 'FIND THE NUMBER',
  TOTAL_NUMBERS: 100,
  SHUFFLE_DURATION_MS: 500,
  COUNTDOWN_SECONDS: 2, // Snappier countdown to reduce bounce
  HINTS_PER_ROUND: 3,
  HINT_DURATION_MS: 1200,

  DIFFICULTIES: {
    easy: {
      id: 'easy',
      name: 'EASY',
      badgeClass: 'badge-easy',
      totalNumbers: 20,
      subtitle: 'RELAXED & STEADY (1–20)',
      description: 'Find 1 to 20. Numbers stay in place. Relaxed and quick.',
      bullets: [
        '1 to 20 numbers',
        'Fixed positions',
        'Perfect for quick focus'
      ],
      color: '#3f6854',
      shuffleOnCorrect: false,
      rotateOnShuffle: false,
      stars: [40, 75, 130]
    },
    medium: {
      id: 'medium',
      name: 'MEDIUM',
      badgeClass: 'badge-medium',
      totalNumbers: 50,
      subtitle: 'KEEPS YOU ALERT (1–50)',
      description: 'Find 1 to 50. Numbers glide to new positions after each find.',
      bullets: [
        '1 to 50 numbers',
        'Smooth board shuffles',
        'A greater challenge'
      ],
      color: '#b38b46',
      shuffleOnCorrect: true,
      rotateOnShuffle: false,
      stars: [135, 230, 360]
    },
    hard: {
      id: 'hard',
      name: 'HARD',
      badgeClass: 'badge-hard',
      totalNumbers: 100,
      subtitle: 'THE ULTIMATE CENTURY (1–100)',
      description: 'Find 1 to 100. Numbers glide and rotate 360°. Ultimate test of focus.',
      bullets: [
        '1 to 100 numbers',
        'Shuffles + 360° rotation',
        'Test your limits'
      ],
      color: '#a44d42',
      shuffleOnCorrect: true,
      rotateOnShuffle: true,
      minRotation: 0,
      maxRotation: 360,
      stars: [320, 520, 800]
    }
  },

  CAMPAIGN_LEVELS: [
    { level: 1, name: 'First Steps', totalNumbers: 10, shuffle: false, rotate: false, stars: [22, 38, 65] },
    { level: 2, name: 'Warm Up', totalNumbers: 15, shuffle: false, rotate: false, stars: [30, 52, 90] },
    { level: 3, name: 'Quick Eye', totalNumbers: 20, shuffle: false, rotate: false, stars: [40, 70, 120] },
    { level: 4, name: 'Swift Count', totalNumbers: 25, shuffle: false, rotate: false, stars: [50, 85, 145] },
    { level: 5, name: 'First Drift', totalNumbers: 20, shuffle: true, rotate: false, stars: [55, 95, 160] },
    { level: 6, name: 'Smooth Flow', totalNumbers: 25, shuffle: true, rotate: false, stars: [68, 115, 190] },
    { level: 7, name: 'Focus Zone', totalNumbers: 30, shuffle: false, rotate: false, stars: [65, 110, 180] },
    { level: 8, name: 'Active Grid', totalNumbers: 30, shuffle: true, rotate: false, stars: [80, 135, 220] },
    { level: 9, name: 'Sharp Mind', totalNumbers: 40, shuffle: false, rotate: false, stars: [90, 150, 250] },
    { level: 10, name: 'Halfway Mark', totalNumbers: 50, shuffle: true, rotate: false, stars: [135, 220, 350] },
    { level: 11, name: 'Gentle Tilt', totalNumbers: 25, shuffle: false, rotate: true, stars: [60, 100, 170] },
    { level: 12, name: 'Angle Attack', totalNumbers: 35, shuffle: true, rotate: true, stars: [100, 165, 270] },
    { level: 13, name: 'Shifting Tilt', totalNumbers: 40, shuffle: true, rotate: true, stars: [115, 190, 300] },
    { level: 14, name: 'Eagle Eye', totalNumbers: 50, shuffle: true, rotate: true, stars: [145, 235, 370] },
    { level: 15, name: 'True Pace', totalNumbers: 60, shuffle: true, rotate: false, stars: [165, 270, 420] },
    { level: 16, name: 'Steady Hands', totalNumbers: 70, shuffle: false, rotate: false, stars: [175, 285, 450] },
    { level: 17, name: 'The Maze', totalNumbers: 75, shuffle: true, rotate: false, stars: [210, 340, 520] },
    { level: 18, name: 'Full Spin', totalNumbers: 80, shuffle: true, rotate: true, stars: [240, 380, 580] },
    { level: 19, name: 'Century Eve', totalNumbers: 90, shuffle: true, rotate: true, stars: [275, 430, 650] },
    { level: 20, name: 'Grand Century', totalNumbers: 100, shuffle: true, rotate: true, stars: [320, 500, 750] }
  ],

  DAILY_CHALLENGE: {
    totalNumbers: 35,
    shuffle: true,
    rotate: false
  },

  BOARD: {
    PADDING_PERCENT: 5,
    MIN_DISTANCE_RATIO: 0.075,
    MAX_PLACEMENT_ATTEMPTS: 250,
  },

  STORAGE_KEYS: {
    THEME: 'ftn_theme',
    MUSIC: 'ftn_music',
    SOUND: 'ftn_sound',
    VOLUME: 'ftn_volume',
    BEST_TIME_PREFIX: 'ftn_best_time_',
    STATS_PREFIX: 'ftn_stats_',
    CAMPAIGN_PROGRESS: 'ftn_campaign_progress_v2',
    CAMPAIGN_STARS: 'ftn_campaign_stars_v2',
    DAILY_STREAK: 'ftn_daily_streak_v2',
    LAST_DAILY_DATE: 'ftn_last_daily_date_v2',
    UNLOCKED_THEMES: 'ftn_unlocked_themes_v2',
    COINS: 'ftn_coins_v2',
  },

  DEFAULT_THEME: 'dark',
  MUSIC_VOLUME: 0.45,
  SFX_VOLUME: 0.95,
};
