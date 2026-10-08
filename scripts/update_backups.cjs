const { execSync } = require('child_process');
const fs = require('fs');

console.log('Creando archivo ZIP de la versión de producción...');
const destDesktop = 'C:\\Users\\nacho\\Desktop\\OffertGames_Backup_Web.zip';
const destDownloads = 'C:\\Users\\nacho\\Downloads\\OffertGames_Backup_Web.zip';
const destDesktopSecured = 'C:\\Users\\nacho\\Desktop\\OffertGames_Production_Secured.zip';
const destDownloadsSecured = 'C:\\Users\\nacho\\Downloads\\OffertGames_Production_Secured.zip';

execSync('tar -a -cf "' + destDesktop + '" -C dist .', { stdio: 'inherit' });
fs.copyFileSync(destDesktop, destDownloads);
fs.copyFileSync(destDesktop, destDesktopSecured);
fs.copyFileSync(destDesktop, destDownloadsSecured);
console.log('Backups en Desktop y Downloads actualizados correctamente.');
