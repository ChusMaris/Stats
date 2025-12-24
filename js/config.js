// --- VARIABLES GLOBALES ---
// Se exportan para ser usadas en otros módulos JS.

let allMatchSummaries = {};
let processedTeams = {};
let currentSelectedTeam = null;
const teamNormalization = {}; // Diccionario para normalizar nombres de equipo

// 🆕 Variable para almacenar la configuración de categories.json
let categoryConfiguration = [];

// Referencias del DOM (para no tener que buscarlas en cada archivo)
const statusDiv = document.getElementById('status-message');
const categorySelector = document.getElementById('categorySelector');