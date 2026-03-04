import express from "express";
import { desc, eq, sql, count, getTableColumns } from "drizzle-orm";
import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects } from "../db/schema/app.js";
import { user } from "../db/schema/auth.js";

const router = express.Router();

// GET /api/stats — overview counts and chart data
router.get("/", async (req, res) => {
    try {
        // --- Overview counts ---
        const [usersCount, classesCount, deptsCount, enrollmentsCount, subjectsCount] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(user),
            db.select({ count: sql<number>`count(*)` }).from(classes),
            db.select({ count: sql<number>`count(*)` }).from(departments),
            db.select({ count: sql<number>`count(*)` }).from(enrollments),
            db.select({ count: sql<number>`count(*)` }).from(subjects),
        ]);
        const totalUsers = usersCount[0]?.count ?? 0;
        const totalClasses = classesCount[0]?.count ?? 0;
        const totalDepts = deptsCount[0]?.count ?? 0;
        const totalEnrollments = enrollmentsCount[0]?.count ?? 0;
        const totalSubjects = subjectsCount[0]?.count ?? 0;

        // --- User distribution by role ---
        const usersByRole = await db
            .select({ role: user.role, count: sql<number>`count(*)` })
            .from(user)
            .groupBy(user.role);

        // --- Classes by department ---
        const classesByDept = await db
            .select({
                department: departments.name,
                count: sql<number>`count(${classes.id})`,
            })
            .from(departments)
            .leftJoin(subjects, eq(subjects.departmentId, departments.id))
            .leftJoin(classes, eq(classes.subjectId, subjects.id))
            .groupBy(departments.id, departments.name)
            .orderBy(desc(sql`count(${classes.id})`));

        // --- Capacity status: full vs available ---
        const capacityRaw = await db
            .select({
                classId: classes.id,
                capacity: classes.capacity,
                enrolled: sql<number>`count(${enrollments.studentId})`,
            })
            .from(classes)
            .leftJoin(enrollments, eq(enrollments.classId, classes.id))
            .groupBy(classes.id, classes.capacity);

        const capacityFull = capacityRaw.filter((c) => Number(c.enrolled) >= c.capacity).length;
        const capacityAvailable = capacityRaw.length - capacityFull;

        // --- Enrollment trends (last 6 months, by month) ---
        const enrollmentTrendsResult = await db.execute(sql`
            SELECT
                TO_CHAR(DATE_TRUNC('month', c.created_at), 'Mon YY') as month,
                COUNT(e.student_id) as count
            FROM enrollments e
            JOIN classes c ON e.class_id = c.id
            WHERE c.created_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', c.created_at)
            ORDER BY DATE_TRUNC('month', c.created_at)
        `);
        const enrollmentTrends = enrollmentTrendsResult.rows as { month: string; count: string }[];

        // --- Recent activity (last 5 created classes) ---
        const recentClasses = await db
            .select({
                id: classes.id,
                name: classes.name,
                status: classes.status,
                createdAt: classes.createdAt,
                teacherName: user.name,
                subjectName: subjects.name,
            })
            .from(classes)
            .leftJoin(user, eq(classes.teacherId, user.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .orderBy(desc(classes.createdAt))
            .limit(5);

        res.status(200).json({
            data: {
                overview: {
                    totalUsers: Number(totalUsers),
                    totalClasses: Number(totalClasses),
                    totalDepartments: Number(totalDepts),
                    totalEnrollments: Number(totalEnrollments),
                    totalSubjects: Number(totalSubjects),
                },
                usersByRole: usersByRole.map((r) => ({ role: r.role, count: Number(r.count) })),
                classesByDepartment: classesByDept.map((d) => ({ department: d.department, count: Number(d.count) })),
                capacityStatus: [
                    { label: "Full", value: capacityFull },
                    { label: "Available", value: capacityAvailable },
                ],
                enrollmentTrends: enrollmentTrends.map((r) => ({
                    month: r.month,
                    count: Number(r.count),
                })),
                recentActivity: recentClasses,
            },
        });
    } catch (e) {
        console.error("GET /stats error:", e);
        res.status(500).json({ error: "Failed to get stats" });
    }
});

export default router;
