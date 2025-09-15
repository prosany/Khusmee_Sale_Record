export function generateSaleId() {
  const length = 6;
  let result = '';
  const characters = '1234567890';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function parseCommand(text) {
  const commandMatch = text.trim().match(/^#(\w+)/);
  if (!commandMatch) return { command: null, args: [] };

  const command = `#${commandMatch[1]}`;

  if (command === '#sale') {
    // #sale (Product Name) unitPrice quantity amountReceived
    const productMatch = text.match(/\(([^)]+)\)/);
    if (!productMatch) return { command, args: [] };

    const product = productMatch[1];
    const remaining = text
      .replace(command, '')
      .replace(productMatch[0], '')
      .trim();
    const [unitPrice, quantity, amountReceived] = remaining.split(/\s+/);

    return { command, args: [product, unitPrice, quantity, amountReceived] };
  }

  if (command === '#update_sale') {
    // #update_sale SALE_ID (Product Name) unitPrice quantity amountReceived
    const idMatch = text.trim().split(/\s+/)[1]; // second word = Sale ID
    const productMatch = text.match(/\(([^)]+)\)/);
    if (!productMatch) return { command, args: [] };

    const product = productMatch[1];
    const remaining = text
      .replace(command, '')
      .replace(idMatch, '')
      .replace(productMatch[0], '')
      .trim();

    const [unitPrice, quantity, amountReceived] = remaining.split(/\s+/);

    return {
      command,
      args: [idMatch, product, unitPrice, quantity, amountReceived],
    };
  }

  // Other commands
  const parts = text.trim().split(/\s+/).slice(1);
  return { command, args: parts };
}

export function salesMessageTemplate(saleId, productName, price, due) {
  const messages = [
    `Victory unlocked! 🥳 Sale ID ${saleId} for ${productName} is saved. Total: ${price} BDT, Due: ${due} BDT. Keep building your sales streak!`,
    `Target hit! 🎯 Sale ID ${saleId} for ${productName} is locked in. Total: ${price} BDT, Due: ${due} BDT. Keep smashing those goals!`,
    `Star seller move! ✨ Sale ID ${saleId} for ${productName} is now saved. Price: ${price} BDT, Due: ${due} BDT. Shine on!`,
    `Cha-ching! 💰 Sale ID ${saleId} for ${productName} recorded. Total sale: ${price} BDT, Pending: ${due} BDT. Keep the momentum going!`,
    `High five! 🙌 Sale ID ${saleId} for ${productName} is saved. Price: ${price} BDT, Due: ${due} BDT. You're on a roll!`,
    `Boom! 💥 Sale ID ${saleId} for ${productName} is in the books. Total: ${price} BDT, Due: ${due} BDT. Keep the energy up!`,
    `Way to go! 🚀 Sale ID ${saleId} for ${productName} is saved. Total price: ${price} BDT, Due: ${due} BDT. Sky's the limit!`,
    `Nailed it! 🔨 Sale ID ${saleId} for ${productName} recorded. Price: ${price} BDT, Due: ${due} BDT. Keep building that success!`,
    `Kudos! 👏 Sale ID ${saleId} for ${productName} is saved. Total: ${price} BDT, Due: ${due} BDT. Keep up the fantastic work!`,
    `On fire! 🔥 Sale ID ${saleId} for ${productName} locked in. Total sale: ${price} BDT, Due: ${due} BDT. Keep blazing that trail!`,
    `Great job! ✅ Sale ID ${saleId} for ${productName} is now saved. Total: ${price} BDT, Pending: ${due} BDT.`,
    `Congratulations! 🎉 Your sale has been recorded. Sale ID: ${saleId} for ${productName}. Total: ${price} BDT, Due: ${due} BDT.`,
    `Well done! 🏆 Sale ID ${saleId} for ${productName} is saved. Price: ${price} BDT, Due: ${due} BDT. Add more wins to your sales history!`,
    `Fantastic! 🌟 Sale ID ${saleId} for ${productName} successfully saved. Total: ${price} BDT, Due: ${due} BDT.`,
    `Success! 🎯 Sale ID ${saleId} for ${productName} is now in the records. Price: ${price} BDT, Due: ${due} BDT. Keep it up!`,
    `You just made a sale! 🛍️ Sale ID ${saleId} for ${productName} saved. Total: ${price} BDT, Due: ${due} BDT. Keep rocking your sales!`,
  ];

  // Randomly pick one
  return messages[Math.floor(Math.random() * messages.length)];
}
