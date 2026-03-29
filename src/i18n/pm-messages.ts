/**
 * Server-side i18n helper for PM actor messages.
 *
 * The PM actor runs outside of React, so it cannot use next-intl hooks.
 * This module loads the message files directly and provides typed accessors.
 */

import zhTW from "../messages/zh-TW.json";
import en from "../messages/en.json";

type Messages = typeof zhTW;

const messagesByLocale: Record<string, Messages> = {
  "zh-TW": zhTW,
  en,
};

function getMessages(locale?: string): Messages {
  return messagesByLocale[locale || "zh-TW"] || messagesByLocale["zh-TW"];
}

// ---- Public helpers used by pm-actor.ts ----

/** Resolve a role key (e.g. "architect") to its display name in the given locale. */
export function getRoleName(role: string, locale?: string): string {
  const msgs = getMessages(locale);
  const roles = msgs.agents.roles as Record<string, string>;
  return roles[role] || role;
}

/** Build the "dispatching single agent" message. */
export function getDispatchMessage(target: string, task: string, locale?: string): string {
  const msgs = getMessages(locale);
  const roleName = getRoleName(target, locale);
  const shortTask = task.length > 80 ? task.slice(0, 77) + "..." : task;
  return msgs.agents.pmMessages.dispatchSingle
    .replace("{role}", roleName)
    .replace("{task}", shortTask);
}

/** Build the "dispatching parallel developers" message. */
export function getParallelDispatchMessage(
  count: number,
  locale?: string,
): string {
  const msgs = getMessages(locale);
  return msgs.agents.pmMessages.dispatchParallel.replace("{count}", String(count));
}

/** Get a fallback message for the given PM action type. */
export function getFallbackMessage(action?: string, locale?: string): string {
  const msgs = getMessages(locale);
  const pm = msgs.agents.pmMessages;
  switch (action) {
    case "dispatch":
      return pm.dispatchFallback;
    case "respond":
      return pm.respondFallback;
    case "complete":
      return pm.completeFallback;
    default:
      return pm.defaultFallback;
  }
}

/** Rate limit retry message. */
export function getRateLimitMessage(locale?: string): string {
  return getMessages(locale).agents.pmMessages.rateLimitRetry;
}

/** API timeout message. */
export function getApiTimeoutMessage(locale?: string): string {
  return getMessages(locale).agents.pmMessages.apiTimeout;
}

/** Partial parallel timeout message. */
export function getPartialTimeoutMessage(
  received: number,
  total: number,
  locale?: string,
): string {
  return getMessages(locale)
    .agents.pmMessages.partialTimeout.replace("{received}", String(received))
    .replace("{total}", String(total));
}

/** All developers done message. */
export function getAllDevelopersDoneMessage(locale?: string): string {
  return getMessages(locale).agents.pmMessages.allDevelopersDone;
}

/** Worker long-running status message. */
export function getWorkerLongRunningMessage(
  role: string,
  minutes: number,
  locale?: string,
): string {
  const roleName = getRoleName(role, locale);
  return getMessages(locale)
    .agents.pmMessages.workerLongRunning.replace("{role}", roleName)
    .replace("{minutes}", String(minutes));
}

/**
 * Get a specialist progress message for the given role and index.
 * These messages include the role name to indicate which agent is working.
 */
export function getSpecialistProgressMessage(
  role: string,
  index: number,
  locale?: string,
): string {
  const msgs = getMessages(locale);
  const progress = msgs.agents.specialistProgress as Record<string, string[]>;
  const roleMessages = progress[role];
  if (!roleMessages || roleMessages.length === 0) {
    // Fallback to generic progress
    return getProgressMessage(index, role, locale);
  }
  return roleMessages[Math.min(index, roleMessages.length - 1)];
}

/** Get the specialist "done" fallback message. */
export function getSpecialistDoneMessage(locale?: string): string {
  return getMessages(locale).agents.pmMessages.specialistDone;
}

/** Sub-task progress messages for junior agents. */
export function getSubTaskProgressMessages(role: string, locale?: string): string[] {
  const msgs = getMessages(locale);
  const p = msgs.agents.pmMessages.progress;
  const roleName = getRoleName(role, locale);
  return [
    p.subTaskWorking.replace("{role}", roleName),
    p.subTaskGenerating.replace("{role}", roleName),
    p.subTaskAlmostDone.replace("{role}", roleName),
  ];
}

/** Senior agent: planning task breakdown message. */
export function getPlanningTasksMessage(role: string, locale?: string): string {
  const roleName = getRoleName(role, locale);
  return getMessages(locale).agents.pmMessages.progress.planningTasks.replace("{role}", roleName);
}

/** Senior agent: synthesizing results message. */
export function getSynthesizingMessage(role: string, locale?: string): string {
  const roleName = getRoleName(role, locale);
  return getMessages(locale).agents.pmMessages.progress.synthesizing.replace("{role}", roleName);
}

/**
 * Build a progress message that includes which agent is currently working.
 * `currentRole` is the role of the agent doing work (e.g. "architect").
 * `index` cycles through the set of progress variants.
 */
export function getProgressMessage(
  index: number,
  currentRole: string,
  locale?: string,
): string {
  const msgs = getMessages(locale);
  const p = msgs.agents.pmMessages.progress;
  const roleName = getRoleName(currentRole, locale);

  const templates = [
    p.analyzing,
    p.planning,
    p.organizing,
    p.dispatching,
    p.confirming,
    p.consolidating,
    p.stillWorking,
    p.almostDone,
  ];

  const tpl = templates[Math.min(index, templates.length - 1)];
  return tpl.replace("{role}", roleName);
}
