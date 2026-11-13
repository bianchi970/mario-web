// Il fuso di casa per ogni test: un'ora dell'Hub (UTC) si prova come la legge
// chi abita in Italia (`src/lib/ora.test.ts`), su qualunque macchina.
module.exports = async () => { process.env.TZ = 'Europe/Rome'; };
