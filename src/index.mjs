import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import {
  generateSaleId,
  parseCommand,
  salesMessageTemplate,
} from './utils.mjs';
import { addSale, getSales, removeSale, updateSale } from './googleSheets.mjs';
import { sendWhatsAppText } from './whatsapp.mjs';
import { askAI } from './ai.mjs';

const app = express();
app.use(express.json());
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

app.get('/', (req, res) => {
  res.send('WhatsApp Sales Bot is running.');
});

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Receive messages
app.post('/webhook', async (req, res) => {
  // Acknowledge receipt immediately
  res.sendStatus(200);

  const entry = req.body.entry || [];
  for (const e of entry) {
    const changes = e.changes || [];
    for (const change of changes) {
      const messages = change.value?.messages || [];
      for (const msg of messages) {
        const from = msg.from;
        const textBody = msg.text?.body || '';
        if (!textBody) continue;

        // Parse command
        const { command, args } = parseCommand(textBody);

        if (command === '#sale') {
          const saleId = generateSaleId();
          const [product, unitPrice, quantity, amountReceived] = args;

          const price = Number(unitPrice) * Number(quantity);
          const due = price - Number(amountReceived);

          await addSale({
            id: saleId,
            product,
            price,
            due,
            quantity,
            userNumber: from,
          });

          await sendWhatsAppText(
            from,
            salesMessageTemplate(saleId, product, price, due)
          );
        } else if (command === '#update_sale') {
          const [saleId, product, unitPrice, quantity, amountReceived] = args;

          const price = Number(unitPrice) * Number(quantity);
          const due = price - Number(amountReceived);

          const success = await updateSale({
            id: saleId,
            product,
            price,
            due,
            quantity,
            userNumber: from,
          });

          await sendWhatsAppText(
            from,
            success
              ? `Sale ${saleId} updated for ${product}. Price: ${price} BDT, Due: ${due} BDT.`
              : `Sale ${saleId} not found.`
          );
        } else if (command === '#remove_sale') {
          const saleId = args[0];
          const success = await removeSale(saleId);

          await sendWhatsAppText(
            from,
            success ? `Sale ${saleId} removed.` : `Sale ${saleId} not found.`
          );
        } else if (command === '#total_sale') {
          const sales = (await getSales()).filter((r) => r[5] === from);
          const totalPrice = sales.reduce((a, b) => a + Number(b[2]), 0);
          const totalDue = sales.reduce((a, b) => a + Number(b[3]), 0);
          const totalItem = sales.reduce((a, b) => a + Number(b[4]), 0);

          await sendWhatsAppText(
            from,
            `Total Sale: ${totalPrice}\nTotal Due: ${totalDue}\nTotal Items: ${totalItem}`
          );
        } else if (command === '#total_sales_report') {
          try {
            const allSales = await getSales();
            const sales = allSales.slice(1); // skip header row

            const grouped = {};
            for (const s of sales) {
              const user = (s[5] || '').toString().trim(); // normalize
              if (!user) continue; // skip empty userNumbers
              if (!grouped[user]) grouped[user] = [];
              grouped[user].push(s);
            }

            let report = '';
            let subTotalPrice = 0,
              subTotalDue = 0,
              subTotalItems = 0;

            for (const user in grouped) {
              const userSales = grouped[user];
              let userTotalPrice = 0,
                userTotalDue = 0,
                userTotalItems = 0;

              for (const s of userSales) {
                const price = Number(s[2]) || 0;
                const due = Number(s[3]) || 0;
                const quantity = Number(s[4]) || 0;

                userTotalPrice += price;
                userTotalDue += due;
                userTotalItems += quantity;
              }

              report += `SellerNumber: ${user}\n`;
              report += `Total Sale: ${userTotalPrice}\n`;
              report += `Total Due: ${userTotalDue}\n`;
              report += `Total Items: ${userTotalItems}\n\n`;

              subTotalPrice += userTotalPrice;
              subTotalDue += userTotalDue;
              subTotalItems += userTotalItems;
            }

            report += `Sub Total:\n`;
            report += `Total Sale: ${subTotalPrice}\n`;
            report += `Total Due: ${subTotalDue}\n`;
            report += `Total Items Sold: ${subTotalItems}`;

            await sendWhatsAppText(from, report.substring(0, 4000));
          } catch (err) {
            console.error('Error generating sales report:', err);
            await sendWhatsAppText(from, '❌ Failed to generate sales report.');
          }
        } else if (command === '#get') {
          const saleId = args[0];
          if (!saleId) {
            await sendWhatsAppText(
              from,
              '❌ Please provide a Sale ID. Example: #get 12345678'
            );
            return;
          }

          const sales = (await getSales()).slice(1); // skip header row
          const sale = sales.find((s) => s[0] === saleId);

          if (!sale) {
            await sendWhatsAppText(
              from,
              `❌ Sale with ID ${saleId} not found.`
            );
            return;
          }

          const [id, product, price, due, quantity, userNumber, timestamp] =
            sale;

          const message = `Sale Info:\nSale ID: ${id}\nProduct Name: ${product}\nPrice: ${price}\nDue: ${due}\nQuantity: ${quantity}\nSellerNumber: ${userNumber}\nSale Date: ${timestamp}`;

          await sendWhatsAppText(from, message);
        } else {
          // AI fallback
          const reply = await askAI(textBody);
          await sendWhatsAppText(from, reply.substring(0, 4000));
        }
      }
    }
  }
});

app.listen(process.env.PORT || 9500, () => console.log('Server running'));
