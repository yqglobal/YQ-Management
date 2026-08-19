const crypto = require('crypto');

const privateKey = 'test'; // dummy
const payload = {
  siteCode: 'test',
  countryCode: 'ZA',
  currencyCode: 'ZAR',
  amount: '10.00',
  transactionReference: 'TEST-123',
  bankReference: 'QMOVA-TEST',
  cancelUrl: 'http://localhost:3001/cancel',
  errorUrl: 'http://localhost:3001/error',
  successUrl: 'http://localhost:3001/success',
  notifyUrl: 'http://localhost:3000/webhook',
  isTest: 'false'
};

const stringToHash = `${payload.siteCode}${payload.countryCode}${payload.currencyCode}${payload.amount}${payload.transactionReference}${payload.bankReference}${payload.cancelUrl}${payload.errorUrl}${payload.successUrl}${payload.notifyUrl}${payload.isTest}${privateKey}`.toLowerCase();
const hashCheck = crypto.createHash('sha512').update(stringToHash).digest('hex');

const formBody = new URLSearchParams();
formBody.append('SiteCode', payload.siteCode);
formBody.append('CountryCode', payload.countryCode);
formBody.append('CurrencyCode', payload.currencyCode);
formBody.append('Amount', payload.amount);
formBody.append('TransactionReference', payload.transactionReference);
formBody.append('BankReference', payload.bankReference);
formBody.append('CancelUrl', payload.cancelUrl);
formBody.append('ErrorUrl', payload.errorUrl);
formBody.append('SuccessUrl', payload.successUrl);
formBody.append('NotifyUrl', payload.notifyUrl);
formBody.append('IsTest', payload.isTest);
formBody.append('HashCheck', hashCheck);

console.log(formBody.toString());
