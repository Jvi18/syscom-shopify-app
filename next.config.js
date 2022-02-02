require("dotenv").config();
const webpack = require('webpack');

const apiKey = JSON.stringify(process.env.SHOPIFY_API_KEY);
const syscomUrlApi = process.env.REACT_APP_SYSCOM_API_URL;
const syscomClient = process.env.REACT_APP_SYSCOM_API_CLIENT;
const syscomSecret = process.env.REACT_APP_SYSCOM_API_SECRET;
const currencyApi = process.env.CURRENCY_CONVERT_API_URL;
const currencyApiKey = process.env.CURRENCY_CONVERT_API_KEY;

module.exports = {
  // Target must be serverless for netlify deployment
  //target: 'experimental-serverless-trace',
  webpack: (config, { isServer }) => {
    const env = { API_KEY: apiKey };
    config.plugins.push(new webpack.DefinePlugin(env));
    
    if (!isServer) {
      config.node = {
        fs: 'empty'
      }
    }

    return config;
  },
  env: {
    syscomUrl: syscomUrlApi,
    syscomUser: syscomClient,
    syscomUserSecret: syscomSecret,
    currencyUrl: currencyApi,
    currencyKey: currencyApiKey
  },
};