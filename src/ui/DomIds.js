/* ================================================================
   DOM id constants

   Centralises every getElementById string so typos are caught at
   module load time rather than at runtime.
   ================================================================ */

export const DOM_IDS = Object.freeze({
  /* HUD */
  HUD:        'hud',
  HBRAND:     'hbrand',
  SP:         'sp',
  SN:         'sn',
  SE:         'se',
  HLVL:       'hlvl',
  HLN:        'hln',
  HPAR:       'hpar',
  HSCORE:     'hscore',
  HFPS:       'hfps',
  HHINTS:     'hhints',
  HPAUSE:     'hpause',
  HLANG:      'hlang',

  /* Canvas */
  CANVAS:     'canvas',

  /* Tooltip */
  DC:         'dc',

  /* Tutorial */
  TUTBOX:     'tutbox',
  TUT_BADGE:  'tutWorldBadge',
  TUT_STEPS:  'tutsteps',
  TUT_TITLE:  'tutTitle',
  TUT_TEXT:   'tutText',
  TUT_NEXT:   'tutNext',
  TUT_EXIT:   'tutExit',

  /* Screens */
  SCREEN_MENU:     'sm',
  SCREEN_LEVELS:   'sl',
  SCREEN_STORY:    'ss',
  SCREEN_RESULT:   'sr',
  SCREEN_ENDING:   'sce',
  SCREEN_PAUSE:    'pm',
  SCREEN_SETTINGS: 'sq',

  /* Menu screen */
  MSUB:       'msub',
  BTN_PLAY:   'btnplay',
  BTN_STORY:  'btnstory',
  BTN_SETTINGS:'btnsettings',
  BTN_LANG_PT:'btnlangpt',
  BTN_LANG_EN:'btnlangen',

  /* Level select */
  SL_TITLE:   'slTitle',
  WORLD_TABS: 'worldTabs',
  LGRID:      'lgrid',
  BTN_BACK:   'btnback',
  WORLD_DESC: 'worldDesc',

  /* Story screen */
  STORY_WRAP:    'storywrap',
  BTN_STORY_BACK:'btnstoryback',
  BTN_STORY_BACK2:'btnstoryback2',

  /* Result screen */
  RTITLE:    'rtitle',
  RSUB:      'rsub',
  RSCORE:    'rscore',
  RINFO:     'rinfo',
  BTN_RL:    'btnrl',
  BTN_RR:    'btnrr',
  BTN_RN:    'btnrn',

  /* Campaign ending screen */
  ENDING_TITLE: 'endingTitle',
  ENDING_SUB:   'endingSub',
  ENDING_BODY:  'endingBody',
  ENDING_STATS: 'endingStats',
  ENDING_QUOTE: 'endingQuote',
  BTN_ENDING_LEVELS: 'btnEndingLevels',
  BTN_ENDING_REPLAY: 'btnEndingReplay',
  BTN_ENDING_MENU:   'btnEndingMenu',

  /* Pause screen */
  PINFO:     'pinfo',
  BTN_RESUME:'btnresume',
  BTN_PRR:   'btnprr',
  BTN_PRL:   'btnprl',
  BTN_PSKIP: 'btnpskip',
  BTN_PMENU: 'btnpmenu',
  PPSAVE:    'ppsave',

  /* Settings screen */
  SETTINGS_BODY:    'settingsBody',
  DEBUG_SETTINGS_GROUP:'debugSettingsGroup',
  WORLD_UNLOCK_GROUP:'worldUnlockGroup',
  MODE_GROUP:        'modeGroup',
  TOG_W2:           'togW2',
  TOG_W3:           'togW3',
  BTN_MODE_CYCLE:   'btnModeCycle',
  TOG_DEBUG:        'togDebug',
  TOG_SOUND:        'togSound',
  TOG_MUSIC:        'togMusic',
  DEBUG_RESET_ROW:  'debugResetRow',
  DEBUG_COPY_ROW:   'debugCopyRow',
  DEBUG_ENDING_ROW: 'debugEndingRow',
  BTN_RESET_PROG:   'btnResetProg',
  BTN_COPY_DEBUG:   'btnCopyDebug',
  BTN_VIEW_ENDING:  'btnViewEnding',
  BTN_SETTINGS_BACK:'btnSettingsBack',
  DEBUG_INFO_PANEL: 'debugInfoPanel',
  DEBUG_INFO_TEXT:  'debugInfoText',
  BTN_FONT_CYCLE:   'btnFontCycle',
  BTN_ZOOM_DEC:     'btnZoomDec',
  BTN_ZOOM_INC:     'btnZoomInc',
  ZOOM_DISPLAY:     'zoomDisplay',
  LANG_ROW_SETTINGS:'langRowSettings',
  MUSIC_PLAYER_ROW: 'musicPlayerRow',
  MUSIC_TRACK_LABEL:'musicTrackLabel',
  BTN_MUSIC_PREV:   'btnMusicPrev',
  BTN_MUSIC_TOGGLE: 'btnMusicToggle',
  BTN_MUSIC_NEXT:   'btnMusicNext',

  /* Credits screen */
  SCREEN_CREDITS:   'scredit',
  CRED_WRAP:        'credWrap',
  BTN_CREDITS:      'btncredits',
  BTN_CREDITS_BACK: 'btncreditsback',

  /* Overlays */
  NOTIFICATIONS:'notifications',
  TOAST:       'toast',
  FADE:        'fade',
  WORLD_BANNER:'worldBanner',
  BOOTMSG:     'bootmsg',
});
