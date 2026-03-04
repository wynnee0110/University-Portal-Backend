import express from 'express';
import { db } from '../db/index.js';
import { classes } from '../db/schema/app.js';


const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const [createdClass] = await db
            .insert(classes)
            .values({
                ...req.body,
                inviteCode: Math.random().toString(36).substring(2, 9),
                schedules: [],
            })
            .returning({ id: classes.id });

        if (!createdClass) {
            res.status(500).json({ error: 'Failed to create class' });
            return;
        }

        res.status(201).json({ data: createdClass });

    } catch (error) {
        console.error(`POST /classes error`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;