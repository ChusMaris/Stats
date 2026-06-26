const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'components/TeamStats.tsx',
  'components/TeamsPage.tsx',
  'components/Standings.tsx',
  'components/CalendarView.tsx',
  'App.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace text-[11px] with text-[14px]
    const originalLength = content.length;
    content = content.replace(/text-\[11px\]/g, 'text-[14px]');
    
    if (content.length !== originalLength || content.includes('text-[14px]')) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file} successfully.`);
    } else {
      console.log(`No text-[11px] occurrences found in ${file}.`);
    }
  } else {
    console.error(`File not found: ${filePath}`);
  }
});
