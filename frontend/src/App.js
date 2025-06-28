import React, { useState } from 'react';

// === ΡΥΘΜΙΣΗ API KEY & BACKEND URL ===
// Αυτό το κλειδί απαιτείται ΜΟΝΟ αν εκτελείτε την εφαρμογή
// εκτός του περιβάλλοντος του Google Canvas ΚΑΙ χωρίς backend proxy server.
// Εάν χρησιμοποιείτε backend proxy server, το κλειδί διαχειρίζεται εκεί.
// Εάν εκτελείτε στο Canvas, το κλειδί παρέχεται αυτόματα.

// Εάν χρησιμοποιείτε backend proxy server (π.χ. Node.js server.js):
//   - Στο περιβάλλον ανάπτυξης (όταν τρέχετε `npm start`) και έχετε ρυθμίσει το "proxy" στο package.json,
//     αφήστε το BACKEND_BASE_URL ως κενό string ('').
//   - Σε περιβάλλον παραγωγής (όταν σερβίρετε τα static files από έναν web server χωρίς proxy
//     ή όταν ο backend είναι σε διαφορετικό domain),
//     πρέπει να το ορίσετε στην πλήρη διεύθυνση URL του backend server σας.
//     Π.χ., 'http://your-backend-server.com' ή 'https://api.yourdomain.com'
const BACKEND_BASE_URL_FOR_EXTERNAL_DEPLOYMENT = 'https://finder.racket.gr'; // Ορίστε το URL του backend server σας εδώ
// === ΤΕΛΟΣ ΡΥΘΜΙΣΗΣ ===


