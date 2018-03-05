const {Client} = require('pg');
const client = new Client({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT,
    host: process.env.PGHOST,
    ssl: true
});

client.connect(() => {
   console.dir('DB up');
});
exports.getClient = () => {
    return client;
}