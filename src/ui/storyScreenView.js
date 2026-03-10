function getStoryChapterMeta(chapterTitle) {
  if (!chapterTitle) return { icon: '◈', accentClass: 'story-accent-prologue' };
  if (chapterTitle.includes('WORLD 1') || chapterTitle.includes('MUNDO 1')) return { icon: '◈', accentClass: 'story-accent-genesis' };
  if (chapterTitle.includes('WORLD 2') || chapterTitle.includes('MUNDO 2') || chapterTitle.includes('VOID') || chapterTitle.includes('VAZIO')) return { icon: '⊗', accentClass: 'story-accent-void' };
  if (chapterTitle.includes('WORLD 3') || chapterTitle.includes('MUNDO 3') || chapterTitle.includes('NEXUS')) return { icon: '⚡', accentClass: 'story-accent-nexus' };
  if (chapterTitle.includes('EPILOGUE') || chapterTitle.includes('EPÍLOGO')) return { icon: '✦', accentClass: 'story-accent-epilogue' };
  return { icon: '◈', accentClass: 'story-accent-prologue' };
}

export function buildStoryMarkup(T) {
  const stor = T('stor');
  let html = '<div class="sttitle">' + T('storTitle') + '</div>';
  html += '<div class="story-strip">' +
    '<div class="story-chip story-accent-genesis"><span class="story-chip-icon">◈</span><span>GENESIS</span></div>' +
    '<div class="story-chip story-accent-void"><span class="story-chip-icon">⊗</span><span>VOID</span></div>' +
    '<div class="story-chip story-accent-nexus"><span class="story-chip-icon">⚡</span><span>NEXUS PRIME</span></div>' +
  '</div>';

  stor.forEach(item => {
    if (item.t) {
      const chapterMeta = getStoryChapterMeta(item.t);
      html += '<div class="stchap-card ' + chapterMeta.accentClass + '">' +
        '<div class="stchap-icon">' + chapterMeta.icon + '</div>' +
        '<div class="stchap">' + item.t + '</div>' +
      '</div>';
    }
    if (item.p) html += '<div class="stpara">' + item.p + '</div>';
    if (item.q) html += '<div class="stquote">' + item.q + '</div>';
    if (item.t || item.p || item.q) html += '<hr class="stdivider">';
  });

  return html;
}
