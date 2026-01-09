const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'insert_products.sql'), 'utf8');
const lines = sql.split('\n').filter(l => l.trim().length > 0);
const chunkSize = 20;

for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    fs.writeFileSync(path.join(__dirname, `insert_part_${i / chunkSize}.sql`), chunk, 'utf8');
    console.log(`Created insert_part_${i / chunkSize}.sql`);
}
