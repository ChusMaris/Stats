// --- VARIABLES GLOBALES ---
// Se exportan para ser usadas en otros módulos JS.

let allMatchSummaries = {};
let processedTeams = {};
let currentSelectedCategoryFolder = null;
let currentSelectedTeamName = null;
const teamNormalization = {}; // Diccionario para normalizar nombres de equipo

// 🆕 Variable para almacenar la configuración de categories.json
let categoryConfiguration = [];

// Referencias del DOM (para no tener que buscarlas en cada archivo)
const statusDiv = document.getElementById('status-message');
const categorySelector = document.getElementById('categorySelector');

const TEAM_LOGOS = {
    // C.t. Pre-infantil Masculí 2025/26
    "FUNDACIÓ BRAFA": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/ITTvZUnGYmrza85W.png",
    "LIMA-HORTA BARCELONA": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/yi8EcE81jZxFpK8C.png",
    "U.E. HORTA": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/Escut_UEH_Petit.jpg",
    "S. E. SANT JOAN DE MATA A": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/abfd69ff5503fca6.jpg",
    "UE SANT CUGAT - OCCIDENT VERMELL": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/UpCK3S80e1XdLJyi.jpg",
    // C.t. Cadet Masculí Promoció 2025/26
    "FREDERIC MISTRAL" :"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/1d8ILrDIUR0abB0n.png",
    "BC SANT JOAN DESPI 1" : "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/20109f7cc6773182.jpg",
    "CB. CORNELLA BLANC":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/j2LwSwBtxYb0pTPG.png",
    "C.B. PRAT - AIGÜES DEL PRAT A":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/I2SPExEujKkx9zzD.png",
    "CB MONTPEDRÓS B":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/B8ATeYPENu2NvrE2.png",
    // C.t. Cadet Femení Promoció 2025/26
    "BÀSQUET CEISSA B": "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/WzRrXOxawXTv4aQk.png",
    "EUROPEAN INT. SCHOOL OF BARCELONA":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/YdxDw9HIyibYQzyZ.png",
    "DSB COLEGIO ALEMÁN DE BARCELONA NEGRE":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/rIhzwDG3LCPAcVTd.jpg",
    "CE VILA OLIMPICA":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/081478.jpg",
    "CES BOSCO ROCAFORT NAIFARLLEURE":"https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/twfqU4TZPAXNqQtM.jpg",
};

const LOGO_BASE_URL = "https://d3ah0nqesr6vwc.cloudfront.net/recursos/imatges/multimedia/originals/";

// Objeto para mapear nombres de jugadores a sus fotos.
// El nombre del jugador debe estar en mayúsculas, que es como se busca en el código.
// Ejemplo:
// "NOMBRE DEL JUGADOR": "URL_DE_LA_FOTO.png"
const JUGADOR_FOTOS = {
    "VICTOR DELGADO NIETO":             "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/5GE9zRtQjBNRTe2XDnaa11_w585h427.png",
    "LLUC SANCES FAURE":                "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/0h24eeLvFNc1GjQtLGK06D_w585h427.png",
    "BRAYAN ALEJANDRO DOBLADO MELGAR":  "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/0pACKmVPSm0jFQP30X5lVH_w585h427.png",
    "ORIOL MARTINEZ JUST":              "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/0MtdJ0xCeyEqbRkV0cvMLi_w585h427.png",
    "ALER MARTINEZ CAMPO":              "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/7CSsFSTGCCvkwId9B5S6Jd_w585h427.png",
    "AIDAN RUBIO DUQUE":                "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/0LR9D3kDJxUjDFKdD9BTfd_w585h427.png",
    "MARIANO HERNANDEZ LOPEZ":          "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/3kd86FTUDFcGktRufOflZu_w585h427.png",
    "ION MARTÍNEZ MARTÍN":              "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/40ODiHXOr7qDVLlkiwCRK7_w350h254.png",
    "JAN PINO FERRÀ":                   "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/5bL2yS3VJ08v4JktFQoX8I_w585h427.png",
    "CESC GONZALEZ ROSALES":            "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/3ydTv1p8H8YwziJYpXXIWI_w585h427.png",
    "MARC CAVERO STAROCH":              "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/1Ld6TewHnexqj2oKZ4XtN0_w585h427.png",
    "MARC JOUNOU CUEVAS":               "https://image.singular.live/fit-in/450x450/filters:format(webp)/0d62960e1109063fb6b062e758907fb1/images/1XkvElj8WXdgCq1Zz0nrzE_w585h427.png"
};