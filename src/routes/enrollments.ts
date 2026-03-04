import express from "express";
import { and, eq, sql, getTableColumns } from "drizzle-orm";
import { db } from "../db/index.js";
import { enrollments, classes } from "../db/schema/app.js";
import { user } from "../db/schema/auth.js";

const router = express.Router();

// GET /api/enrollments?classId= — enrolled students for a class
router.get("/", async (req, res) => {
    try {
        const { classId, page = 1, limit = 20 } = req.query;
        if (!classId) return res.status(400).json({ error: "classId is required" });

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 20), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const classIdNum = Number(classId);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.classId, classIdNum));
        const count = countResult[0]?.count ?? 0;

        const list = await db
            .select({
                studentId: enrollments.studentId,
                classId: enrollments.classId,
                student: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: user.role,
                },
            })
            .from(enrollments)
            .leftJoin(user, eq(enrollments.studentId, user.id))
            .where(eq(enrollments.classId, classIdNum))
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
        console.error("GET /enrollments error:", e);
        res.status(500).json({ error: "Failed to get enrollments" });
    }
});

// POST /api/enrollments — enroll a student
router.post("/", async (req, res) => {
    try {
        const { classId, studentId } = req.body;
        if (!classId || !studentId) return res.status(400).json({ error: "classId and studentId are required" });

        // Check capacity
        const [classData] = await db
            .select({ capacity: classes.capacity })
            .from(classes)
            .where(eq(classes.id, Number(classId)));
        if (!classData) return res.status(404).json({ error: "Class not found" });

        const enrolledResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.classId, Number(classId)));
        const enrolledCount = Number(enrolledResult[0]?.count ?? 0);

        if (enrolledCount >= classData.capacity) {
            return res.status(409).json({ error: "Class is at full capacity" });
        }

        const [created] = await db
            .insert(enrollments)
            .values({ classId: Number(classId), studentId: String(studentId) })
            .returning({
                studentId: enrollments.studentId,
                classId: enrollments.classId,
            });

        res.status(201).json({ data: created });
    } catch (e: any) {
        console.error("POST /enrollments error:", e);
        if (e?.code === "23505") return res.status(409).json({ error: "Student is already enrolled in this class" });
        res.status(500).json({ error: "Failed to enroll student" });
    }
});

// DELETE /api/enrollments/:classId/:studentId — unenroll
router.delete("/:classId/:studentId", async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        const studentId = req.params.studentId;

        const [deleted] = await db
            .delete(enrollments)
            .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
            .returning({
                studentId: enrollments.studentId,
                classId: enrollments.classId,
            });

        if (!deleted) return res.status(404).json({ error: "Enrollment not found" });
        res.status(200).json({ data: deleted });
    } catch (e) {
        console.error("DELETE /enrollments/:classId/:studentId error:", e);
        res.status(500).json({ error: "Failed to unenroll student" });
    }
});

export default router;
