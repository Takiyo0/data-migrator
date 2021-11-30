const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { OLD_DB_URI, NEW_DB_URI } = require("./config.json");

const oldDB = mongoose.createConnection(OLD_DB_URI);
const newDB = mongoose.createConnection(NEW_DB_URI);
console.log("Connecting to both DB...");

waitConnected().then(() => {
    oldDB.db.listCollections().toArray(async (err, collections) => {
        let data = [];
        for (let { name } of collections.filter(c => c.type === "collection")) {
            let _1 = new Date();
            let collectionData = {};
            collectionData.name = name;
            collectionData.data = await new Promise(resolve => oldDB.collection(name).find().toArray((e, d) => resolve(d.map((x, i) => ({ data: x, i })))));
            data.push(collectionData);

            console.log(`Collected ${name}'s collection data in ${new Date() - _1}ms. Moving...`);
            let _2 = new Date();
            const collection = newDB.model(name, new Schema({}, { strict: false }));
            let stats = 0;
            await Promise.all(collectionData.data.map(async x => await (new collection(x.data)).save().then(() => {
                stats += 1;
                console.log(`     Moved ${name}'s ${stats}/${collectionData.data.length}. ID ${x.i}`)
            })));
            console.log(`Moved ${name}'s data to new database in ${new Date() - _2}ms.`)
        }
        console.log("Done!");
        process.exit(1);
    })
}).catch(() => process.exit(0));

async function waitConnected() {
    return new Promise((resolve, reject) => {
        let Connected = 0;
        oldDB.once("open", () => {
            console.log("Old database connected!");
            Connected += 1;
            if (Connected === 2) resolve("All connected");
        });
        newDB.once("open", () => {
            console.log("New database connected!")
            Connected += 1;
            if (Connected === 2) resolve("All connected");
        });

        oldDB.on("error", (e) => reject(new Error('old', e)));
        newDB.on("error", (e) => reject(new Error('new', e)));
    })
}