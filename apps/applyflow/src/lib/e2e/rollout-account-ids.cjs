const accounts = require("./rollout-account-ids.json");

function pinnedAccountId(authSub) {
  return accounts[authSub]?.id ?? null;
}

function selectedAccountIds() {
  return Object.values(accounts)
    .filter((account) => account.selected)
    .map((account) => account.id);
}

module.exports = { accounts, pinnedAccountId, selectedAccountIds };
