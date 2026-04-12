import mongoose from "mongoose";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "POST") {
    const data = req.body;

    console.log(data);

    // burada DB kaydı yapacağız
    return res.status(200).json({ message: "kaydedildi" });
  }

  return res.status(405).end();
}