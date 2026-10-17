package expo.modules.paymentdetector

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Detected payments wait here until the JS side picks them up, so nothing is lost
 * when a payment happens while the app is closed.
 */
internal data class RecentPayment(
  val id: String,
  val packageName: String,
  val source: String,
  val amountPaise: Long,
  val type: String,
  val merchant: String?,
  val postedAt: Long
)

internal object PaymentStore {
  private const val PREFS = "spendnote_payment_detector"
  private const val KEY_QUEUE = "queue"
  private const val KEY_RECENT = "recent"
  private const val KEY_ACTIVITY = "activity"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_MIN_AMOUNT = "min_amount_paise"
  private const val KEY_CONNECTED_AT = "connected_at"
  private const val KEY_DISCONNECTED_AT = "disconnected_at"
  private const val KEY_OWNER_NAME = "owner_name"
  private const val MAX_QUEUE = 200
  private const val MAX_RECENT = 50
  private const val MAX_ACTIVITY = 40
  /** One payment usually shows up as a UPI app notification and a bank SMS within a minute or two. */
  private const val DUPLICATE_WINDOW_MS = 3 * 60_000L
  /** Money leaving one account and arriving in another usually lands within a few minutes. */
  private const val TRANSFER_PAIR_WINDOW_MS = 10 * 60_000L

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, true)

  fun minAmountPaise(context: Context): Long = prefs(context).getLong(KEY_MIN_AMOUNT, 5000L)

  fun configure(context: Context, enabled: Boolean, minAmountPaise: Long) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).putLong(KEY_MIN_AMOUNT, minAmountPaise).apply()
  }

  fun markConnected(context: Context, connected: Boolean) {
    val key = if (connected) KEY_CONNECTED_AT else KEY_DISCONNECTED_AT
    prefs(context).edit().putLong(key, System.currentTimeMillis()).apply()
  }

  fun diagnostics(context: Context): Map<String, Any?> {
    val p = prefs(context)
    return mapOf(
      "enabled" to isEnabled(context),
      "minAmountPaise" to minAmountPaise(context).toDouble(),
      "connectedAt" to p.getLong(KEY_CONNECTED_AT, 0L).toDouble(),
      "disconnectedAt" to p.getLong(KEY_DISCONNECTED_AT, 0L).toDouble(),
      "pendingCount" to readArray(context, KEY_QUEUE).length().toDouble()
    )
  }

  @Synchronized
  fun enqueue(context: Context, event: JSONObject) {
    val queue = readArray(context, KEY_QUEUE)
    queue.put(event)
    write(context, KEY_QUEUE, queue.takeLast(MAX_QUEUE))
  }

  @Synchronized
  fun pending(context: Context): List<Map<String, Any?>> {
    val queue = readArray(context, KEY_QUEUE)
    return (0 until queue.length()).mapNotNull { queue.optJSONObject(it)?.toMap() }
  }

  @Synchronized
  fun remove(context: Context, ids: Set<String>) {
    val queue = readArray(context, KEY_QUEUE)
    val kept = JSONArray()
    for (i in 0 until queue.length()) {
      val event = queue.optJSONObject(i) ?: continue
      if (event.optString("id") !in ids) kept.put(event)
    }
    write(context, KEY_QUEUE, kept)
  }

  fun ownerName(context: Context): String = prefs(context).getString(KEY_OWNER_NAME, "") ?: ""

  fun setOwnerName(context: Context, name: String) {
    prefs(context).edit().putString(KEY_OWNER_NAME, name).apply()
  }

  /**
   * True when this payment was already captured: the same app re-posting the same notification, or
   * another app (bank SMS vs UPI app) reporting the same amount and direction moments apart.
   */
  @Synchronized
  fun isDuplicate(context: Context, payment: RecentPayment): Boolean {
    val recent = readArray(context, KEY_RECENT)
    for (i in 0 until recent.length()) {
      val seen = recent.optJSONObject(i) ?: continue
      if (seen.optLong("amount") != payment.amountPaise || seen.optString("type") != payment.type) continue
      if (Math.abs(seen.optLong("at") - payment.postedAt) > DUPLICATE_WINDOW_MS) continue
      val samePackage = seen.optString("pkg") == payment.packageName
      val sameMerchant = seen.optString("merchant", "") == (payment.merchant ?: "")
      if (!samePackage || sameMerchant) return true
    }
    return false
  }

  @Synchronized
  fun remember(context: Context, payment: RecentPayment) {
    val recent = readArray(context, KEY_RECENT)
    recent.put(
      JSONObject()
        .put("id", payment.id)
        .put("pkg", payment.packageName)
        .put("source", payment.source)
        .put("amount", payment.amountPaise)
        .put("type", payment.type)
        .put("merchant", payment.merchant ?: "")
        .put("at", payment.postedAt)
    )
    write(context, KEY_RECENT, recent.takeLast(MAX_RECENT))
  }

  /**
   * Id of an earlier payment that looks like the other side of a transfer between the user's own
   * accounts: same amount, opposite direction, different account, a few minutes apart.
   */
  @Synchronized
  fun findCounterpart(context: Context, payment: RecentPayment): String? {
    val recent = readArray(context, KEY_RECENT)
    for (i in recent.length() - 1 downTo 0) {
      val seen = recent.optJSONObject(i) ?: continue
      if (seen.optLong("amount") != payment.amountPaise || seen.optString("type") == payment.type) continue
      if (seen.optString("source") == payment.source) continue
      if (Math.abs(seen.optLong("at") - payment.postedAt) > TRANSFER_PAIR_WINDOW_MS) continue
      return seen.optString("id").takeIf { it.isNotEmpty() }
    }
    return null
  }

  /** Flags a payment that hasn't been sent to the server yet as a transfer. */
  @Synchronized
  fun markQueuedAsTransfer(context: Context, id: String) {
    val queue = readArray(context, KEY_QUEUE)
    for (i in 0 until queue.length()) {
      val event = queue.optJSONObject(i) ?: continue
      if (event.optString("id") == id) event.put("isTransfer", true)
    }
    write(context, KEY_QUEUE, queue)
  }

  /** A short on-device history of what the listener saw, shown on the Detection activity screen. */
  @Synchronized
  fun log(context: Context, entry: JSONObject) {
    val activity = readArray(context, KEY_ACTIVITY)
    activity.put(entry.put("at", System.currentTimeMillis()))
    write(context, KEY_ACTIVITY, activity.takeLast(MAX_ACTIVITY))
  }

  @Synchronized
  fun activity(context: Context): List<Map<String, Any?>> {
    val activity = readArray(context, KEY_ACTIVITY)
    return (activity.length() - 1 downTo 0).mapNotNull { activity.optJSONObject(it)?.toMap() }
  }

  @Synchronized
  fun clearActivity(context: Context) {
    prefs(context).edit().remove(KEY_ACTIVITY).apply()
  }

  private fun write(context: Context, key: String, array: JSONArray) {
    prefs(context).edit().putString(key, array.toString()).apply()
  }

  private fun readArray(context: Context, key: String): JSONArray =
    try {
      JSONArray(prefs(context).getString(key, "[]") ?: "[]")
    } catch (e: Exception) {
      JSONArray()
    }

  private fun JSONArray.takeLast(max: Int): JSONArray {
    val trimmed = JSONArray()
    for (i in maxOf(0, length() - max) until length()) trimmed.put(get(i))
    return trimmed
  }
}

internal fun JSONObject.toMap(): Map<String, Any?> {
  val map = mutableMapOf<String, Any?>()
  val names = keys()
  while (names.hasNext()) {
    val key = names.next()
    map[key] = when (val value = opt(key)) {
      JSONObject.NULL -> null
      is Int -> value.toDouble()
      is Long -> value.toDouble()
      else -> value
    }
  }
  return map
}
