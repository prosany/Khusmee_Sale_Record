import { google } from 'googleapis';
import dotenv from 'dotenv';
import momentTZ from 'moment-timezone';
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key.replace(/\\n/g, '\n'), // Important: fix newline issue
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export async function addSale(sale) {
  const values = [
    [
      sale.id,
      sale.product,
      sale.price,
      sale.due,
      sale.quantity,
      sale.userNumber,
      momentTZ(new Date().toISOString()).tz('Asia/Dhaka').format('llll'),
    ],
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sales!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function getSales() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sales!A:G',
  });
  return res.data.values || [];
}

export async function removeSale(saleId) {
  const rows = await getSales();
  const rowIndex = rows.findIndex((r) => r[0] === saleId);
  if (rowIndex === -1) return false;

  const requests = [
    {
      deleteDimension: {
        range: {
          sheetId: 0,
          dimension: 'ROWS',
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });
  return true;
}

export async function updateSale(sale) {
  const rows = await getSales();
  const rowIndex = rows.findIndex((r) => r[0] === sale.id);
  if (rowIndex === -1) return false;

  // Keep the old timestamp (last column, index 6)
  const oldTimestamp = rows[rowIndex][6] || '';

  const values = [
    [
      sale.id,
      sale.product,
      sale.price,
      sale.due,
      sale.quantity,
      sale.userNumber,
      oldTimestamp,
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Sales!A${rowIndex + 1}:G${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return true;
}
