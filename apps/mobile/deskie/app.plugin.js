
module.exports = async (config) => {
  const { withQvacSDK } = await import("@qvac/sdk/expo-plugin");
  return withQvacSDK(config);
};
