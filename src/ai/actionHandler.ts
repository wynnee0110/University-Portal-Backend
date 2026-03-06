import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";
import { eq, ilike, and, like } from "drizzle-orm";
import crypto from "crypto";

/**
 * Executes an action returned by the AI model.
 * The AI only decides the action + filters.
 * This function safely maps that action to real database queries.
 */
export async function executeAiAction(action: any) {

    switch (action.action) {

        /**
         * GET STUDENTS
         * Example:
         * "Show all students"
         * "Find student named John"
         */
        case "get_students": {

            const filters = [eq(user.role, "student")];

            if (action.filters?.name) {
                filters.push(ilike(user.name, `%${action.filters.name}%`));
            }

            if (action.filters?.email) {
                filters.push(ilike(user.email, `%${action.filters.email}%`));
            }

            return db
                .select()
                .from(user)
                .where(and(...filters));
        }

        


        /**
         * COUNT STUDENTS
         * Example:
         * "How many students exist"
         * "How many students start with W"
         */
        case "count_students": {

            const filters = [eq(user.role, "student")];

            // Example: name starts with W
            if (action.filters?.nameStartsWith) {
                filters.push(
                    like(user.name, `${action.filters.nameStartsWith}%`)
                );
            }

            const results = await db
                .select()
                .from(user)
                .where(and(...filters));

            return {
                count: results.length
            };
        }


        /**
         * CREATE STUDENT
         * Example:
         * "Add Lebron James email lebron@gmail.com"
         */
        case "create_student": {

            return db
                .insert(user)
                .values({
                    id: crypto.randomUUID(),
                    name: action.data.name,
                    email: action.data.email,
                    emailVerified: false,
                    role: "student"
                })
                .returning();
        }


        /**
         * DELETE STUDENT
         * Example:
         * "Delete student named John"
         */
        case "delete_student": {

            if (!action.filters?.name) {
                throw new Error("delete_student requires name filter");
            }

            return db
                .delete(user)
                .where(ilike(user.name, `%${action.filters.name}%`))
                .returning();
        }


        default:
            throw new Error(`Unknown AI action: ${action.action}`);
    }
}