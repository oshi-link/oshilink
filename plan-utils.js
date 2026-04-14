export const PLAN_LIMITS = {
  free: { artists: 1, events: 3, videos: 3, analytics: false, advancedArtistPage: false, priorityLevel: 0 },
  standard: { artists: 3, events: Infinity, videos: Infinity, analytics: true, advancedArtistPage: false, priorityLevel: 1 },
  premium: { artists: Infinity, events: Infinity, videos: Infinity, analytics: true, advancedArtistPage: true, priorityLevel: 2 }
};

export function getPlanLabel(plan) {
  if (plan === 'standard') return 'STANDARD';
  if (plan === 'premium') return 'PREMIUM';
  return 'FREE';
}

export function canCreateCount(plan, type, currentCount) {
  const limit = PLAN_LIMITS[plan]?.[type];
  if (limit === Infinity) return true;
  return currentCount < limit;
}

export function sortByPlanPriority(items) {
  return [...items].sort((a, b) => {
    const planPriority = { free: 0, standard: 1, premium: 2 };
    const scoreA = (a.priority_score ?? 0) + (planPriority[a.owner_plan] ?? 0);
    const scoreB = (b.priority_score ?? 0) + (planPriority[b.owner_plan] ?? 0);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

export function getPlanLimits(plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  return {
    maxArtists: Number.isFinite(limits.artists) ? limits.artists : null,
    maxEvents: Number.isFinite(limits.events) ? limits.events : null,
    maxVideos: Number.isFinite(limits.videos) ? limits.videos : null,
    analytics: limits.analytics,
    advancedArtistPage: limits.advancedArtistPage,
    priorityLevel: limits.priorityLevel
  };
}
