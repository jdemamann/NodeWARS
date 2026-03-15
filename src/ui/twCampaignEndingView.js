/* ================================================================
   TentacleWars campaign ending view

   Provides the minimal dedicated ending markup shown after the final
   authored TentacleWars phase is cleared.
   ================================================================ */

import { T } from '../localization/i18n.js';

/* Keep the TW ending intentionally compact until richer stats are justified. */
export function buildTwCampaignEndingMarkup() {
  return (
    '<div class="tw-ending-wrap">' +
      '<div class="tw-ending-title">' + T('twEndingTitle') + '</div>' +
      '<div class="tw-ending-divider"></div>' +
      '<div class="tw-ending-sub">' + T('twEndingSub') + '</div>' +
      '<div class="tw-ending-meta">' + T('twEndingMeta') + '</div>' +
    '</div>'
  );
}
