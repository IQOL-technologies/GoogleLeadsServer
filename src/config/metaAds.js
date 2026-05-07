import {env} from "./env.js";

const accessToken = env.META_ACCESS_TOKEN;
const appSecret = env.META_APP_SECRET;
const appId = env.META_APP_ID;
const adAccountId = env.META_AD_ACCOUNT_ID; // Format: 'act_<AD_ACCOUNT_ID>'

// Default accounts if none provided in params
const accounts = [
  {
    adAccountId: env.META_AD_ACCOUNT_ID,
    accessToken: env.META_ACCESS_TOKEN,
    name: 'Canvas Homes'
  },
  {
    adAccountId: env.META_AD_ACCOUNT_ID2,
    accessToken: env.META_ACCESS_TOKEN,
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
