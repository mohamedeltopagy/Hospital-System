import { readFileSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const envContent = readFileSync(".env", "utf8");
function getEnv(key) {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='));
  return line ? line.split('=')[1].trim() : null;
}
const apiKey = getEnv("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(name) {
  try {
    const model = genAI.getGenerativeModel({ model: name });
    const result = await model.generateContent("Hello. Say Hi.");
    console.log(name, "WORKS:", result.response.text().trim());
  } catch (e) {
    console.log(name, "FAILS:", e.message);
  }
}

async function run() {
  await testModel("gemini-2.5-flash");
  await testModel("gemini-2.5-pro");
  await testModel("gemini-flash-latest");
  await testModel("gemini-pro-latest");
}
run();
