import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import type { Entry } from "@/src/store/list";
import type { Envelope, InventoryCategory, InventoryUnit, Paginated, Project, Tower } from "@/src/types";

// Projects and "Our Products" (inventory categories, e.g. 500 Sq. Yards).
export type Product = InventoryCategory & { project_id: number; project_name: string; towers: string[]; tower_ids: number[] };
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
          if (!prev.tower_ids.includes(t.id)) prev.tower_ids.push(t.id);
        } else merged.set(key, { ...c, project_id: p.id, project_name: p.name, towers: [towerName], tower_ids: [t.id] });
      }
    }
  }
  return [...merged.values()];
});

// Units of one product (GET /api/inventory per tower — not paginated).
export const fetchProductUnits = createAsyncThunk("catalog/productUnits", async (p: Product) => {
  const lists = await Promise.all(p.tower_ids.map((tower_id) => request<Envelope<InventoryUnit[]>>("/inventory", { query: { project_id: p.project_id, tower_id, category_id: p.id } })));
  return lists.flatMap((r) => r.data ?? []);
});

// "Request for Availability" on a unit (POST /api/inventory-request; the server derives project and tower).
export const requestAvailability = createAsyncThunk("catalog/requestAvailability", async (inventoryId: number) => request<{ message: string }>("/inventory-request", { method: "POST", body: { inventory_id: inventoryId } }));

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
