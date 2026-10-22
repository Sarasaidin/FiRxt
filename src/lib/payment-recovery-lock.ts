
/**
 * In-process lock for duplicate recovery work.
 *
 * This prevents overlapping recovery calls within one Node.js process.
 * It is not a distributed lock and does not replace Stripe idempotency.
 */
const activeRecoveries = new Set<string>();

export async function withPaymentRecoveryLock<T>(
  sessionId: string,
  operation: () => Promise<T>
): Promise<{ acquired: true; result: T } | { acquired: false }> {
  if (activeRecoveries.has(sessionId)) {
    return { acquired: false };
  }

  activeRecoveries.add(sessionId);

  try {
    const result = await operation();
    return { acquired: true, result };
  } finally {
    activeRecoveries.delete(sessionId);
  }
}
