import { eq } from 'drizzle-orm';
import { db, pool } from './db/index.js';
import { departments } from './db/schema/index.js';

async function main() {
    try {
        console.log('Performing CRUD operations...');

        // CREATE: Insert a new department
        const [newDept] = await db
            .insert(departments)
            .values({ code: 'CS101', name: 'Computer Science', description: 'CS Dept' })
            .returning();

        if (!newDept) {
            throw new Error('Failed to create department');
        }

        console.log('✅ CREATE: New department created:', newDept);

        // READ: Select the department
        const foundDept = await db.select().from(departments).where(eq(departments.id, newDept.id));
        console.log('✅ READ: Found department:', foundDept[0]);

        // UPDATE: Change the department's name
        const [updatedDept] = await db
            .update(departments)
            .set({ name: 'Advanced Computer Science' })
            .where(eq(departments.id, newDept.id))
            .returning();

        if (!updatedDept) {
            throw new Error('Failed to update department');
        }

        console.log('✅ UPDATE: Department updated:', updatedDept);

        // DELETE: Remove the department
        await db.delete(departments).where(eq(departments.id, newDept.id));
        console.log('✅ DELETE: Department deleted.');

        console.log('\nCRUD operations completed successfully.');
    } catch (error) {
        console.error('❌ Error performing CRUD operations:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('Database pool closed.');
    }
}

main();
