const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/TeamStats.tsx');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace TableHeader Jugador width
  content = content.replace(
    /label="Jugador"\s+column="nombre"\s+align="left"\s+className="w-\[240px\]\s+py-2\s+px-3\s+font-semibold"/,
    'label="Jugador" column="nombre" align="left" className="w-[110px] sm:w-[240px] py-2 px-3 font-semibold"'
  );

  // Replace player name max-width
  content = content.replace(
    /truncate max-w-\[240px\] md:max-w-\[320px\]/g,
    'truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[200px] md:max-w-[320px]'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated TeamStats.tsx');
} else {
  console.error('File not found:', filePath);
}
