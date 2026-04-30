function normalizePropertyName(value) {
  if (!value || !value.trim()) {
    return "unknown";
  }

  return value.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

async function getPropertyIdByName(propertyName, db) {
  if (!propertyName) {
    console.warn("No propertyName provided");
    return null;
  }

  try {
    const propertyQuery = await db
      .collection("restackPreLaunchProperties")
      .where("projectName", "==", propertyName)
      .limit(1)
      .get();

    if (propertyQuery.empty) {
      console.warn(`Property not found with name: ${propertyName}`);
      return null;
    }

    const propertyDoc = propertyQuery.docs[0];
    const propertyId = propertyDoc.id;
    console.log(
      `Found propertyId: ${propertyId} for propertyName: ${propertyName}`
    );
    return propertyId;
  } catch (error) {
    console.error(`Error fetching propertyId for ${propertyName}:`, error);
    return null;
  }
}

export { normalizePropertyName, getPropertyIdByName };
