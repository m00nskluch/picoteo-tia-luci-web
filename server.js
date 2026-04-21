import express from 'express';
import cors from 'cors';
import { handler as getMenuHandler } from './netlify/functions/get-menu.js';

const app = express();
const port = 3000;

app.use(cors());

// Serve static files from the root directory
app.use(express.static('.'));

// Mock Netlify endpoint
app.get('/.netlify/functions/get-menu', async (req, res) => {
  try {
    const response = await getMenuHandler({ httpMethod: 'GET' });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (error) {
    console.error("Error calling mock function:", error);
    res.status(500).json({ error: "Internal Error" });
  }
});

app.listen(port, () => {
  console.log(`Development server running at http://localhost:${port}`);
});
