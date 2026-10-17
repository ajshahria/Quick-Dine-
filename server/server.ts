import "dotenv/config";
import { createApp } from "./app.js";
const app = createApp();
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`QuickDine API listening on ${port}`));
}
export default app;
