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

        if (department !== undefined) {
            const departmentRaw = Array.isArray(department) ? department[0] : department;
            const departmentId = Number.parseInt(String(departmentRaw), 10);
            if (!Number.isInteger(departmentId)) {
                return res.status(400).json({ message: "Invalid department query parameter" });
            }
            filterConditions.push(eq(subjects.departmentId, departmentId));
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

export default router;