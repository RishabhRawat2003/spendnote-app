package expo.modules.paymentdetector

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Detected payments wait here until the JS side picks them up, so nothing is lost
 * when a payment happens while the app is closed.
 */
internal object PaymentStore {
  private const val PREFS = "spendnote_payment_detector"
  private const val KEY_QUEUE = "queue"
  private const val KEY_SEEN = "seen"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_MIN_AMOUNT = "min_amount_paise"
  private const val MAX_QUEUE = 200
  private const val MAX_SEEN = 100

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, true)

  fun minAmountPaise(context: Context): Long = prefs(context).getLong(KEY_MIN_AMOUNT, 5000L)

  fun configure(context: Context, enabled: Boolean, minAmountPaise: Long) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).putLong(KEY_MIN_AMOUNT, minAmountPaise).apply()
  }

  @Synchronized
  fun enqueue(context: Context, event: JSONObject) {
    val queue = readArray(context, KEY_QUEUE)
    queue.put(event)
    val trimmed = JSONArray()
    val start = maxOf(0, queue.length() - MAX_QUEUE)
    for (i in start until queue.length()) trimmed.put(queue.get(i))
    prefs(context).edit().putString(KEY_QUEUE, trimmed.toString()).apply()
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
    prefs(context).edit().putString(KEY_QUEUE, kept.toString()).apply()
  }

  /** Returns false if this fingerprint was already recorded (apps often re-post the same notification). */
  @Synchronized
  fun markSeen(context: Context, fingerprint: String): Boolean {
    val seen = readArray(context, KEY_SEEN)
    for (i in 0 until seen.length()) {
      if (seen.optString(i) == fingerprint) return false
    }
    seen.put(fingerprint)
    val trimmed = JSONArray()
    val start = maxOf(0, seen.length() - MAX_SEEN)
    for (i in start until seen.length()) trimmed.put(seen.get(i))
    prefs(context).edit().putString(KEY_SEEN, trimmed.toString()).apply()
    return true
  }

  private fun readArray(context: Context, key: String): JSONArray =
    try {
      JSONArray(prefs(context).getString(key, "[]") ?: "[]")
    } catch (e: Exception) {
      JSONArray()
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
