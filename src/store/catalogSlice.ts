import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import type { Entry } from "@/src/store/list";
import type { Envelope, InventoryCategory, Paginated, Project, Tower } from "@/src/types";

// Projects and "Our Products" (inventory categories, e.g. 500 Sq. Yards).
export type Product = InventoryCategory & { project_id: number; project_name: string; towers: string[] };
type CatalogState = { projects: Entry<Project[]>; projectById: Record<number, Entry<Project>>; products: Entry<Product[]> };
const initialState: CatalogState = { projects: { status: "idle" }, projectById: {}, products: { status: "idle" } };

export const fetchProjects = createAsyncThunk("catalog/projects", async () => (await request<Envelope<Paginated<Project>>>("/projects")).data.data);
export const fetchProject = createAsyncThunk("catalog/project", async (id: number) => (await request<Envelope<Project>>(`/projects/${id}`)).data);

// Our Products = inventory categories across every tower of every project
// (GET /api/inventory/towers → /api/inventory/categories per tower), merged by category.
export const fetchProducts = createAsyncThunk("catalog/products", async () => {
  const projects = (await request<Envelope<Paginated<Project>>>("/projects")).data.data;
  const merged = new Map<string, Product>();
  for (const p of projects) {
    const towers = (await request<Envelope<Tower[]>>("/inventory/towers", { query: { project_id: p.id } })).data ?? [];
    for (const t of towers) {
      const cats = (await request<Envelope<InventoryCategory[]>>("/inventory/categories", { query: { project_id: p.id, tower_id: t.id } })).data ?? [];
      for (const c of cats) {
        const key = `${p.id}-${c.id}`;
        const prev = merged.get(key);
        const towerName = t.name || t.tower;
        if (prev) {
          prev.inventories_count = (prev.inventories_count ?? 0) + (c.inventories_count ?? 0);
          if (!prev.towers.includes(towerName)) prev.towers.push(towerName);
        } else merged.set(key, { ...c, project_id: p.id, project_name: p.name, towers: [towerName] });
      }
    }
  }
  return [...merged.values()];
});

const slice = createSlice({
  name: "catalog",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProjects.pending, (s) => {
      s.projects = { ...s.projects, status: "loading", error: undefined };
    })
      .addCase(fetchProjects.fulfilled, (s, a) => {
        s.projects = { data: a.payload ?? [], status: "succeeded" };
      })
      .addCase(fetchProjects.rejected, (s, a) => {
        s.projects = { ...s.projects, status: "failed", error: a.error.message };
      })
      .addCase(fetchProject.pending, (s, a) => {
        s.projectById[a.meta.arg] = { ...s.projectById[a.meta.arg], status: "loading", error: undefined };
      })
      .addCase(fetchProject.fulfilled, (s, a) => {
        s.projectById[a.meta.arg] = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchProject.rejected, (s, a) => {
        s.projectById[a.meta.arg] = { ...s.projectById[a.meta.arg], status: "failed", error: a.error.message };
      })
      .addCase(fetchProducts.pending, (s) => {
        s.products = { ...s.products, status: "loading", error: undefined };
      })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.products = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchProducts.rejected, (s, a) => {
        s.products = { ...s.products, status: "failed", error: a.error.message };
      });
  },
});

export default slice.reducer;
