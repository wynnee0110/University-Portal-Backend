import express from 'express';
import subjectsRouter from './routes/subjects.js';
import cors from 'cors';


const app = express();
const port = 8000;

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

app.use('/api/subjects', subjectsRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Classroom API!' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

