// server.js (στον backend server σας)
require('dotenv').config(); // Για να φορτώσετε μεταβλητές περιβάλλοντος από .env αρχείο
const express = require('express');
const cors = require('cors'); // Για να επιτρέψετε αιτήματα από τη frontend (διαφορετικό domain)
const fetcha = require('node-fetch'); // Εξασφαλίζουμε ότι το node-fetch έχει εισαχθεί σωστά

const app = express();
const PORT = process.env.PORT || 3001;

// Επιτρέψτε αιτήματα από το frontend σας
// ΣΗΜΑΝΤΙΚΟ: Στην παραγωγή, αντικαταστήστε το '*' με το πραγματικό domain της frontend σας
app.use(cors({ origin: '*' }));
app.use(express.json()); // Για να διαβάζει JSON requests

// Endpoint για τις προτάσεις ρακετών
app.post('/api/gemini-recommendations', async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY; // Το API key σας από μεταβλητές περιβάλλοντος
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    if (!geminiApiKey) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return res.status(500).json({ error: "Server configuration error: API Key is missing." });
    }

    try {
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // Προωθήστε το σώμα του αιτήματος της frontend
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Gemini API error response:", errorData);
            return res.status(geminiResponse.status).json({
                error: "Error from Gemini API",
                details: errorData
            });
        }

        const data = await geminiResponse.json();
        res.json(data); // Επιστρέψτε την απάντηση του Gemini στην frontend
    } catch (error) {
        console.error("Error calling Gemini API for recommendations:", error);
        res.status(500).json({ error: "Internal server error during recommendation fetch." });
    }
});

// Endpoint για τις ερωτήσεις στον ειδικό
app.post('/api/gemini-expert', async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY; // Το API key σας από μεταβλητές περιβάλλοντος
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    if (!geminiApiKey) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return res.status(500).json({ error: "Server configuration error: API Key is missing." });
    }

    try {
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // Προωθήστε το σώμα του αιτήματος της frontend
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Gemini API error response:", errorData);
            return res.status(geminiResponse.status).json({
                error: "Error from Gemini API",
                details: errorData
            });
        }

        const data = await geminiResponse.json();
        res.json(data); // Επιστρέψτε την απάντηση του Gemini στην frontend
    } catch (error) {
        console.error("Error calling Gemini API for expert advice:", error);
        res.status(500).json({ error: "Internal server error during expert advice fetch." });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

