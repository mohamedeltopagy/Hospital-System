import { readFileSync } from "fs";
const envContent = readFileSync(".env", "utf8");
function getEnv(key) {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='));
  return line ? line.split('=')[1].trim() : null;
}
const apiKey = getEnv("GEMINI_API_KEY");

async function run() {
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await listRes.json();
    console.log("AVAILABLE MODELS:", data.models?.map(m => m.name).join(', '));
  } catch (e) {
    console.error("error:", e);
  }
}
run();
