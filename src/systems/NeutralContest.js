import { GAME_BALANCE } from '../config/gameConfig.js';
import { areAlliedOwners, getOwnerTeamId } from './OwnerTeams.js';

const CONTESTING_OWNERS = [1, 2, 3];

export function getNeutralCaptureAllianceMode() {
  return GAME_BALANCE.NEUTRAL_CAPTURE_ALLIANCE_MODE || 'sum';
}

function getRawContestEntries(node) {
  if (!node?.contest) return [];

  return CONTESTING_OWNERS
    .map(owner => ({ owner, score: node.contest[owner] || 0 }))
    .filter(entry => entry.score > 0);
}

function pickCoalitionRepresentativeOwner(coalitionEntries, preferredOwner = null) {
  return coalitionEntries
    .slice()
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (preferredOwner != null) {
        if (left.owner === preferredOwner) return -1;
        if (right.owner === preferredOwner) return 1;
      }
      return left.owner - right.owner;
    })[0]?.owner ?? preferredOwner;
}

export function getDisplayContestEntries(node, mode = getNeutralCaptureAllianceMode()) {
  const rawContestEntries = getRawContestEntries(node);
  if (!rawContestEntries.length) return [];

  /* In coalition-sum mode we keep raw per-owner scores for ownership identity,
     but collapse allied owners into one displayed threshold race. */
  if (mode !== 'sum') {
    return rawContestEntries
      .slice()
      .sort((left, right) => right.score - left.score);
  }

  const coalitionEntriesByTeam = new Map();
  for (const rawEntry of rawContestEntries) {
    const teamId = getOwnerTeamId(rawEntry.owner);
    if (!coalitionEntriesByTeam.has(teamId)) {
      coalitionEntriesByTeam.set(teamId, []);
    }
    coalitionEntriesByTeam.get(teamId).push(rawEntry);
  }

  return Array.from(coalitionEntriesByTeam.values())
    .map(coalitionEntries => ({
      owner: pickCoalitionRepresentativeOwner(coalitionEntries),
      score: coalitionEntries.reduce((sum, coalitionEntry) => sum + coalitionEntry.score, 0),
      contributors: coalitionEntries,
    }))
    .sort((left, right) => right.score - left.score);
}

export function getContestContributorOwners(displayContestEntry) {
  if (!displayContestEntry?.contributors?.length) return [displayContestEntry?.owner].filter(Boolean);
  return displayContestEntry.contributors
    .map(contributor => contributor.owner)
    .filter((owner, index, owners) => owner != null && owners.indexOf(owner) === index);
}

export function getContestCaptureScore(node, owner, mode = getNeutralCaptureAllianceMode()) {
  if (!node?.contest) return 0;
  if (mode !== 'sum') return node.contest[owner] || 0;

  return CONTESTING_OWNERS
    .filter(contestingOwner => areAlliedOwners(contestingOwner, owner))
    .reduce((sum, contestingOwner) => sum + (node.contest[contestingOwner] || 0), 0);
}

export function getContestCaptureOwner(node, owner, mode = getNeutralCaptureAllianceMode()) {
  if (mode !== 'sum') return owner;

  const alliedContestEntries = getRawContestEntries(node)
    .filter(entry => areAlliedOwners(entry.owner, owner));

  if (!alliedContestEntries.length) return owner;
  return pickCoalitionRepresentativeOwner(alliedContestEntries, owner);
}

export function shouldIgnoreAlliedContestContribution(node, owner, mode = getNeutralCaptureAllianceMode()) {
  if (mode !== 'lockout' || !node?.contest) return false;
  if ((node.contest[owner] || 0) > 0) return false;

  /* Lockout mode keeps one allied captor per neutral node so coalition members
     do not interfere with each other's capture lane. */
  return CONTESTING_OWNERS.some(
    contestingOwner =>
      contestingOwner !== owner &&
      areAlliedOwners(contestingOwner, owner) &&
      (node.contest[contestingOwner] || 0) > 0,
  );
}
