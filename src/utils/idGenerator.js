async function getNextId(counterDocPath, prefix, db, paddingLength = 3) {
  const counterRef = db.doc(counterDocPath);

  return await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentCount = 0;

    if (counterDoc.exists) {
      currentCount = counterDoc.data().count || 0;
    }

    const newCount = currentCount + 1;
    const newId = `${prefix}${newCount
      .toString()
      .padStart(paddingLength, "0")}`;

    transaction.set(counterRef, { count: newCount }, { merge: true });

    return newId;
  });
}

export { getNextId };
