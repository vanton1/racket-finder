// server.js (στον backend server σας)
import 'dotenv/config'; // Νέα σύνταξη για import του dotenv
import express from 'express'; // Νέα σύνταξη για import του express
import cors from 'cors'; // Για να επιτρέψετε αιτήματα από τη frontend (διαφορετικό domain)
import fetch from 'node-fetch'; // Διορθώθηκε: από 'fetcha' σε 'fetch'. Εξασφαλίζουμε ότι το node-fetch έχει εισαχθεί σωστά.
import https from 'https'; // Εισαγωγή του module HTTPS
import fs from 'fs'; // Εισαγωγή του module File System για ανάγνωση αρχείων

const app = express();
const PORT = process.env.PORT || 3001; // Η θύρα για το HTTP
const HTTPS_PORT = process.env.HTTPS_PORT || 3443; // Η θύρα για το HTTPS (συνήθως 443 για παραγωγή)

// === Ρυθμίσεις SSL/TLS Πιστοποιητικών ===
// ΣΗΜΑΝΤΙΚΟ: Αλλάξτε αυτές τις διαδρομές ώστε να δείχνουν στα αρχεία πιστοποιητικών σας.
// Για παραγωγή, αυτά τα αρχεία πρέπει να είναι εξαιρετικά ασφαλή και εκτός του public accessible φακέλου.
// Για Let's Encrypt, οι διαδρομές μπορεί να είναι διαφορετικές (π.χ. /etc/letsencrypt/live/yourdomain.com/fullchain.pem)
const privateKeyPath = process.env.SSL_KEY_PATH || './certs/key.pem'; // Διαδρομή προς το ιδιωτικό κλειδί
const certificatePath = process.env.SSL_CERT_PATH || './certs/cert.pem'; // Διαδρομή προς το πιστοποιητικό

let privateKey, certificate;

try {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    certificate = fs.readFileSync(certificatePath, 'utf8');
} catch (error) {
    console.warn(`Προειδοποίηση: Δεν βρέθηκαν αρχεία SSL/TLS πιστοποιητικών ή υπήρξε σφάλμα στην ανάγνωση. Ο HTTPS server δεν θα ξεκινήσει. Σφάλμα: ${error.message}`);
    // Μπορείτε να επιλέξετε να μην ξεκινήσετε καθόλου τον HTTP server αν ο HTTPS είναι απαραίτητος
    // process.exit(1);
}

const credentials = { key: privateKey, cert: certificate };
// === Τέλος Ρυθμίσεων SSL/TLS ===

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

// Ξεκινήστε τον HTTP server (προαιρετικά, μπορεί να χρησιμοποιηθεί για ανακατεύθυνση σε HTTPS)
app.listen(PORT, () => {
    console.log(`Backend HTTP server running on port ${PORT}`);
});

// Ξεκινήστε τον HTTPS server μόνο αν υπάρχουν τα πιστοποιητικά
if (privateKey && certificate) {
    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`Backend HTTPS server running on port ${HTTPS_PORT}`);
    });
}

