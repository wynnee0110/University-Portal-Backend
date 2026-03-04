import AgentApi from "apminsight"
AgentApi.config()
import 'dotenv/config';
import express from 'express';
import subjectsRouter from './routes/subjects.js';
import usersRouter from './routes/users.js';
import cors from 'cors';
import arcjet, { shield, detectBot, tokenBucket } from '@arcjet/node';
import securityMiddleware from './middleware/security.js';
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import classesRouter from './routes/classes.js';

if (!process.env.ARCJET_KEY) {
  throw new Error("ARCJET_KEY is required");
}


const app = express();
const port = 8000;

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: process.env.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE",
      // Tracked by IP address by default, but this can be customized
      // See https://docs.arcjet.com/fingerprints
      //characteristics: ["ip.src"],
      refillRate: 5, // Refill 5 tokens per interval
      interval: 10, // Refill every 10 seconds
      capacity: 10, // Bucket capacity of 10 tokens
    }),
  ],
});

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error("FRONTEND_URL is required");
}

app.use(express.json());

app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

//app.use(securityMiddleware);



app.all('/api/auth/*splat', toNodeHandler(auth));

app.use('/api/subjects', subjectsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/users', usersRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Classroom API!' });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

