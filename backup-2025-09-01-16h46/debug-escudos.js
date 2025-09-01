import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("cartola-manager");
const result = await db
  .collection("times")
  .find({ id: { $in: [13935277, 1926323] } })
  .toArray();
console.log(JSON.stringify(result, null, 2));
await client.close();
