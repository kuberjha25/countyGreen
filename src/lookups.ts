import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProjects } from "@/src/store/catalogSlice";
import { fetchCategories, fetchCpDocuments, fetchSources, fetchTimeSlots } from "@/src/store/lookupsSlice";

// Admin-managed option lists, loaded once into Redux and shared by every screen.
export function useSources() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchSources());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.sources);
}

export function useCategories() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.categories);
}

export function useTimeSlots() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchTimeSlots());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.timeSlots);
}

export function useCpDocuments() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchCpDocuments());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.cpDocuments);
}

export function useProjects() {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((s) => s.catalog.projects);
  useEffect(() => {
    if (projects.status === "idle") dispatch(fetchProjects());
  }, [dispatch, projects.status]);
  return projects;
}
