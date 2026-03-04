import express from "express";
import { eq, and, sql, getTableColumns, desc, SQL, ilike } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";

const router = express.Router();

// GET /api/users - list users with optional role filter and pagination
router.get("/", async (req, res) => {
    try {
        const { role, search, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: SQL[] = [];

        if (role) {
            filterConditions.push(eq(user.role, role as "student" | "teacher" | "admin"));
        }

        if (search) {
            filterConditions.push(
                ilike(user.name, `%${search}%`)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(whereClause);

        const totalCount = countResult[0]?.count || 0;

        const usersList = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.image,
                createdAt: user.createdAt,
            })
            .from(user)
            .where(whereClause)
            .limit(limitPerPage)
            .orderBy(desc(user.createdAt))
            .offset(offset);

        res.status(200).json({
            users: usersList,
            pagination: {
                currentPage,
                totalPages: Math.ceil(totalCount / limitPerPage),
                totalItems: totalCount,
                itemsPerPage: limitPerPage,
            },
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
