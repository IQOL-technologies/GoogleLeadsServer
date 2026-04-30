const accessToken = process.env.META_ACCESS_TOKEN;
const appSecret = process.env.META_APP_SECRET;
const appId = process.env.META_APP_ID;
const adAccountId = process.env.META_AD_ACCOUNT_ID; // Format: 'act_<AD_ACCOUNT_ID>'

// Default accounts if none provided in params
const accounts = [
  {
    adAccountId: process.env.META_AD_ACCOUNT_ID,
    accessToken: process.env.META_ACCESS_TOKEN,
    name: 'Canvas Homes'
  },
  {
    adAccountId: process.env.META_AD_ACCOUNT_ID2,
    accessToken: process.env.META_ACCESS_TOKEN,
    name: 'Canvas Homes Ads'
  },
];

export {
  accessToken,
  appSecret,
  appId,
  adAccountId,
  accounts,
};
