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

const TEAM_LOGOS = {
    // PRE-Infantil Masculí 2025/26
    "FUNDACIÓ BRAFA": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/ITTvZUnGYmrza85W.png",
    "LIMA-HORTA BARCELONA": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/yi8EcE81jZxFpK8C.png",
    "U.E. HORTA": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/Escut_UEH_Petit.jpg",
    "S. E. SANT JOAN DE MATA A": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/abfd69ff5503fca6.jpg",
    "UE SANT CUGAT - OCCIDENT VERMELL": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/UpCK3S80e1XdLJyi.jpg",
    // C.t. Cadet Masculí Promoció
    "FREDERIC MISTRAL" :"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/1d8ILrDIUR0abB0n.png",
    "BC SANT JOAN DESPI 1" : "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/20109f7cc6773182.jpg",
    "CB. CORNELLA BLANC":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/j2LwSwBtxYb0pTPG.png",
    "C.B. PRAT - AIGÜES DEL PRAT A":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/I2SPExEujKkx9zzD.png",
    "CB MONTPEDRÓS B":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/B8ATeYPENu2NvrE2.png",
    // 
    "BÀSQUET CEISSA B": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/WzRrXOxawXTv4aQk.png",
    "EUROPEAN INT. SCHOOL OF BARCELONA":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/YdxDw9HIyibYQzyZ.png",
    "DSB COLEGIO ALEMÁN DE BARCELONA NEGRE":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/rIhzwDG3LCPAcVTd.jpg",
    "CE VILA OLIMPICA":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/081478.jpg",
    "CES BOSCO ROCAFORT NAIFARLLEURE":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/twfqU4TZPAXNqQtM.jpg",
};

const LOGO_BASE_URL = "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/originals/";

