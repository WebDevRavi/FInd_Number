/**
 * Find the Number - Localized Strings (English)
 * Strictly externalized as per Master Spec Section 25.
 */

export const STRINGS = {
  en: {
    gameTitle: 'FIND THE NUMBER',
    gameSubtitle: 'SIMPLE IDEA. BIG FUN.',
    tagline: 'SAME RULES. DIFFERENT CHALLENGE.',
    mottoTopLeft: 'A SMALL GAME\nA BIG CHALLENGE',
    mottoTopRight: 'PLAY\nPRACTICE\nIMPROVE\nANYWHERE',
    mottoBottomLeft: 'NUMBERS\nSHARPEN\nFOCUS',
    mottoBottomRight: 'Good\nLuck !',
    focusPaysOff: 'FOCUS PAYS OFF.',
    itsJustNumbers: "IT'S JUST NUMBERS.\nYOU GOT THIS.",
    smallStepsBigFocus: 'Small\nSteps\nBig\nFocus',
    numbersMakeSharper: 'Numbers\nMake\nYou\nSharper!',

    // Buttons & Navigation
    play: 'Play →',
    howToPlay: 'How to Play',
    leaderboard: 'Leaderboard',
    settings: 'Settings',
    back: '← Back',
    home: '← Home',
    pause: '❚❚ Pause',
    resume: 'RESUME',
    restart: 'RESTART',
    select: 'Select →',
    playAgain: '↻ Play Again',
    newGame: '▶ New Game',
    close: 'Close',

    // Difficulty Screen
    chooseDifficulty: 'CHOOSE DIFFICULTY',
    chooseDifficultySubtitle: 'SAME RULES. DIFFERENT CHALLENGE.',

    // Gameplay HUD
    findThisNumber: 'FIND THIS NUMBER',
    time: 'TIME',
    found: 'FOUND',
    difficulty: 'DIFFICULTY',

    // Modals
    pausedTitle: 'PAUSED',
    pausedDesc: 'Take a breath. Your progress is saved.',

    howToPlayTitle: 'HOW TO PLAY',
    howToPlayStep1Title: '1. Find Numbers 1 to 100 in Sequence',
    howToPlayStep1Desc: 'Start with 1, then find 2, 3, and continue all the way to 100. All 100 numbers remain on the board at all times.',
    howToPlayStep2Title: '2. No Penalties for Wrong Clicks',
    howToPlayStep2Desc: 'Click freely. Wrong clicks are completely ignored with zero penalty and zero sound. Only the correct next number counts.',
    howToPlayStep3Title: '3. Difficulty Modes',
    howToPlayStep3Desc: 'In Easy, numbers stay still. In Medium, numbers shuffle smoothly across the board after each find. In Hard, numbers shuffle and rotate!',

    settingsTitle: 'SETTINGS',
    themeLabel: 'Theme',
    themeLight: 'Warm Paper (Light)',
    themeDark: 'Chalkboard (Dark)',
    soundLabel: 'Sound Effects',
    soundOn: 'On',
    soundOff: 'Off',
    volumeLabel: 'Volume',

    // Win Screen
    wellDone: 'WELL DONE!',
    foundAll: 'YOU FOUND ALL 100 NUMBERS!',
    yourTime: 'YOUR TIME',
    bestTime: 'BEST TIME',
    newBest: 'NEW BEST!',
    numbersFound: 'NUMBERS FOUND',
    hintsUsed: 'HINTS USED',
    shuffles: 'SHUFFLES',

    // Countdown
    ready: 'READY?',
    go: 'GO!'
  }
};

export function t(key) {
  return STRINGS.en[key] || key;
}
