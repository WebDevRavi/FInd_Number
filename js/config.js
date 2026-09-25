/**
 * Find the Number - Global Game Configuration
 * Strictly adheres to FIND_THE_NUMBER_CRAZYGAMES_FINAL_MASTER_SPEC.md
 */

export const CONFIG = {
  GAME_TITLE: 'FIND THE NUMBER',
  TOTAL_NUMBERS: 100,
  SHUFFLE_DURATION_MS: 600,
  COUNTDOWN_SECONDS: 3,
  HINTS_PER_ROUND: 3,
  HINT_DURATION_MS: 1200,

  DIFFICULTIES: {
    easy: {
      id: 'easy',
      name: 'EASY',
      badgeClass: 'badge-easy',
      subtitle: 'RELAXED & STEADY',
      description: 'Numbers stay in place. No rotation. Perfect for practice.',
      bullets: [
        'Numbers stay in place',
        'No rotation',
        'Perfect for practice'
      ],
      color: '#3f6854',
      shuffleOnCorrect: false,
      rotateOnShuffle: false,
    },
    medium: {
      id: 'medium',
      name: 'MEDIUM',
      badgeClass: 'badge-medium',
      subtitle: 'KEEPS YOU ALERT',
      description: 'Numbers shuffle after each correct tap. No rotation. A greater challenge.',
      bullets: [
        'Numbers shuffle after each correct tap',
        'No rotation',
        'A greater challenge'
      ],
      color: '#b38b46',
      shuffleOnCorrect: true,
      rotateOnShuffle: false,
    },
    hard: {
      id: 'hard',
      name: 'HARD',
      badgeClass: 'badge-hard',
      subtitle: 'FOR TRUE FOCUS',
      description: 'Numbers shuffle after each correct tap. Full 360° rotation. Test your limits.',
      bullets: [
        'Numbers shuffle after each correct tap',
        'Full 360° random rotation',
        'Test your limits'
      ],
      color: '#a44d42',
      shuffleOnCorrect: true,
      rotateOnShuffle: true,
      minRotation: 0,
      maxRotation: 360,
    }
  },

  BOARD: {
    PADDING_PERCENT: 5, // 5% border margin
    MIN_DISTANCE_RATIO: 0.075, // normalized spacing
    MAX_PLACEMENT_ATTEMPTS: 250,
  },

  STORAGE_KEYS: {
    THEME: 'ftn_theme',
    MUSIC: 'ftn_music',
    SOUND: 'ftn_sound',
    VOLUME: 'ftn_volume',
    BEST_TIME_PREFIX: 'ftn_best_time_',
    STATS_PREFIX: 'ftn_stats_',
  },

  DEFAULT_THEME: 'dark',
  MUSIC_VOLUME: 0.45,
  SFX_VOLUME: 0.95,
};
