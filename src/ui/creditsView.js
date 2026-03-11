/* ================================================================
   Credits view

   Builds the credits screen markup from localized labels and a small
   fixed section list.
   ================================================================ */

export function buildCreditsMarkup(T, isPortuguese) {
  // Credits stay intentionally short so this screen works as a clean product
  // close-out rather than a dense legal page.
  const sections = [
    {
      title: isPortuguese ? 'CRIAÇÃO' : 'CREATION',
      items: [
        { label: isPortuguese ? 'Direção, design e código' : 'Direction, design, and code', value: 'Jonis Alves Demamann' },
      ],
    },
    {
      title: isPortuguese ? 'PRODUÇÃO' : 'PRODUCTION',
      items: [
        { label: 'Render', value: 'HTML5 Canvas 2D' },
        { label: isPortuguese ? 'Áudio procedural' : 'Procedural audio', value: 'Web Audio API' },
        { label: isPortuguese ? 'Plataforma' : 'Platform', value: 'Vanilla JavaScript ES Modules' },
      ],
    },
    {
      title: isPortuguese ? 'CONTATO' : 'CONTACT',
      items: [
        { label: 'E-mail', value: 'jonis@outlook.com' },
      ],
    },
  ];

  let html = '<div class="cred-title">' + T('creditsTitle') + '</div>';
  html += '<div class="cred-sub">' + (isPortuguese ? 'INFORMAÇÃO ESSENCIAL' : 'ESSENTIAL INFORMATION') + '</div>';

  sections.forEach(section => {
    html += '<div class="cred-block"><div class="cred-block-title">' + section.title + '</div>';
    section.items.forEach(item => {
      html += '<div class="cred-item"><b>' + item.label + '</b> — ' + item.value + '</div>';
    });
    html += '</div>';
  });

  html += '<div class="cred-sig">' +
    '<div class="cred-sig-name">Jonis Alves Demamann</div>' +
    '<div class="cred-sig-contact"><a href="mailto:jonis@outlook.com">jonis@outlook.com</a></div>' +
  '</div>';
  html += '<div class="cred-copy">© 2025 Jonis Alves Demamann · NODE WARS</div>';
  return html;
}
