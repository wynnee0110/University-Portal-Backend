import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

/**
 * Validates a raw SQL query against destructive keywords.
 * Returns true if safe, false if dangerous.
 */
function isSafeQuery(query: string): boolean {
    const uppercaseQuery = query.toUpperCase();

    // Keywords that can destroy schema, database, or permissions
    const dangerousKeywords = [
        "DROP",
        "ALTER",
        "TRUNCATE",
        "GRANT",
        "REVOKE",
        "REPLACE",
        "CREATE TABLE",
        "CREATE DATABASE",
        "CREATE ROLE",
        "CREATE USER",
        "CREATE INDEX",
        "CREATE VIEW",
        "CREATE SEQUENCE"
    ];

    for (const keyword of dangerousKeywords) {
        // Simple string matching to see if the keyword is present.
        // We pad with spaces/word boundaries to avoid matching partial words.
        // But to be extra safe, we'll just check if the query contains the keyword standalone
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(uppercaseQuery)) {
            return false;
        }
    }

    return true;
}

/**
 * Executes a raw SQL query returned by the AI model.
 * Validates the query to ensure no structural damage occurs.
 */
export async function executeAiQuery(sqlQuery: string) {
    if (!sqlQuery || typeof sqlQuery !== "string") {
        throw new Error("Invalid SQL query provided by AI.");
    }

    if (!isSafeQuery(sqlQuery)) {
        throw new Error("Blocked: The generated query contains dangerous keywords (e.g., DROP, ALTER, TRUNCATE).");
    }

    try {
        // Execute the raw query safely
        const result = await db.execute(sql.raw(sqlQuery));
        return {
            success: true,
            data: result.rows || result,
            query: sqlQuery // Optionally return the query to let the user see what was run
        };
    } catch (error: any) {
        throw new Error(`Execution failed: ${error.message}`);
    }
}