// Structure the AI must follow

export interface AiResponse {
    action: string;

    filters?: {
        name?: string;
        email?: string;
        attendanceBelow?: number;
    };

    data?: {
        name?: string;
        email?: string;
        role?: string;
    };
}