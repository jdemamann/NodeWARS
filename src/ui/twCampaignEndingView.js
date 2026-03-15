/* ================================================================
   TentacleWars campaign ending view

   Provides the minimal dedicated ending markup shown after the final
   authored TentacleWars phase is cleared.
   ================================================================ */

/* Keep the TW ending intentionally compact until richer stats are justified. */
export function buildTwCampaignEndingMarkup() {
  return {
    title: 'TENTACLE WARS',
    subtitle: 'Campanha concluida · 80 fases',
    meta: 'Mundo 1 -> Mundo 4',
  };
}
