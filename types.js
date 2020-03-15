const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const Papa = require('papaparse');
const moment = require('moment-timezone');

// Extract a CSVs Data from PapaParse as json
// @params [String] filename path to upload file.
class Upload {
  constructor(filename) {
    this.filename = filename;
    this.pdf = this.filename.replace(new RegExp(/.(CSV|csv)$/), '.pdf');
    this.uploadTime = Date.now();
    this.csv = fs.readFileSync(this.filename, 'utf-8');
    this.hash = crypto.createHmac('sha256', SECRET).update(this.csv).digest('hex');
    let { data, errors, meta } = Papa.parse(this.csv, {
      header: true
    });
    this.data = data;
    this.errors = errors;
    this.meta = meta;
    return this;
  }
}

// Allows access to data in multiple csv's as a list of transaction objects
// @params [String] folder transactions are stored in.
// @params [List<Account>] accounts a list of account objects, which specify either a fileName or folderName.
class Uploader {
  constructor({
    prefix,
    accounts
  }) {
    this.resourcePath = prefix;
    if (this.resourcePath == undefined) {
      throw new Error('must provide uploader with a resource path string!')
    }
    this.accounts = accounts;
    this.directoryFiles = fs.readdirSync(this.resourcePath);
    this.uploads = {};
    this.transactions = [];

    for (let a of this.accounts) {
      this.uploads[a.name] = [];
      let directoryFiles = undefined;
      if (a.statementFolder) {
        let folder = path.join(this.resourcePath, a.statementFolder)
        directoryFiles = fs.readdirSync(folder)
          .filter(function (f) { return (new RegExp(/\w+.(CSV|csv)$/)).test(f) })
          .map(function (f) { return path.join(folder, f) });
      } else if (a.statementFile) {
        directoryFiles = [path.join(this.resourcePath, a.statementFile)];
      }
      for (let filename of directoryFiles) {
        let upload = new Upload(filename);
        this.uploads[a.name].push(upload);
      }
      for (let upload of this.uploads[a.name]) {

        for (let row of upload.data) {
          let clean = true;
          for (let f of Object.keys(row)) {
            if (a.fields.indexOf(f) == -1) {
              clean = false;
            }
          }
          if (!clean) { continue; }
          let transaction = a.toTransaction(row);
          if (transaction) {
            transaction.id = this.transactions.length;
            transaction.pdf = upload.pdf;
            this.transactions.push(transaction);
          }
        }
      }
    }
    return this;
  }
  byMonth() {
    const byMonthReducer = function (accumulator, value, index) {
      const monthKey = moment(value.date).format('MMYY');
      if (!accumulator[monthKey]) { accumulator[monthKey] = [] }
      accumulator[monthKey].push(value);
      return accumulator;
    }
    return this.transactions.reduce(byMonthReducer, []);
  }
}

// Profiles present in a statement.
// @params [String] name identifying name
// @params [List<String>] card numbers associated
class User {
  constructor({
    name,
    cardNumbers
  }) {
    this.name = name;
    this.cardNumbers = cardNumbers;
    return this;
  }
}

// Object outlining details of a statement row. See accounts.js for account specific implementations.
// @params [Moment] date
// @params [Number] amount, change in value a transaction row DEBIT or CREDIT as to the account
// @params [String] description, statement notes and descriptions
// @params [String] source, the name of the account object that created the transaction
// @params [String] category
// @params [String] initiator
// @params [List<String>] tags
class Transaction {
  constructor({
    date,
    amount,
    description,
    source,
    category,
    initiator,
    tags,
    pdf,
  }) {
    this.date = date;
    this.amount = amount;
    this.description = description;
    this.source = source;
    this.category = category;
    this.initiator = initiator;
    this.tags = tags;
    this.pdf = pdf;
    this.serialize = function () {
      return {
        date: this.date.format('MM/DD/YYYY'),
        amount: this.amount,
        description: this.description,
        source: this.source,
        category: this.category,
        initiator: this.initiator,
        tags: this.tags,
      }
    }
    return this;
  }
}

class Account {

  constructor({
    name,
    statementFolder,
    statementFile,
    fields,
    toTransaction,
    setup
  }) {
    this.errors = [];
    this.transactions = [];
    this.name = name;
    this.statementFolder = statementFolder;
    this.statementFile = statementFile;
    this.fields = fields;
    this.toTransaction = toTransaction;
    this.setup = setup;
    return this;
  }
}

module.exports = {
  Upload,
  Uploader,
  User,
  Transaction,
  Account
}