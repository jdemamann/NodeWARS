/* ================================================================
   NODE WARS v3 — DOM ID Constants

   Centralises every getElementById string so typos are caught at
   module load time rather than at runtime.
   ================================================================ */

export const IDS = Object.freeze({
  /* HUD */
  HUD:        'hud',
  SP:         'sp',
  SN:         'sn',
  SE:         'se',
  HLVL:       'hlvl',
  HLN:        'hln',
  HPAR:       'hpar',
  HSCORE:     'hscore',
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

  /* Screens */
  SCREEN_MENU:     'sm',
  SCREEN_LEVELS:   'sl',
  SCREEN_STORY:    'ss',
  SCREEN_RESULT:   'sr',
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
  TOG_W2:           'togW2',
  TOG_W3:           'togW3',
  TOG_DEBUG:        'togDebug',
  TOG_SOUND:        'togSound',
  TOG_MUSIC:        'togMusic',
  DEBUG_RESET_ROW:  'debugResetRow',
  BTN_RESET_PROG:   'btnResetProg',
  BTN_SETTINGS_BACK:'btnSettingsBack',
  DEBUG_INFO_PANEL: 'debugInfoPanel',
  DEBUG_INFO_TEXT:  'debugInfoText',
  BTN_FONT_CYCLE:   'btnFontCycle',
  BTN_ZOOM_DEC:     'btnZoomDec',
  BTN_ZOOM_INC:     'btnZoomInc',
  ZOOM_DISPLAY:     'zoomDisplay',
  LANG_ROW_SETTINGS:'langRowSettings',

  /* Credits screen */
  SCREEN_CREDITS:   'scredit',
  CRED_WRAP:        'credWrap',
  BTN_CREDITS:      'btncredits',
  BTN_CREDITS_BACK: 'btncreditsback',

  /* Overlays */
  TOAST:       'toast',
  FADE:        'fade',
  WORLD_BANNER:'worldBanner',
  BOOTMSG:     'bootmsg',
});
