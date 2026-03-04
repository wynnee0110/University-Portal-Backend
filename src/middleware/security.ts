import type { NextFunction, Request, Response } from "express";
import aj from "../config/arcjet.ts";
import { slidingWindow } from "@arcjet/node";
import type { ArcjetNodeRequest } from "@arcjet/node";

type RateLimitRole = 'admin' | 'teacher' | 'student' | 'guest';



const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    try {
        const role: RateLimitRole = req.user?.role ?? 'guest';

        let limit: number;
        let message: string;
        switch (role) {
            case 'admin':
                limit = 20;
                message = "Too many requests";
                break;
            case 'teacher':
                limit = 10;
                message = "Too many requests";
                break;
            case 'student':
                limit = 10;
                message = "Too many requests";
                break;
            default:
                limit = 5;
                message = "Too many requests";
                break;
        }

        const client = aj.withRule(
            slidingWindow({
                mode: "LIVE",
                interval: "1m",
                max: limit,

            })
        )

        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.url,
            socket: {
                remoteAddress: req.socket.remoteAddress,

            },

        }

        const decision = await client.protect(arcjetRequest);

        if (decision.isDenied() && decision.reason.isBot()) {
            res.status(403).send(message);
            return;
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            res.status(403).send(message);
            return;
        }

        if (decision.isDenied() && decision.reason.isShield()) {
            res.status(403).send(message);
            return;
        }

        next();


    } catch (error) {
        console.error('arcjet middleware error', error);
        res.status(500).send("Internal server error");
    }


}

export default securityMiddleware;