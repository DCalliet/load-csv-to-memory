const path = require('path');
const path_to_resources = path.join(__dirname, 'resources');
const {
  Uploader,
  Account
} = require('./types');

const myBank = new Account({
  name: 'MY BANK',
  statementFolder: 'mybank',
  fields: [
    "Date",
    "Description",
    "Withdrawals",
    "Deposits",
    "Balance"
  ],
  toTransaction: function (row) {
    try {
      let amount = undefined;
      const withdrawals = row['Withdrawals'].replace(/[$,]/g, '');
      const deposits = row['Deposits'].replace(/[$,]/g, '');
      if (withdrawals) {
        amount = -1 * parseFloat(withdrawals);
      } else if (deposits) {
        amount = parseFloat(deposits);
      } else {
      }
      return new Transaction({
        date: moment(row['Date'], 'MM/DD/YYYY'),
        amount: amount,
        description: row['Description'],
        source: this.name,
        category: undefined,
        initiator: undefined,
        tags: []
      });
    } catch (err) {
      return undefined;
    }
  }
});

const uploader = new Uploader(path_to_resources, [myBank]);
console.log(uploader.transactions[0]);