// Main App Component
const App = () => {
    // State to manage the current view/page in the single-page application
    const [currentView, setCurrentView] = useState('inputForm'); // 'inputForm', 'recommendations', 'askExpert'
    // State to store user inputs
    const [userData, setUserData] = useState({
        sport: 'tennis', // Default to tennis
        level: 'beginner',
        budget: '200', // Default budget in EUR
        playingStyle: 'all-around',
        ageGroup: 'adult',
        physicalCondition: 'average',
        preferredBrand: '', // Optional
        additionalNotes: '' // Optional
    });
    // State to store recommendation results
    const [recommendations, setRecommendations] = useState([]);
    // State for loading indicator during AI generation
    const [isLoading, setIsLoading] = useState(false);
    // State for error messages
    const [errorMessage, setErrorMessage] = useState('');

    // States for the new "Ask Expert" feature
    const [expertQuestion, setExpertQuestion] = useState('');
    const [expertAnswer, setExpertAnswer] = useState('');
    const [isExpertLoading, setIsExpertLoading] = useState(false);
    const [expertErrorMessage, setExpertErrorMessage] = useState('');

    /**
     * Καθορίζει το βασικό URL API και το API key με βάση το περιβάλλον εκτέλεσης.
     * @returns {Object} Ένα αντικείμενο με apiUrl και apiKey.
     */
    const getApiConfig = () => {
        const isInCanvas = typeof __app_id !== 'undefined';

        if (isInCanvas) {
            // Εντός του περιβάλλοντος Canvas, χρησιμοποιούμε το απευθείας Gemini API URL
            // και το Canvas παρέχει αυτόματα το API key (άρα αφήνουμε κενό).
            return {
                apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                apiKey: '' // Το Canvas συμπληρώνει αυτόματα αυτό το κλειδί
            };
        } else {
            // Εκτός Canvas, χρησιμοποιούμε τον δικό μας backend proxy.
            // Το API key διαχειρίζεται ο backend, οπότε δεν το χρειαζόμαστε εδώ.
            // Ωστόσο, η τρέχουσα υλοποίηση προϋποθέτει backend για ασφάλεια API Key εκτός Canvas.

            if (!BACKEND_BASE_URL_FOR_EXTERNAL_DEPLOYMENT) {
                // Εμφάνιση σφάλματος αν ο χρήστης δεν έχει ρυθμίσει το backend URL για εξωτερική ανάπτυξη
                setErrorMessage("Το BACKEND_BASE_URL_FOR_EXTERNAL_DEPLOYMENT δεν έχει ρυθμιστεί. Παρακαλώ ορίστε το για εξωτερική εκτέλεση.");
                return null; // Επιστρέφουμε null για να σταματήσουμε την εκτέλεση
            }

            return {
                apiUrl: BACKEND_BASE_URL_FOR_EXTERNAL_DEPLOYMENT,
                apiKey: '' // Το API key διαχειρίζεται ο backend, όχι η frontend
            };
        }
    };


    /**
     * Handles changes to form input fields.
     * @param {Object} e - The event object from the input change.
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    /**
     * Handles the form submission to find rackets.
     * This is where we'll integrate the AI model call for recommendations.
     */
    const handleFindRackets = async () => {
        setIsLoading(true);
        setErrorMessage(''); // Clear previous errors
        setRecommendations([]); // Clear previous recommendations

        const config = getApiConfig();
        if (!config) { // Ελέγχουμε αν το config είναι null λόγω σφάλματος ρύθμισης URL
            setIsLoading(false);
            return;
        }

        const prompt = `
            ΣΗΜΑΝΤΙΚΟ:Με βάση τις παρακάτω προτιμήσεις του χρήστη, προτείνετε μια ρακέτα τένις ή padel. Φρόντισε οι προτάσεις να είναι αυστηρά βάσει τωνν προτιμήσεων του χρήστη.
            ΣΗΜΑΝΤΙΚΟ: Όλες οι προτάσεις ΠΡΕΠΕΙ να βασίζονται σε ρακέτες και πληροφορίες που θα βρεθούν στο 'racket.gr'. ΜΗΝ αναφέρεστε σε άλλες πηγές ή μάρκες/μοντέλα που δεν βρίσκονται συνήθως σε έναν εξειδικευμένο Έλληνα λιανοπωλητή ρακετών.
            Όλες οι απαντήσεις ΠΡΕΠΕΙ να είναι στα Ελληνικά.
            Δώστε 3-5 προτάσεις ρακετών. Για κάθε πρόταση, συμπεριλάβετε:
            - Όνομα Ρακέτας
            - Μάρκα
            - Άθλημα (Τένις/Padel)
            - Βασικά Χαρακτηριστικά (π.χ. μέγεθος κεφαλής, βάρος, ισορροπία, υλικό, εστίαση δύναμης/ελέγχου)
            - Σύντομη εξήγηση γιατί είναι κατάλληλη για το προφίλ του χρήστη.
            - Εκτιμώμενο Εύρος Τιμής (π.χ. €150-€200, χρησιμοποιήστε Ευρώ ως νόμισμα)
            - Παρέχετε ένα συνοπτικό string για το 'searchQuery' το οποίο είναι το ακριβές όνομα ρακέτας ή μοντέλου που θα χρησιμοποιηθεί απευθείας σε μια παράμετρο αναζήτησης URL στο racket.gr. Το searchQuery ΠΡΕΠΕΙ να είναι σε λατινικούς χαρακτήρες. Παράδειγμα: "searchQuery": "Wilson Blade 98 v8".

            Προφίλ Χρήστη:
            Άθλημα: ${userData.sport === 'tennis' ? 'Τένις' : 'Padel'}
            Επίπεδο: ${userData.level === 'beginner' ? 'Αρχάριος' : userData.level === 'intermediate' ? 'Μεσαίο' : userData.level === 'advanced' ? 'Προχωρημένος' : 'Επαγγελματίας'}
            Προϋπολογισμός: €${userData.budget}
            Στυλ Παιχνιδιού: ${userData.playingStyle === 'all-around' ? 'Ολόπλευρο' : userData.playingStyle === 'power-hitter' ? 'Δυνατό χτύπημα' : userData.playingStyle === 'control-player' ? 'Παίκτης ελέγχου' : userData.playingStyle === 'defensive' ? 'Αμυντικό' : userData.playingStyle === 'attacking' ? 'Επιθετικό' : 'Τεχνικό'}
            Ηλικιακή Ομάδα: ${userData.ageGroup === 'junior' ? 'Νέοι' : userData.ageGroup === 'adult' ? 'Ενήλικες' : 'Ηλικιωμένοι'}
            Φυσική Κατάσταση: ${userData.physicalCondition === 'excellent' ? 'Εξαιρετική' : userData.physicalCondition === 'good' ? 'Καλή' : userData.physicalCondition === 'average' ? 'Μέτρια' : 'Ανάκτηση από τραυματισμό'}
            Προτιμώμενη Μάρκα (προαιρετικό): ${userData.preferredBrand || 'Καμία'}
            Πρόσθετες Σημειώσεις (προαιρετικό): ${userData.additionalNotes || 'Καμία'}

            Παρακαλώ δώστε την απάντηση ως ένα JSON array από αντικείμενα, ως εξής:
            [
              {
                "racketName": "...",
                "brand": "...",
                "sport": "...",
                "keyFeatures": "...",
                "suitabilityExplanation": "...",
                "priceRange": "...",
                "searchQuery": "..."
              }
            ]
        `;

        try {
            const chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = {
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "racketName": { "type": "STRING" },
                                "brand": { "type": "STRING" },
                                "sport": { "type": "STRING" },
                                "keyFeatures": { "type": "STRING" },
                                "suitabilityExplanation": { "type": "STRING" },
                                "priceRange": { "type": "STRING" },
                                "searchQuery": { "type": "STRING" }
                            },
                            "propertyOrdering": ["racketName", "brand", "sport", "keyFeatures", "suitabilityExplanation", "priceRange", "searchQuery"]
                        }
                    }
                }
            };

            console.log("Request Payload (Racket Recommendation):", JSON.stringify(payload, null, 2));

            let fetchUrl;
            let headers = { 'Content-Type': 'application/json' };

            if (typeof __app_id !== 'undefined') {
                // Εντός Canvas, κατευθείαν στο Gemini API
                fetchUrl = `${config.apiUrl}?key=${config.apiKey}`;
            } else {
                // Εκτός Canvas, στον backend proxy server μας
                fetchUrl = `${config.apiUrl}/api/gemini-recommendations`;
            }

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed with status ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            // Στο Canvas, το αποτέλεσμα είναι απ' ευθείας από το Gemini API.
            // Εκτός Canvas (με proxy), το backend προωθεί την απάντηση του Gemini.
            // Και στις δύο περιπτώσεις, η δομή του result θα πρέπει να είναι η ίδια.
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonString = result.candidates[0].content.parts[0].text;
                try {
                    const parsedJson = JSON.parse(jsonString);
                    setRecommendations(parsedJson);
                    setCurrentView('recommendations');
                } catch (parseError) {
                    console.error("Failed to parse JSON response:", parseError);
                    setErrorMessage("Απέτυχε η ανάλυση των προτάσεων ρακετών. Παρακαλώ δοκιμάστε ξανά.");
                }
            } else {
                setErrorMessage("Δεν βρέθηκαν προτάσεις. Παρακαλώ δοκιμάστε να προσαρμόσετε τα κριτήριά σας.");
            }
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            setErrorMessage(`Προέκυψε σφάλμα: ${error.message || "Δεν ήταν δυνατή η σύνδεση με την υπηρεσία προτάσεων."}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handles asking a question to the AI expert.
     */
    const handleAskExpert = async () => {
        if (!expertQuestion.trim()) {
            setExpertErrorMessage("Παρακαλώ εισάγετε μια ερώτηση.");
            return;
        }

        setIsExpertLoading(true);
        setExpertErrorMessage('');
        setExpertAnswer('');

        const config = getApiConfig();
        if (!config) { // Ελέγχουμε αν το config είναι null λόγω σφάλματος ρύθμισης URL
            setIsExpertLoading(false);
            return;
        }

        const expertPrompt = `
            Είστε ένας εξαιρετικά γνώστης ειδικός σε ρακέτες τένις και padel. Απαντήστε στην ακόλουθη ερώτηση διεξοδικά και επαγγελματικά. Εάν η ερώτηση αφορά την επιλογή ρακέτας, ενσωματώστε το προφίλ του χρήστη εάν είναι σχετικό. Να είστε συνοπτικοί αλλά ενημερωτικοί. Όλες οι απαντήσεις ΠΡΕΠΕΙ να είναι στα Ελληνικά.

            Προφίλ Χρήστη (αν είναι σχετικό):
            Άθλημα: ${userData.sport === 'tennis' ? 'Τένις' : 'Padel'}
            Επίπεδο: ${userData.level === 'beginner' ? 'Αρχάριος' : userData.level === 'intermediate' ? 'Μεσαίο' : userData.level === 'advanced' ? 'Προχωρημένος' : 'Επαγγελματίας'}
            Στυλ Παιχνιδιού: ${userData.playingStyle === 'all-around' ? 'Ολόπλευρο' : userData.playingStyle === 'power-hitter' ? 'Δυνατό χτύπημα' : userData.playingStyle === 'control-player' ? 'Παίκτης ελέγχου' : userData.playingStyle === 'defensive' ? 'Αμυντικό' : userData.playingStyle === 'attacking' ? 'Επιθετικό' : 'Τεχνικό'}
            Ηλικιακή Ομάδα: ${userData.ageGroup === 'junior' ? 'Νέοι' : userData.ageGroup === 'adult' ? 'Ενήλικες' : 'Ηλικιωμένοι'}
            Φυσική Κατάσταση: ${userData.physicalCondition === 'excellent' ? 'Εξαιρετική' : userData.physicalCondition === 'good' ? 'Καλή' : userData.physicalCondition === 'average' ? 'Μέτρια' : 'Ανάκτηση από τραυματισμό'}

            Ερώτηση: "${expertQuestion}"
        `;

        try {
            const chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: expertPrompt }] });
            const payload = {
                contents: chatHistory,
            };

            console.log("Request Payload (Ask Expert):", JSON.stringify(payload, null, 2));

            let fetchUrl;
            let headers = { 'Content-Type': 'application/json' };

            if (typeof __app_id !== 'undefined') {
                // Εντός Canvas, κατευθείαν στο Gemini API
                fetchUrl = `${config.apiUrl}?key=${config.apiKey}`;
            } else {
                // Εκτός Canvas, στον backend proxy server μας
                fetchUrl = `${config.apiUrl}/api/gemini-expert`;
            }

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed with status ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                setExpertAnswer(result.candidates[0].content.parts[0].text);
            } else {
                setExpertErrorMessage("Δεν ήταν δυνατή η λήψη απάντησης από τον ειδικό. Παρακαλώ δοκιμάστε να αναδιατυπώσετε την ερώτησή σας.");
            }
        } catch (error) {
            console.error("Error asking expert:", error);
            setExpertErrorMessage(`Προέκυψε σφάλμα: ${error.message || "Δεν ήταν δυνατή η σύνδεση με την υπηρεσία ειδικών."}`);
        } finally {
            setIsExpertLoading(false);
        }
    };

    /**
     * Renders the input form for user preferences.
     */
    const renderInputForm = () => (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Βρείτε την Ιδανική σας Ρακέτα</h2>

            {/* Sport Selection */}
            <div className="space-y-2">
                <label htmlFor="sport" className="block text-sm font-medium text-gray-700">Άθλημα:</label>
                <select
                    id="sport"
                    name="sport"
                    value={userData.sport}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                    <option value="tennis">Τένις</option>
                    <option value="padel">Padel</option>
                </select>
            </div>

            {/* Level Selection */}
            <div className="space-y-2">
                <label htmlFor="level" className="block text-sm font-medium text-gray-700">Επίπεδο Παίκτη:</label>
                <select
                    id="level"
                    name="level"
                    value={userData.level}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                    <option value="beginner">Αρχάριος</option>
                    <option value="intermediate">Μεσαίο</option>
                    <option value="advanced">Προχωρημένος</option>
                    <option value="professional">Επαγγελματίας</option>
                </select>
            </div>

            {/* Budget Slider */}
            <div className="space-y-2">
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                    Προϋπολογισμός: <span className="font-semibold">€{userData.budget}</span> (ΕΥΡΩ)
                </label>
                <input
                    type="range"
                    id="budget"
                    name="budget"
                    min="50"
                    max="500"
                    step="50"
                    value={userData.budget}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>€50</span>
                    <span>€500</span>
                </div>
            </div>

            {/* Playing Style */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Στυλ Παιχνιδιού:</label>
                <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {['all-around', 'power-hitter', 'control-player', 'defensive', 'attacking', 'technical'].map(style => (
                        <label key={style} className="flex items-center rounded-md p-2 cursor-pointer transition duration-150 ease-in-out bg-gray-50 hover:bg-gray-100">
                            <input
                                type="radio"
                                name="playingStyle"
                                value={style}
                                checked={userData.playingStyle === style}
                                onChange={handleChange}
                                className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">
                                {style === 'all-around' ? 'Ολόπλευρο' :
                                 style === 'power-hitter' ? 'Δυνατό χτύπημα' :
                                 style === 'control-player' ? 'Παίκτης ελέγχου' :
                                 style === 'defensive' ? 'Αμυντικό' :
                                 style === 'attacking' ? 'Επιθετικό' :
                                 'Τεχνικό'}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Age Group */}
            <div className="space-y-2">
                <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700">Ηλικιακή Ομάδα:</label>
                <select
                    id="ageGroup"
                    name="ageGroup"
                    value={userData.ageGroup}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                    <option value="junior">Νέοι (Κάτω των 18)</option>
                    <option value="adult">Ενήλικες (18-50)</option>
                    <option value="senior">Ηλικιωμένοι (50+)</option>
                </select>
            </div>

            {/* Physical Condition */}
            <div className="space-y-2">
                <label htmlFor="physicalCondition" className="block text-sm font-medium text-gray-700">Φυσική Κατάσταση:</label>
                <select
                    id="physicalCondition"
                    name="physicalCondition"
                    value={userData.physicalCondition}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                    <option value="excellent">Εξαιρετική</option>
                    <option value="good">Καλή</option>
                    <option value="average">Μέτρια</option>
                    <option value="recovering">Ανάκτηση από τραυματισμό</option>
                </select>
            </div>

            {/* Preferred Brand (Optional) */}
            <div className="space-y-2">
                <label htmlFor="preferredBrand" className="block text-sm font-medium text-gray-700">Προτιμώμενη Μάρκα (Προαιρετικό):</label>
                <input
                    type="text"
                    id="preferredBrand"
                    name="preferredBrand"
                    value={userData.preferredBrand}
                    onChange={handleChange}
                    placeholder="π.χ. Wilson, Babolat, Head"
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                />
            </div>

            {/* Additional Notes (Optional) */}
            <div className="space-y-2">
                <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700">Πρόσθετες Σημειώσεις (Προαιρετικό):</label>
                <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    value={userData.additionalNotes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Οποιεσδήποτε άλλες συγκεκριμένες απαιτήσεις ή προτιμήσεις;"
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                ></textarea>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">
                    {errorMessage}
                </div>
            )}

            {/* Find Rackets Button */}
            <button
                onClick={handleFindRackets}
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
            >
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    'Βρείτε Ρακέτες'
                )}
            </button>
        </div>
    );

    /**
     * Renders the recommendations display.
     */
    const renderRecommendations = () => (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Οι Προτεινόμενες Ρακέτες σας</h2>

            {recommendations.length > 0 ? (
                <div className="space-y-6">
                    {recommendations.map((racket, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
                            <h3 className="text-xl font-semibold text-indigo-700">
                                {racket.racketName} ({racket.brand})
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">Άθλημα: {racket.sport === 'tennis' ? 'Τένις' : 'Padel'}</p>
                            <p className="text-gray-700"><strong>Βασικά Χαρακτηριστικά:</strong> {racket.keyFeatures}</p>
                            <p className="text-gray-700 mt-1"><strong>Γιατί είναι κατάλληλη:</strong> {racket.suitabilityExplanation}</p>
                            <p className="text-gray-800 font-bold mt-2">Εκτιμώμενη Τιμή: {racket.priceRange}</p>
                            {racket.searchQuery && (
                                <a
                                    href={`https://racket.gr/?post_type=product&dgwt_wcas=1&s=${encodeURIComponent(racket.searchQuery)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
                                >
                                    Αναζήτηση στο Racket.gr
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-600">Δεν βρέθηκαν προτάσεις βάσει των κριτηρίων σας. Δοκιμάστε να προσαρμόσετε τις προτιμήσεις σας.</p>
            )}

            {/* Error Message Display */}
            {errorMessage && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">
                    {errorMessage}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                    onClick={() => setCurrentView('inputForm')}
                    className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                    Επιστροφή / Αναζήτηση
                </button>
                <button
                    onClick={() => {
                        setExpertQuestion(''); // Clear previous question
                        setExpertAnswer(''); // Clear previous answer
                        setExpertErrorMessage(''); // Clear previous error
                        setCurrentView('askExpert');
                    }}
                    className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    ✨ Ρωτήστε έναν Ειδικό Ρακέτας
                </button>
            </div>
        </div>
    );

    /**
     * Renders the "Ask a Racket Expert" chat interface.
     */
    const renderAskExpert = () => (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Ρωτήστε τον Ειδικό μας σε Ρακέτες!</h2>

            <div className="space-y-2">
                <label htmlFor="expertQuestion" className="block text-sm font-medium text-gray-700">Η Ερώτησή σας:</label>
                <textarea
                    id="expertQuestion"
                    name="expertQuestion"
                    value={expertQuestion}
                    onChange={(e) => setExpertQuestion(e.target.value)}
                    rows="5"
                    placeholder="π.χ., Ποια είναι η καλύτερη τάση πλέξης για δυνατούς παίκτες; Ή, πόσο συχνά πρέπει να αλλάζω τη λαβή της ρακέτας μου;"
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                ></textarea>
            </div>

            {expertErrorMessage && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">
                    {expertErrorMessage}
                </div>
            )}

            <button
                onClick={handleAskExpert}
                disabled={isExpertLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${isExpertLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
            >
                {isExpertLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    'Λάβετε Εξειδικευμένη Συμβουλή ✨'
                )}
            </button>

            {expertAnswer && (
                <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                    <h3 className="text-md font-semibold text-blue-800 mb-2">Απάντηση Ειδικού:</h3>
                    <p className="text-gray-800 whitespace-pre-wrap">{expertAnswer}</p>
                </div>
            )}

            <button
                onClick={() => setCurrentView('recommendations')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
                Επιστροφή στις Προτάσεις
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center py-10 px-4 font-inter">
            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Custom style for range input thumb */
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #6366F1; /* Indigo-500 */
                    cursor: pointer;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3); /* Ring effect */
                    margin-top: -8px; /* Center thumb on track */
                    transition: background .15s ease-in-out;
                }
                input[type='range']::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #6366F1; /* Indigo-500 */
                    cursor: pointer;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3); /* Ring effect */
                    transition: background .15s ease-in-out;
                }
                input[type='range']:focus::-webkit-slider-thumb {
                    background: #4F46E5; /* Indigo-600 on focus */
                }
                input[type='range']:focus::-moz-range-thumb {
                    background: #4F46E5; /* Indigo-600 on focus */
                }

                `}
            </style>

            <header className="w-full max-w-2xl text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-800 drop-shadow-md">
                    Εύρεση Ρακέτας απο το racket.gr
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                    Ο προσωπικός σας βοηθός για την εύρεση της τέλειας ρακέτας τένις ή padel.
                </p>
            </header>

            <main className="w-full flex justify-center">
                {/* Conditional rendering based on currentView state */}
                {currentView === 'inputForm' && renderInputForm()}
                {currentView === 'recommendations' && renderRecommendations()}
                {currentView === 'askExpert' && renderAskExpert()}
            </main>

            <footer className="mt-10 text-center text-gray-500 text-sm">
                Racket.gr &copy; 2025 Εύρεση Ρακέτας. Με την επιφύλαξη παντός δικαιώματος.
            </footer>
        </div>
    );
};

export default App;

