import { useSearchParams } from "react-router-dom";
import type { Process } from "@/types/process";
import type { StageSummary, StageSummaryMap } from "@/hooks/useProcessStageSummaries";

export type ProgressFilter = "all" | "overdue" | "in_progress" | "not_started" | "completed";
export type DueFilter = "all" | "7" | "15" | "30";

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addLocalDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return localDateKey(next);
};

export const formatShortDate = (date: string) => {
  const [, month, day] = date.split("-").map(Number);
  if (!month || !day) return date;
  const monthName = new Intl.DateTimeFormat("es-CL", { month: "short" })
    .format(new Date(2020, month - 1, day))
    .replace(".", "")
    .toLowerCase();
  return `${String(day).padStart(2, "0")}-${monthName}`;
};

export function stageSignals(summary: StageSummary | undefined, today: string) {
  const stages = summary?.stages ?? [];
  const pending = stages.filter((stage) => stage.status !== "completed");
  const overdue = pending.filter((stage) => stage.plannedEnd && stage.plannedEnd < today);
  const upcoming15 = pending
    .filter((stage) => stage.plannedEnd && stage.plannedEnd >= today && stage.plannedEnd <= addLocalDays(new Date(), 15))
    .map((stage) => stage.plannedEnd as string)
    .sort();
  return { stages, pending, overdue, upcoming15 };
}

export function useProcessFilters(processes: Process[], summaries: StageSummaryMap) {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const typeFilter = params.get("type") ?? "all";
  const progressFilter = (params.get("progress") ?? "all") as ProgressFilter;
  const dueFilter = (params.get("due") ?? "all") as DueFilter;
  const entityFilter = params.get("entity") ?? "all";
  const projectFilter = params.get("project") ?? "all";
  const today = localDateKey();

  const setFilter = (key: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const clearFilters = () => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      ["q", "type", "progress", "due", "entity", "project"].forEach((k) => next.delete(k));
      return next;
    }, { replace: true });
  };

  const processTypes = new Set(processes.map((process) => process.process_type ?? "personalizado"));
  const showTypeFilter = processTypes.size > 1;
  const projects = Array.from(
    new Map(
      processes
        .filter((process) => process.project_id)
        .map((process) => [process.project_id as string, process.project_name]),
    ),
  ).sort((a, b) => a[1].localeCompare(b[1], "es"));
  const hasNoProject = processes.some((process) => !process.project_id);
  const showProjectFilter = projects.length > 1 || (projects.length > 0 && hasNoProject);
  const organisms = Array.from(new Set(
    Object.values(summaries).flatMap((summary) => summary.stages.map((stage) => stage.externalEntity).filter((value): value is string => Boolean(value))),
  )).sort((a, b) => a.localeCompare(b, "es"));

  const matchesFilters = (process: Process, omit?: "progress" | "due") => {
    const summary = summaries[process.id];
    const { stages, pending, overdue } = stageSignals(summary, today);
    if (typeFilter !== "all" && (process.process_type ?? "personalizado") !== typeFilter) return false;
    if (projectFilter !== "all" && (projectFilter === "none" ? process.project_id : process.project_id !== projectFilter)) return false;
    if (entityFilter !== "all" && !pending.some((stage) => stage.externalEntity === entityFilter)) return false;
    if (search && !process.title.toLowerCase().includes(search.toLowerCase()) && !process.process_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (omit !== "progress" && progressFilter !== "all") {
      const matchesProgress =
        (progressFilter === "overdue" && overdue.length > 0) ||
        (progressFilter === "in_progress" && summary?.completed !== summary?.total && stages.some((stage) => stage.status === "in_progress" || stage.status === "completed")) ||
        (progressFilter === "not_started" && stages.length > 0 && stages.every((stage) => stage.status === "not_started")) ||
        (progressFilter === "completed" && stages.length > 0 && stages.every((stage) => stage.status === "completed"));
      if (!matchesProgress) return false;
    }
    if (omit !== "due" && dueFilter !== "all") {
      const limit = addLocalDays(new Date(), Number(dueFilter));
      if (!pending.some((stage) => stage.plannedEnd && stage.plannedEnd >= today && stage.plannedEnd <= limit)) return false;
    }
    return true;
  };

  const filteredUnsorted = processes.filter((process) => matchesFilters(process));
  const overdueCount = processes.filter((process) => matchesFilters(process, "progress") && stageSignals(summaries[process.id], today).overdue.length > 0).length;
  const upcoming15Count = processes.filter((process) => matchesFilters(process, "due") && stageSignals(summaries[process.id], today).upcoming15.length > 0).length;
  const hasActiveFilters = Boolean(search || typeFilter !== "all" || progressFilter !== "all" || dueFilter !== "all" || entityFilter !== "all" || projectFilter !== "all");

  return {
    today, search, typeFilter, progressFilter, dueFilter, entityFilter, projectFilter,
    setFilter, clearFilters, showTypeFilter, projects, hasNoProject, showProjectFilter, organisms,
    matchesFilters, filteredUnsorted, overdueCount, upcoming15Count, hasActiveFilters,
  };
}

export type ProcessFiltersState = ReturnType<typeof useProcessFilters>;
