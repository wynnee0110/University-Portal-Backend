import express from "express";
import { eq, and, sql, getTableColumns, desc, SQL, ilike, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { subjects, departments } from "../db/schema/index.js";


const router = express.Router();


///get all subjects
router.get('/', async (req, res) => {
    try {
        const { department, search, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: SQL[] = [];

        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )!
            );
        }

        if (department) {
            filterConditions.push(
                eq(subjects.departmentId, +(department as string))
            );
        }


        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)

        const totalCount = countResult[0]?.count || 0;

        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: getTableColumns(departments)
            }).from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .limit(limitPerPage)
            .orderBy(desc(subjects.createdAt))
            .offset(offset);

        res.status(200).json({
            subjects: subjectsList,
            pagination: {
                currentPage,
                totalPages: Math.ceil(totalCount / limitPerPage),
                totalItems: totalCount,
                itemsPerPage: limitPerPage
            }

        });



    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/subjects/:id
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });

    const [subject] = await db
        .select({ ...getTableColumns(subjects), department: getTableColumns(departments) })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(eq(subjects.id, id));

    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.status(200).json({ data: subject });
});

// POST /api/subjects
router.post('/', async (req, res) => {
    try {
        const { name, code, description, departmentId } = req.body;
        const [created] = await db
            .insert(subjects)
            .values({ name, code, description, departmentId: Number(departmentId) })
            .returning();
        res.status(201).json({ data: created });
    } catch (e: any) {
        console.error('POST /subjects error:', e);
        if (e?.code === '23505') return res.status(409).json({ error: 'Subject code already exists' });
        res.status(500).json({ error: 'Failed to create subject' });
    }
});

// PUT /api/subjects/:id
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
    try {
        const { name, code, description, departmentId } = req.body;
        const [updated] = await db
            .update(subjects)
            .set({ name, code, description, departmentId: departmentId ? Number(departmentId) : undefined })
            .where(eq(subjects.id, id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Subject not found' });
        res.status(200).json({ data: updated });
    } catch (e: any) {
        console.error('PUT /subjects/:id error:', e);
        if (e?.code === '23505') return res.status(409).json({ error: 'Subject code already exists' });
        res.status(500).json({ error: 'Failed to update subject' });
    }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
    try {
        const [deleted] = await db.delete(subjects).where(eq(subjects.id, id)).returning();
        if (!deleted) return res.status(404).json({ error: 'Subject not found' });
        res.status(200).json({ data: deleted });
    } catch (e: any) {
        console.error('DELETE /subjects/:id error:', e);
        if (e?.code === '23503') return res.status(409).json({ error: 'Cannot delete subject with existing classes' });
        res.status(500).json({ error: 'Failed to delete subject' });
    }
});

export default router;