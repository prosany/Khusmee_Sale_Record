import { getSales } from './src/googleSheets.mjs';

(async () => {
  console.log(await getSales());
})();
