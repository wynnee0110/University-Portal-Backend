import express from 'express';
import { db } from '../db/index.js';
import { classes } from '../db/schema/app.ts';


const router = express.Router();

router.post('/', async(req, res) => {
    res.json({ message: 'Welcome to the Classroom API!' });
    try {
        const [createdClass] = await db
        .insert(classes)
        .values({
         ...req.body,
         inviteCode: Math.random().toString(36).substring(2,9), 
         schedules:  [],
        })
        .returning ({id: classes.id});
        res.status(201).json(createdClass);

        if (!createdClass) {
            throw new Error('Failed to create class');
            res.status(201).json({ data: createdClass });
        }

    } catch (error) {
        console.error('POST /Classes error ${e}')
        res.status(500).json({ error: 'Internal server error' });
        
    }
});

export default router;