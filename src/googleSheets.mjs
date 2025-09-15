import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import momentTZ from 'moment-timezone';
dotenv.config();

const KEYFILEPATH = path.join(process.cwd(), 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let auth;

// Try local JSON first
if (fs.existsSync(KEYFILEPATH)) {
  auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });
} else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
  } catch (err) {
    throw new Error(
      'Failed to parse GOOGLE_SERVICE_ACCOUNT env variable. Ensure it is valid JSON.'
    );
  }
} else {
  throw new Error(
    'Google service account credentials not found. Place service-account.json in project root or set GOOGLE_SERVICE_ACCOUNT env variable.'
  );
}

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export async function addSale(sale) {
  try {
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
    return true;
  } catch (err) {
    console.error('Error adding sale:', err);
    return false;
  }
}

export async function getSales() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sales!A:G',
    });
    return res.data.values || [];
  } catch (err) {
    console.error('Error fetching sales:', err);
    return [];
  }
}

export async function removeSale(saleId) {
  try {
    const rows = await getSales();
    const rowIndex = rows.findIndex((r) => r[0] === saleId);
    if (rowIndex === -1) return false;

    const requests = [
      {
        deleteDimension: {
          range: {
            sheetId: 0, // Default first sheet
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
  } catch (err) {
    console.error('Error removing sale:', err);
    return false;
  }
}

export async function updateSale(sale) {
  try {
    const rows = await getSales();
    const rowIndex = rows.findIndex((r) => r[0] === sale.id);
    if (rowIndex === -1) return false;

    // Keep the old timestamp
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
  } catch (err) {
    console.error('Error updating sale:', err);
    return false;
  }
}
