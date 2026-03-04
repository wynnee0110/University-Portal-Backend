import express from "express";
import { and, desc, eq, ilike, sql, getTableColumns } from "drizzle-orm";
import { db } from "../db/index.js";
import { departments, subjects } from "../db/schema/app.js";

const router = express.Router();

// GET /api/departments – list with search & pagination
router.get("/", async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const conditions = [];
        if (search) {
            conditions.push(ilike(departments.name, `%${search}%`));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(departments)
            .where(whereClause);
        const count = countResult[0]?.count ?? 0;

        const list = await db
            .select({
                ...getTableColumns(departments),
                subjectCount: sql<number>`count(${subjects.id})`,
            })
            .from(departments)
            .leftJoin(subjects, eq(departments.id, subjects.departmentId))
            .where(whereClause)
            .groupBy(departments.id)
            .orderBy(desc(departments.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: list,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: count,
                totalPages: Math.ceil(count / limitPerPage),
            },
        });
    } catch (e) {
        console.error("GET /departments error:", e);
        res.status(500).json({ error: "Failed to get departments" });
    }
});

// GET /api/departments/:id
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid ID" });

    const [dept] = await db
        .select({
            ...getTableColumns(departments),
            subjects: sql<any[]>`json_agg(
                json_build_object('id', ${subjects.id}, 'name', ${subjects.name}, 'code', ${subjects.code})
            ) filter (where ${subjects.id} is not null)`,
        })
        .from(departments)
        .leftJoin(subjects, eq(departments.id, subjects.departmentId))
        .where(eq(departments.id, id))
        .groupBy(departments.id);

    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.status(200).json({ data: dept });
});

// POST /api/departments
router.post("/", async (req, res) => {
    try {
        const { name, code, description } = req.body;
        const [created] = await db
            .insert(departments)
            .values({ name, code, description })
            .returning();
        res.status(201).json({ data: created });
    } catch (e: any) {
        console.error("POST /departments error:", e);
        if (e?.code === "23505") return res.status(409).json({ error: "Department code already exists" });
        res.status(500).json({ error: "Failed to create department" });
    }
});

// PUT /api/departments/:id
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid ID" });
    try {
        const { name, code, description } = req.body;
        const [updated] = await db
            .update(departments)
            .set({ name, code, description })
            .where(eq(departments.id, id))
            .returning();
        if (!updated) return res.status(404).json({ error: "Department not found" });
        res.status(200).json({ data: updated });
    } catch (e: any) {
        console.error("PUT /departments/:id error:", e);
        if (e?.code === "23505") return res.status(409).json({ error: "Department code already exists" });
        res.status(500).json({ error: "Failed to update department" });
    }
});

// DELETE /api/departments/:id
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid ID" });
    try {
        const [deleted] = await db
            .delete(departments)
            .where(eq(departments.id, id))
            .returning();
        if (!deleted) return res.status(404).json({ error: "Department not found" });
        res.status(200).json({ data: deleted });
    } catch (e: any) {
        console.error("DELETE /departments/:id error:", e);
        if (e?.code === "23503") return res.status(409).json({ error: "Cannot delete department with existing subjects" });
        res.status(500).json({ error: "Failed to delete department" });
    }
});

export default router;
